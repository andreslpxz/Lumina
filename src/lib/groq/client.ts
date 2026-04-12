import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const generateAgentResponse = async (messages: any[]) => {
  return await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", // ✅ Modelo válido y activo
    messages: messages,
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 4096,
    stream: true,
  });
};
