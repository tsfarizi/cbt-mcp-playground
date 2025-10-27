import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import { Provider } from "./provider.tsx";
import { SessionProvider } from "./context/session-context.tsx";
import "@/styles/globals.css";

const basename = (() => {
  const base = import.meta.env.BASE_URL ?? "/";
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.length ? trimmed : "/";
})();

if (typeof document !== "undefined") {
  const htmlElement = document.documentElement;
  htmlElement.classList.remove("dark");
  htmlElement.dataset.theme = "light";
  if (document.body) {
    document.body.classList.remove("dark");
  }
}
if (typeof localStorage !== "undefined") {
  localStorage.setItem("heroui-theme", "light");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <Provider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
);
