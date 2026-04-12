export type ToolCall = {
  name: string;
  arguments: any;
};

export type AgentAction = {
  thought: string;
  message?: string;
  tool_calls: ToolCall[];
};

export type Skill = {
  name: string;
  description: string;
  tools: any[]; // JSON schema for tools
};

export type ExecutionResult = {
  stdout?: string;
  stderr?: string;
  error?: string;
  data?: any;
};
