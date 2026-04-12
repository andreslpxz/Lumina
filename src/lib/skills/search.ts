export const webSearchSkillTools = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for current information, documentation, or solutions.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query."
          }
        },
        required: ["query"]
      }
    }
  }
];
