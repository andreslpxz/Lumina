import Groq from "groq-sdk";

// Cambiamos el nombre a 'groq' para que coincida con los imports
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Mantén esta función si quieres, pero lo vital es exportar la constante 'groq'
export const generateAgentResponse = async (messages: any[]) => {
  return await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", 
    messages: messages,
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 4096,
    stream: true,
  });
};
