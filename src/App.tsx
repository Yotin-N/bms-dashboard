import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./components/Dashboard";
import { EquipmentPage } from "./pages/EquipmentPage";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { TrendPage } from "./pages/TrendPage";

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/equipment/:indexCode" element={<AssetDetailPage />} />
        <Route path="/trend/:displayName" element={<TrendPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
