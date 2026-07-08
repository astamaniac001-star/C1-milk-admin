import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { AppPage } from "./components/AppPage.jsx";
import { AppModals } from "./components/AppModals.jsx";
import  Login  from "./components/login.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useAppState } from "./hooks/useAppState.js";
import { useAppHandlers } from "./hooks/useAppHandlers.js";
import { useAppDerived } from "./hooks/useAppDerived.js";
import { Toast } from "./components/ui.jsx";

export default function App() {
  const auth = useAuth();

  const state = useAppState(auth);
  const handlers = useAppHandlers(state);
  const derived = useAppDerived(state);

  const ctx = { ...state, ...handlers, ...derived, auth };
  
  if (!auth.isAuthenticated) {
    return <Login onLogin={auth.login} error={auth.error} loading={auth.loading} />;
  }

  return (
    <ErrorBoundary>
      <AppShell 
        tab={state.tab} 
        today={derived.today} 
        onTabChange={state.setTab} 
        onLogout={auth.logout}
        loadErrors={state.loadErrors}
        onRefresh={state.refresh}
      >
        <AppPage ctx={ctx} />
        <AppModals ctx={ctx} />
      </AppShell>
      {state.toast && <Toast msg={state.toast.msg} type={state.toast.type} onClose={() => state.setToast(null)} />}
    </ErrorBoundary>
  );
}