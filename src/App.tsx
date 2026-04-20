import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Dashboard } from "./components/Dashboard";
import { EquipmentPage } from "./pages/EquipmentPage";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { TrendPage } from "./pages/TrendPage";
import { LoginPage } from "./pages/LoginPage";
import { SetPasswordPage } from "./pages/SetPasswordPage";
import { SettingsPage } from "./pages/SettingsPage";
import { BmsImportPage } from "./pages/BmsImportPage";
import { MappingDashboardPage } from "./pages/MappingDashboardPage";

function ProtectedShell() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route element={<ProtectedShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/equipment/:indexCode" element={<AssetDetailPage />} />
        <Route path="/trend/:displayName" element={<TrendPage />} />
        <Route
          path="/bms-import"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <BmsImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mapping-dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MappingDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
