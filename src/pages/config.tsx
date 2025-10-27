import { FormEvent, useEffect, useState } from "react";

import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { loadConfig, saveConfig } from "@/lib/api";
import type { ConfigFileResponse, ProviderDefinition, ToolDefinition } from "@/types";

export default function ConfigPage() {
  const [model, setModel] = useState("");
  const [defaultProvider, setDefaultProvider] = useState("");
  const [providers, setProviders] = useState<ProviderDefinition[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [rawPreview, setRawPreview] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfig = async () => {
    setIsLoading(true);
    setStatus("Memuat konfigurasi...");
    try {
      const data = await loadConfig();
      applyConfig(data);
      setStatus("Konfigurasi berhasil dimuat.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Gagal memuat konfigurasi: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const applyConfig = (config: ConfigFileResponse) => {
    setModel(config.model ?? "");
    setDefaultProvider(config.default_provider ?? "");
    setProviders(config.providers ?? []);
    setSystemPrompt(config.system_prompt ?? "");
    setPromptTemplate(config.prompt_template ?? "");
    setTools(config.tools ?? []);
    setRawPreview(config.raw ?? "");
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!providers.length) {
      if (defaultProvider !== "") {
        setDefaultProvider("");
      }
      return;
    }
    if (!providers.some((provider) => provider.id === defaultProvider)) {
      setDefaultProvider(providers[0].id);
    }
  }, [providers, defaultProvider]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!model.trim()) {
      setStatus("Model tidak boleh kosong.");
      return;
    }
    if (!promptTemplate.trim()) {
      setStatus("Prompt template tidak boleh kosong.");
      return;
    }
    const resolvedProvider =
      defaultProvider || providers[0]?.id || "";
    if (!resolvedProvider) {
      setStatus("Minimal satu provider harus tersedia sebagai default.");
      return;
    }

    setIsSaving(true);
    setStatus("Menyimpan konfigurasi...");
    try {
      const payload = {
        model: model.trim(),
        default_provider: resolvedProvider,
        system_prompt: systemPrompt.trim() ? systemPrompt : null,
        prompt_template: promptTemplate,
      };
      const data = await saveConfig(payload);
      applyConfig(data);
      setStatus("Konfigurasi berhasil diperbarui.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Gagal menyimpan konfigurasi: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Konfigurasi client.toml</h1>
        <p className="mt-1 text-sm text-slate-600">
          Atur model, system prompt, serta template prompt dari antarmuka ini.
        </p>
      </header>

      <form
        className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Default Provider</span>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            value={defaultProvider}
            onChange={(event) => setDefaultProvider(event.target.value)}
            disabled={isLoading || providers.length === 0}
          >
            {providers.length === 0 ? (
              <option value="">Belum ada provider terkonfigurasi</option>
            ) : (
              providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.id} ({provider.kind})
                </option>
              ))
            )}
          </select>
          <span className="text-xs text-slate-500">
            Dipakai sebagai default saat model tidak ditentukan.
          </span>
        </label>
        <Input
          isDisabled={isLoading}
          label="Model"
          labelPlacement="outside"
          placeholder="contoh: gemma3:4b"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        />

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="font-medium text-slate-800">System Prompt (opsional)</span>
          <textarea
            className="min-h-[120px] rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Instruksi tambahan untuk LLM..."
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            disabled={isLoading}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Prompt Template</span>
          <textarea
            className="min-h-[240px] rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Template prompt utama..."
            value={promptTemplate}
            onChange={(event) => setPromptTemplate(event.target.value)}
            disabled={isLoading}
            required
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button color="primary" isLoading={isSaving} type="submit">
            Simpan Perubahan
          </Button>
          <Button
            variant="flat"
            isDisabled={isLoading || isSaving}
            onPress={fetchConfig}
            type="button"
          >
            Muat Ulang
          </Button>
          {status && <span className="text-xs text-slate-500">{status}</span>}
        </div>
      </form>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">
            Provider &amp; Tools dari Konfigurasi
          </h2>
          <div className="mt-3 space-y-4 text-sm text-slate-600">
            <section>
              <h3 className="text-sm font-semibold text-slate-800">Providers</h3>
              {providers.length === 0 ? (
                <p>Belum ada provider yang terdaftar.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {providers.map((provider) => (
                    <li key={provider.id} className="rounded-lg bg-slate-100 px-3 py-2">
                      <p className="font-medium text-slate-800">
                        {provider.id}{" "}
                        <span className="text-xs text-slate-500">({provider.kind})</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {provider.models.length > 0
                          ? `Model: ${provider.models
                              .map((model) => model.display_name ?? model.name)
                              .join(", ")}`
                          : "Belum ada model untuk provider ini."}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="text-sm font-semibold text-slate-800">Tools</h3>
              {tools.length === 0 ? (
                <p>Tidak ada tool yang terkonfigurasi.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {tools.map((tool) => (
                    <li key={tool.name} className="rounded-lg bg-slate-100 px-3 py-2">
                      <p className="font-medium text-slate-800">{tool.name}</p>
                      <p className="text-xs text-slate-600">
                        {tool.description ?? "Tidak ada deskripsi."}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800">Pratinjau client.toml</h2>
          <pre className="mt-3 max-h-[360px] overflow-auto rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-800 border border-slate-200 shadow-inner">
            {rawPreview || "(Konfigurasi kosong)"}
          </pre>
        </div>
      </section>
    </div>
  );
}
