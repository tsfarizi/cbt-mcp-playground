export type ToolDefinition = {
  name: string;
  description?: string | null;
};

export type AgentToolStep = {
  tool: string;
  success: boolean;
  message?: string | null;
  input: unknown;
  output: unknown;
};

export type ChatResponse = {
  session_id: string;
  content: string;
  tool_steps: AgentToolStep[];
  provider?: string;
  model?: string;
  logs: string[];
};

export type ProviderModel = {
  name: string;
  display_name?: string | null;
};

export type ProviderDefinition = {
  id: string;
  kind: string;
  endpoint: string;
  api_key?: string | null;
  models: ProviderModel[];
};

export type ConfigFileResponse = {
  model: string;
  default_provider: string;
  system_prompt: string | null;
  prompt_template: string;
  tools: ToolDefinition[];
  providers: ProviderDefinition[];
  raw: string;
};

export type UpdateConfigPayload = {
  model: string;
  default_provider: string;
  system_prompt: string | null;
  prompt_template: string;
};
