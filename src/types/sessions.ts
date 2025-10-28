export type MessageRole = "system" | "user" | "assistant";

export type SessionMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  attachments?: MessageAttachment[];
};

export type SessionToolLog = {
  id: string;
  tool: string;
  success: boolean;
  message?: string | null;
  input: unknown;
  output: unknown;
  timestamp: string;
};

export type SessionLogEntry = {
  id: string;
  message: string;
  timestamp: string;
};

export type Session = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: SessionMessage[];
  tools: SessionToolLog[];
  logs: SessionLogEntry[];
};

export type MessageAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
};


