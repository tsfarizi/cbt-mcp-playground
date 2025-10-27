import type {
  AgentToolStep,
  ChatResponse,
  ConfigFileResponse,
  ToolDefinition,
  UpdateConfigPayload,
} from "@/types";

function resolveBaseUrl(): string {
  const explicit = import.meta.env.VITE_MCP_BASE_URL;
  if (typeof explicit === "string") {
    const trimmed = explicit.trim();
    if (trimmed.length > 0) {
      return trimmed.replace(/\/$/, "");
    }
  }
  if (import.meta.env.PROD && typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    console.warn("VITE_MCP_BASE_URL belum dikonfigurasi di berkas .env");
  }
  return "";
}

const BASE_URL = resolveBaseUrl();

function createRequestUrl(path: string): string {
  if (!BASE_URL) {
    throw new Error("Konfigurasi API tidak ditemukan. Set VITE_MCP_BASE_URL pada file .env Anda.");
  }
  return `${BASE_URL}${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(createRequestUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  }).catch((error) => {
    throw new Error(error?.message ?? "Gagal terhubung ke server");
  });

  const contentType = response.headers.get("content-type");
  const parseBody = async () => {
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as Record<string, unknown>;
    }
    return undefined;
  };

  if (!response.ok) {
    const body = await parseBody();
    const message = typeof body?.error === "string" ? body.error : response.statusText;
    throw new Error(message || "Permintaan gagal");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  throw new Error("Format respons tidak didukung");
}

export async function fetchTools(): Promise<ToolDefinition[]> {
  const data = await request<{ tools: ToolDefinition[] }>("/tools");
  return data.tools ?? [];
}

export async function sendChat(payload: {
  prompt: string;
  sessionId: string;
  agent?: boolean;
  maxToolSteps?: number;
  providerId?: string;
  model?: string;
}): Promise<ChatResponse> {
  const body = {
    prompt: payload.prompt,
    session_id: payload.sessionId,
    agent: payload.agent ?? true,
    max_tool_steps: payload.maxToolSteps,
    provider: payload.providerId,
    model: payload.model,
  };
  return request<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function loadConfig(): Promise<ConfigFileResponse> {
  return request<ConfigFileResponse>("/config-file");
}

export async function saveConfig(payload: UpdateConfigPayload): Promise<ConfigFileResponse> {
  return request<ConfigFileResponse>("/config-file", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function toToolLogs(steps: AgentToolStep[]) {
  const now = new Date();
  return steps.map((step) => ({
    id: `${step.tool}-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    tool: step.tool,
    success: step.success,
    message: step.message,
    input: step.input,
    output: step.output,
    timestamp: now.toISOString(),
  }));
}
