import { NextRequest } from "next/server";
import { groq } from "@/lib/groq/client";
import { getSystemPrompt } from "@/lib/groq/prompts";
import { executeToolCall } from "@/lib/e2b/executor";
import { getSkillTools } from "@/lib/skills";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages, activeSkills = [] } = await req.json();

    // Load active skill schemas
    let loadedTools: any[] = [];
    for (const skill of activeSkills) {
      loadedTools = [...loadedTools, ...getSkillTools(skill)];
    }

    const systemPrompt = getSystemPrompt(loadedTools);

    // Prepare conversation history
    const conversation = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const enqueueData = (data: any) => {
           controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const completionStream = await groq.chat.completions.create({
            model: process.env.MODEL_NAME || "llama-3.3-70b-versatile",
            messages: conversation,
            stream: true,
            temperature: 0.2,
            response_format: { type: "json_object" }
          });

          let fullContent = "";

          // 1. Stream the LLM response tokens directly to the client (for the "thinking" feeling)
          for await (const chunk of completionStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              enqueueData({ type: "token", content });
            }
          }

          // 2. Parse the final JSON response
          let parsedResponse;
          try {
             parsedResponse = JSON.parse(fullContent);
          } catch (e) {
             enqueueData({ type: "error", content: "Failed to parse JSON response from LLM." });
             controller.close();
             return;
          }

          enqueueData({ type: "parsed", data: parsedResponse });

          // 3. Execute Tool Calls and Stream Results back
          if (parsedResponse.tool_calls && Array.isArray(parsedResponse.tool_calls)) {
             for (const toolCall of parsedResponse.tool_calls) {
                 enqueueData({ type: "tool_start", toolCall });

                 const result = await executeToolCall(toolCall);

                 enqueueData({ type: "tool_result", toolCall, result });

                 // If a load_skill command was executed successfully, notify the client
                 if (toolCall.name === 'load_skill' && result.success) {
                     enqueueData({ type: "skill_loaded", skill: toolCall.arguments.skill_name });
                 }
             }
          }

          controller.close();
        } catch (error: any) {
          enqueueData({ type: "error", content: error.message });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
