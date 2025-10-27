import { useEffect, useMemo, useState } from "react";

import { Button } from "@heroui/button";
import { useNavigate } from "react-router-dom";

import { useSessions } from "@/context/session-context";
import type { Session, SessionMessage, SessionToolLog } from "@/types";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SessionsPage() {
  const { sessions, selectSession } = useSessions();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const orderedSessions = useMemo(
    () =>
      sessions
        .slice()
        .sort((a: Session, b: Session) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [sessions],
  );

  useEffect(() => {
    if (!selectedId && orderedSessions.length > 0) {
      setSelectedId(orderedSessions[0].id);
    } else if (
      selectedId &&
      !sessions.find((session: Session) => session.id === selectedId)
    ) {
      setSelectedId(orderedSessions[0]?.id ?? null);
    }
  }, [orderedSessions, selectedId, sessions]);

  const selectedSession =
    orderedSessions.find((session: Session) => session.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-slate-900">Monitoring Sesi</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tinjau seluruh percakapan aktif beserta riwayat tool yang sudah dipanggil.
          </p>
        </header>
        <div className="space-y-3">
          {orderedSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Belum ada sesi tersimpan. Mulai percakapan di halaman Playground untuk membuat sesi baru.
            </div>
          ) : (
            orderedSessions.map((session: Session) => {
              const isActive = session.id === selectedId;
              return (
                <article
                  key={session.id}
                  className={`rounded-2xl border p-4 shadow-sm transition ${
                    isActive ? "border-primary bg-primary/5" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{session.name}</h2>
                      <p className="text-xs text-slate-500">
                        Terakhir diperbarui {formatDateTime(session.updatedAt)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {session.messages.length} pesan • {session.tools.length} log tool
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        radius="sm"
                        size="sm"
                        variant={isActive ? "solid" : "flat"}
                        color={isActive ? "primary" : "default"}
                        onPress={() => setSelectedId(session.id)}
                      >
                        Lihat Detail
                      </Button>
                      <Button
                        radius="sm"
                        size="sm"
                        variant="bordered"
                        onPress={() => {
                          selectSession(session.id);
                          navigate("/");
                        }}
                      >
                        Buka di Playground
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {selectedSession ? (
          <div className="space-y-6">
            <header className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">{selectedSession.name}</h2>
              <p className="text-sm text-slate-500">
                Dibuat {formatDateTime(selectedSession.createdAt)} • Terakhir diperbarui {" "}
                {formatDateTime(selectedSession.updatedAt)}
              </p>
            </header>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Riwayat Percakapan</h3>
                <div className="mt-2 max-h-[280px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  {selectedSession.messages.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada pesan pada sesi ini.</p>
                  ) : (
                    selectedSession.messages.map((message: SessionMessage) => (
                      <div key={message.id} className="rounded-lg bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {message.role === "user"
                              ? "Warga"
                              : message.role === "assistant"
                                ? "Petugas"
                                : "Sistem"}
                          </span>
                          <span>{new Date(message.timestamp).toLocaleTimeString("id-ID")}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{message.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800">Riwayat Tool</h3>
                <div className="mt-2 max-h-[240px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  {selectedSession.tools.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada tool yang digunakan pada sesi ini.</p>
                  ) : (
                    selectedSession.tools.map((log: SessionToolLog) => (
                      <div
                        key={log.id}
                        className={`rounded-lg p-3 text-sm shadow-sm ${
                          log.success ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                          <span className="font-semibold">{log.tool}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString("id-ID")}</span>
                        </div>
                        {log.message && <p className="mt-2 text-xs">{log.message}</p>}
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer font-medium">Detail</summary>
                          <div className="mt-2 space-y-2">
                            <div>
                              <p className="font-semibold">Input</p>
                              <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-800 border border-slate-200">
                                {JSON.stringify(log.input, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="font-semibold">Output</p>
                              <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-800 border border-slate-200">
                                {JSON.stringify(log.output, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </details>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Pilih sesi untuk melihat detailnya.
          </div>
        )}
      </section>
    </div>
  );
}
