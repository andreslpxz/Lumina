export const gitSkillTools = [
  {
    type: "function",
    function: {
      name: "git_commit",
      description: "Commit changes to the local git repository.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The commit message."
          }
        },
        required: ["message"]
      }
    }
  }
];
