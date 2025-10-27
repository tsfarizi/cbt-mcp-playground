import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { useSessions } from "@/context/session-context";
import { fetchTools, loadConfig, sendChat, toToolLogs } from "@/lib/api";
import type {
  ProviderDefinition,
  Session,
  SessionMessage,
  SessionToolLog,
  SessionLogEntry,
  ToolDefinition,
} from "@/types";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const DEFAULT_MAX_STEPS = 8;

export default function PlaygroundPage() {
  const {
    sessions,
    currentSession,
    currentSessionId,
    createSession,
    selectSession,
    deleteSession,
    resetSessions,
    appendMessage,
    appendToolLogs,
    appendLogs,
  } = useSessions();

  const [prompt, setPrompt] = useState("");
  const [maxSteps, setMaxSteps] = useState<number>(DEFAULT_MAX_STEPS);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [providers, setProviders] = useState<ProviderDefinition[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setIsLoadingTools(true);
      setIsLoadingConfig(true);
      try {
        const [toolList, config] = await Promise.all([fetchTools(), loadConfig()]);
        if (!isMounted) {
          return;
        }
        setTools(toolList);
        const availableProviders = config.providers ?? [];
        setProviders(availableProviders);

        const fallbackProvider =
          config.default_provider || availableProviders[0]?.id || "";
        const initialProvider = availableProviders.some(
          (provider) => provider.id === selectedProvider,
        )
          ? selectedProvider
          : fallbackProvider;
        setSelectedProvider(initialProvider);

        const providerEntry = availableProviders.find(
          (provider) => provider.id === initialProvider,
        );
        const initialModel =
          providerEntry?.models.find((model) => model.name === config.model)?.name ??
          (providerEntry?.models.find((model) => model.name === selectedModel)?.name ??
            providerEntry?.models[0]?.name) ??
          config.model ??
          "";
        setSelectedModel(initialModel);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Gagal memuat konfigurasi awal dan daftar tools";
        setStatus(message);
      } finally {
        if (isMounted) {
          setIsLoadingTools(false);
          setIsLoadingConfig(false);
        }
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usedToolNames = useMemo(() => {
    if (!currentSession) {
      return [] as string[];
    }
    const unique = new Set<string>();
    currentSession.tools.forEach((log: SessionToolLog) => unique.add(log.tool));
    return Array.from(unique.values());
  }, [currentSession]);

  useEffect(() => {
    if (!providers.length) {
      if (selectedProvider !== "") {
        setSelectedProvider("");
      }
      if (selectedModel !== "") {
        setSelectedModel("");
      }
      return;
    }
    const providerEntry = providers.find(
      (provider) => provider.id === selectedProvider,
    );
    if (!providerEntry) {
      const fallbackProvider = providers[0].id;
      if (selectedProvider !== fallbackProvider) {
        setSelectedProvider(fallbackProvider);
      }
      return;
    }
    const hasModel = providerEntry.models.some(
      (model) => model.name === selectedModel,
    );
    if (!hasModel) {
      const fallbackModel = providerEntry.models[0]?.name ?? "";
      if (selectedModel !== fallbackModel) {
        setSelectedModel(fallbackModel);
      }
    }
  }, [providers, selectedProvider, selectedModel]);

  const availableModels = useMemo(() => {
    const providerEntry = providers.find(
      (provider) => provider.id === selectedProvider,
    );
    return providerEntry?.models ?? [];
  }, [providers, selectedProvider]);

  const isInitialLoading = isLoadingTools || isLoadingConfig;
  const isModelSelectable = availableModels.length > 0;

  const createLogEntries = (
    sessionId: string,
    logsData: string[],
  ): SessionLogEntry[] => {
    const baseTime = Date.now();
    return logsData.map((message, index) => ({
      id: `${sessionId}-log-${baseTime + index}-${Math.random()
        .toString(16)
        .slice(2, 8)}`,
      message,
      timestamp: new Date(baseTime + index).toISOString(),
    }));
  };

  const ensureSession = () => {
    if (currentSessionId) {
      return currentSessionId;
    }
    const newId = createSession();
    return newId;
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setStatus("Prompt tidak boleh kosong.");
      return;
    }
    if (!selectedProvider || !selectedModel) {
      setStatus("Silakan pilih provider dan model terlebih dahulu.");
      return;
    }

    const sessionId = ensureSession();
    setStatus(
      `Mengirim permintaan (${selectedProvider} · ${selectedModel})...`,
    );
    setIsSending(true);

    const userMessage: SessionMessage = {
      id: `${sessionId}-user-${Date.now()}`,
      role: "user",
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
    };
    appendMessage(sessionId, userMessage);

    try {
      const response = await sendChat({
        prompt: prompt.trim(),
        sessionId,
        agent: true,
        maxToolSteps: maxSteps,
        providerId: selectedProvider,
        model: selectedModel,
      });

        const assistantMessage: SessionMessage = {
          id: `${response.session_id}-assistant-${Date.now()}`,
          role: "assistant",
          content: response.content ?? "",
          timestamp: new Date().toISOString(),
        };
        appendMessage(response.session_id, assistantMessage);
        appendToolLogs(response.session_id, toToolLogs(response.tool_steps ?? []));
        if (response.logs && response.logs.length > 0) {
          appendLogs(
            response.session_id,
            createLogEntries(response.session_id, response.logs),
          );
        }
        selectSession(response.session_id);
        if (response.provider) {
          setSelectedProvider(response.provider);
        }
      if (response.model) {
        setSelectedModel(response.model);
      }
      const resolvedProvider = response.provider ?? selectedProvider;
      const resolvedModel = response.model ?? selectedModel;
      setStatus(`Jawaban diterima (${resolvedProvider} · ${resolvedModel}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const systemMessage: SessionMessage = {
        id: `${sessionId}-error-${Date.now()}`,
        role: "system",
        content: `Gagal mengirim prompt: ${message}`,
        timestamp: new Date().toISOString(),
      };
      appendMessage(sessionId, systemMessage);
      setStatus(message);
    } finally {
      setPrompt("");
      setIsSending(false);
    }
  };

  const handleNewSession = () => {
    const id = createSession();
    selectSession(id);
    setStatus("Sesi baru siap digunakan.");
  };

  const handleDeleteSession = () => {
    if (!currentSessionId) return;
    if (window.confirm("Hapus sesi ini?")) {
      deleteSession(currentSessionId);
      setStatus("Sesi berhasil dihapus.");
    }
  };

  const handleResetSessions = () => {
    if (window.confirm("Anda yakin ingin mereset seluruh sesi?")) {
      resetSessions();
      setStatus("Seluruh sesi telah direset.");
    }
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSending) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
      <aside className="flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Daftar Sesi</h3>
            <Button color="primary" size="sm" onPress={handleNewSession}>
              Sesi Baru
            </Button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={currentSessionId ?? ""}
              onChange={(event) => selectSession(event.target.value)}
            >
              <option value="" disabled>
                Pilih sesi
              </option>
              {sessions.map((session: Session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full" size="sm" variant="flat" onPress={handleDeleteSession}>
                Hapus
              </Button>
              <Button className="w-full" color="danger" size="sm" variant="flat" onPress={handleResetSessions}>
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800">Tools Tersedia</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {isLoadingTools ? (
              <p>Memuat tools...</p>
            ) : tools.length === 0 ? (
              <p>Tidak ada tool yang terkonfigurasi di server.</p>
            ) : (
              <ul className="space-y-2">
                {tools.map((tool: ToolDefinition) => (
                  <li key={tool.name} className="rounded-lg bg-slate-100 px-3 py-2">
                    <p className="font-medium text-slate-800">{tool.name}</p>
                    <p className="text-xs text-slate-600">
                      {tool.description ?? "Tidak ada deskripsi."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800">Tools Digunakan</h3>
          <div className="mt-3 text-sm text-slate-600">
            {usedToolNames.length === 0 ? (
              <p>Belum ada tool yang dipanggil.</p>
            ) : (
              <ul className="space-y-2">
                {usedToolNames.map((name) => (
                  <li key={name} className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-800">
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      <section className="flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Percakapan</h2>
            <p className="text-sm text-slate-500">
              {currentSession
                ? `${new Date(currentSession.updatedAt).toLocaleString("id-ID")}`
                : "Belum ada sesi"}
            </p>
          </div>
          <div className="mt-4 flex max-h-[500px] flex-col gap-3 overflow-y-auto pr-2">
            {currentSession && currentSession.messages.length > 0 ? (
              currentSession.messages.map((message: SessionMessage) => (
                <article
                  key={message.id}
                  className={`max-w-2xl rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                    message.role === "user"
                      ? "ml-auto border-primary/30 bg-primary/10 text-primary-900"
                      : message.role === "assistant"
                        ? "mr-auto border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "mx-auto border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {message.role === "user"
                      ? "Warga"
                      : message.role === "assistant"
                        ? "Petugas"
                        : "Sistem"}
                    <span className="ml-2 text-[10px] tracking-normal text-slate-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {message.content}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Belum ada percakapan. Mulai dengan memilih atau membuat sesi, lalu kirim prompt pertama Anda.
              </div>
            )}
          </div>
        </div>

        <form
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={handleSend}
        >
          <h3 className="text-base font-semibold text-slate-800">Kirim Prompt</h3>
          <div className="mt-3 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm text-slate-600">
                <span className="font-medium text-slate-800">Provider</span>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  value={selectedProvider}
                  onChange={(event) => setSelectedProvider(event.target.value)}
                  disabled={isInitialLoading || isSending || providers.length === 0}
                >
                  {providers.length === 0 ? (
                    <option value="">Tidak ada provider yang tersedia</option>
                  ) : (
                    providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.id} ({provider.kind})
                      </option>
                    ))
                  )}
                </select>
                <span className="text-xs text-slate-500">
                  Pilih sumber model dari konfigurasi client.toml.
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-slate-600">
                <span className="font-medium text-slate-800">Model</span>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  disabled={isInitialLoading || isSending || !isModelSelectable}
                >
                  {isModelSelectable ? (
                    availableModels.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.display_name ?? model.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Tidak ada model untuk provider ini</option>
                  )}
                </select>
                <span className="text-xs text-slate-500">
                  Model akan digunakan untuk permintaan berikutnya.
                </span>
              </label>
            </div>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="Tulis permintaan dari warga di sini..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              disabled={isSending || isInitialLoading}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Input
                  aria-label="Batas interaksi tool"
                  className="w-32"
                  labelPlacement="outside"
                  size="sm"
                  type="number"
                  value={String(maxSteps)}
                  onChange={(event) => setMaxSteps(Number(event.target.value) || DEFAULT_MAX_STEPS)}
                  isDisabled={isInitialLoading}
                />
                <span className="text-xs text-slate-500">Batas interaksi tool per permintaan</span>
              </div>
              <Button
                color="primary"
                isLoading={isSending}
                isDisabled={
                  isInitialLoading || isSending || !selectedProvider || !selectedModel
                }
                type="submit"
              >
                {isSending ? "Mengirim..." : "Kirim"}
              </Button>
            </div>
            {status && <p className="text-xs text-slate-500">{status}</p>}
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800">Log Tool</h3>
          <div className="mt-3 flex max-h-[260px] flex-col gap-3 overflow-y-auto pr-2">
            {currentSession && currentSession.tools.length > 0 ? (
              currentSession.tools
                .slice()
                .reverse()
                .map((log: SessionToolLog) => (
                  <article
                    key={log.id}
                    className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
                      log.success
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-rose-200 bg-rose-50 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                      <span className="font-semibold">{log.tool}</span>
                      <span className="text-slate-500">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    {log.message && (
                      <p className="mt-2 text-sm leading-relaxed">{log.message}</p>
                    )}
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer font-medium text-slate-600">
                        Detail input/output
                      </summary>
                      <div className="mt-2 space-y-2 text-xs">
                        <div>
                          <p className="font-semibold text-slate-700">Input</p>
                          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-800 border border-slate-200">
                            {JSON.stringify(log.input, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">Output</p>
                          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-800 border border-slate-200">
                            {JSON.stringify(log.output, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </article>
                ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Belum ada aktivitas tool untuk sesi ini.
              </div>
            )}
        </div>
      </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800">Log Interaksi LLM</h3>
          <div className="mt-3 flex max-h-[260px] flex-col gap-3 overflow-y-auto pr-2">
            {currentSession && currentSession.logs.length > 0 ? (
              currentSession.logs
                .slice()
                .reverse()
                .map((log) => (
                  <article
                    key={log.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                      <span className="font-semibold">Log</span>
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-800">
                      {log.message}
                    </p>
                  </article>
                ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Belum ada log interaksi untuk sesi ini.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}


