export const databaseSkillTools = [
  {
    type: "function",
    function: {
      name: "run_sql_query",
      description: "Run a SQL query against the local SQLite database. Use this to create tables, insert data, or select records.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The SQL query to execute."
          }
        },
        required: ["query"]
      }
    }
  }
];
