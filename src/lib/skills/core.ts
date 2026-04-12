export const coreTools = [
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Execute a shell command in the environment. Use this to install dependencies, start servers, or run scripts. Output will be returned as stdout and stderr. Always use non-blocking commands (like appending &) for long-running processes like dev servers.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to run. E.g., 'npm install', 'ls -la', 'npm run dev &'."
          }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file at the specified path. Overwrites existing file content.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path where the file should be written. E.g., 'src/App.tsx'."
          },
          content: {
            type: "string",
            description: "The string content to write into the file."
          }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read content from a file. Large files will be automatically truncated.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path of the file to read."
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "load_skill",
      description: "Load an additional skill into your context. Use this when you need specialized tools. Available skills: 'database_skill' (for SQLite), 'web_search_skill' (for searching docs/web), 'git_skill' (for version control).",
      parameters: {
        type: "object",
        properties: {
          skill_name: {
            type: "string",
            enum: ["database_skill", "web_search_skill", "git_skill"],
            description: "The name of the skill to load."
          }
        },
        required: ["skill_name"]
      }
    }
  }
];
