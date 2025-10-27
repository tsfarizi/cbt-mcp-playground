import { Route, Routes } from "react-router-dom";

import { MainLayout } from "@/layouts/MainLayout";
import PlaygroundPage from "@/pages/playground";
import SessionsPage from "@/pages/sessions";
import ConfigPage from "@/pages/config";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<PlaygroundPage />} />
        <Route element={<SessionsPage />} path="/sessions" />
        <Route element={<ConfigPage />} path="/config" />
      </Route>
    </Routes>
  );
}

export default App;
