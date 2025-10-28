import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Session, SessionLogEntry, SessionMessage, SessionToolLog } from "@/types";

type SessionState = {
  map: Record<string, Session>;
  order: string[];
  currentId: string | null;
};

type SessionContextValue = {
  sessions: Session[];
  sessionMap: Record<string, Session>;
  currentSessionId: string | null;
  currentSession: Session | null;
  createSession: (name?: string) => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  resetSessions: () => void;
  appendMessage: (id: string, message: SessionMessage) => void;
  appendToolLogs: (id: string, logs: SessionToolLog[]) => void;
  appendLogs: (id: string, entries: SessionLogEntry[]) => void;
  renameSession: (id: string, name: string) => void;
};

const STORAGE_KEY = "cbt-mcp-playground.sessions";

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

const emptyState: SessionState = {
  map: {},
  order: [],
  currentId: null,
};

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function loadFromStorage(): SessionState {
  if (typeof window === "undefined") {
    return emptyState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState;
    }
    const parsed = JSON.parse(raw) as SessionState;
    if (!parsed || typeof parsed !== "object") {
      return emptyState;
    }
    const rawMap = parsed.map ?? {};
    const normalisedMap: Record<string, Session> = {};
    for (const [id, entry] of Object.entries(rawMap)) {
      if (!entry) {
        continue;
      }
      const session = entry as Session & {
        logs?: SessionLogEntry[];
      };
      normalisedMap[id] = {
        ...session,
        messages: Array.isArray(session.messages)
          ? session.messages.map((message) => ({
              ...message,
              attachments: Array.isArray(message.attachments)
                ? message.attachments
                : undefined,
            }))
          : [],
        tools: Array.isArray(session.tools) ? session.tools : [],
        logs: Array.isArray(session.logs) ? session.logs ?? [] : [],
      };
    }
    return {
      map: normalisedMap,
      order: Array.isArray(parsed.order) ? parsed.order : [],
      currentId: parsed.currentId ?? null,
    };
  } catch {
    return emptyState;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(() => loadFromStorage());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const createSession = useCallback((name?: string) => {
    const id = generateId("session");
    setState((prev) => {
      const session: Session = {
        id,
        name: name ?? `Sesi ${prev.order.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        tools: [],
        logs: [],
      };
      return {
        map: { ...prev.map, [id]: session },
        order: [...prev.order, id],
        currentId: id,
      };
    });
    return id;
  }, []);

  const selectSession = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.map[id]) {
        return prev;
      }
      return { ...prev, currentId: id };
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.map[id]) {
        return prev;
      }
      const { [id]: _, ...rest } = prev.map;
      const order = prev.order.filter((entry) => entry !== id);
      const currentId =
        prev.currentId === id ? order[0] ?? null : prev.currentId;
      return {
        map: rest,
        order,
        currentId,
      };
    });
  }, []);

  const resetSessions = useCallback(() => {
    setState(emptyState);
  }, []);

  const renameSession = useCallback((id: string, name: string) => {
    setState((prev) => {
      const session = prev.map[id];
      if (!session || session.name === name) {
        return prev;
      }
      return {
        ...prev,
        map: {
          ...prev.map,
          [id]: { ...session, name, updatedAt: new Date().toISOString() },
        },
      };
    });
  }, []);

  const appendMessage = useCallback(
    (id: string, message: SessionMessage) => {
      setState((prev) => {
        const session = prev.map[id];
        if (!session) {
          return prev;
        }
        return {
          ...prev,
          map: {
            ...prev.map,
            [id]: {
              ...session,
              messages: [...session.messages, message],
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [],
  );

  const appendToolLogs = useCallback((id: string, logs: SessionToolLog[]) => {
    if (!logs.length) {
      return;
    }
    setState((prev) => {
      const session = prev.map[id];
      if (!session) {
        return prev;
      }
      return {
        ...prev,
        map: {
          ...prev.map,
          [id]: {
            ...session,
            tools: [...session.tools, ...logs],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const appendLogs = useCallback((id: string, entries: SessionLogEntry[]) => {
    if (!entries.length) {
      return;
    }
    setState((prev) => {
      const session = prev.map[id];
      if (!session) {
        return prev;
      }
      return {
        ...prev,
        map: {
          ...prev.map,
          [id]: {
            ...session,
            logs: [...session.logs, ...entries],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const sessions = useMemo(
    () => state.order.map((id) => state.map[id]).filter(Boolean),
    [state],
  );

  const currentSession = state.currentId ? state.map[state.currentId] : null;

  const value = useMemo<SessionContextValue>(
    () => ({
      sessions,
      sessionMap: state.map,
      currentSessionId: state.currentId,
      currentSession,
      createSession,
      selectSession,
      deleteSession,
      resetSessions,
      appendMessage,
      appendToolLogs,
      appendLogs,
      renameSession,
    }),
    [
      sessions,
      state.map,
      state.currentId,
      currentSession,
      createSession,
      selectSession,
      deleteSession,
      resetSessions,
      appendMessage,
      appendToolLogs,
      appendLogs,
      renameSession,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessions() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessions must be used within a SessionProvider");
  }
  return context;
}

