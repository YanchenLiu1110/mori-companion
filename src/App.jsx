import { Navigate, Route, Routes } from 'react-router-dom';
import { MoriProvider, useMori } from './context/MoriContext.jsx';
import { AppShell } from './components/AppShell.jsx';
import { PaywallModal } from './components/PaywallModal.jsx';
import { ShareModal } from './components/ShareModal.jsx';
import { LevelUpOverlay } from './components/LevelUpOverlay.jsx';
import { ToastHost } from './components/UI.jsx';
import { WelcomePage } from './pages/WelcomePage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { FocusPage } from './pages/FocusPage.jsx';
import { CompanionPage } from './pages/CompanionPage.jsx';
import { ReportPage } from './pages/ReportPage.jsx';

export default function App() {
  return (
    <MoriProvider>
      <MoriApp />
    </MoriProvider>
  );
}

function MoriApp() {
  const { user } = useMori();

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/home" replace /> : <WelcomePage />}
        />
        <Route
          element={user ? <AppShell /> : <Navigate to="/" replace />}
        >
          <Route path="/home" element={<DashboardPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/companion" element={<CompanionPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/home' : '/'} replace />} />
      </Routes>

      <PaywallModal />
      <ShareModal />
      <LevelUpOverlay />
      <ToastHost />
    </>
  );
}
