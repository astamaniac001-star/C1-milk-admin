// src/App.jsx
import { Toast } from "./components/ui.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { AppPage } from "./components/AppPage.jsx";
import { AppModals } from "./components/AppModals.jsx";
import { Login } from "./components/login.jsx";
import { useAppState } from "./hooks/useAppState.js";
import { useAppHandlers } from "./hooks/useAppHandlers.js";
import { useAuth } from "./hooks/useAuth.js";

export default function App() {
  // 1. ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE VERY TOP
  const auth = useAuth();
  const state = useAppState();
  const handlers = useAppHandlers(state); // <--- MUST BE HERE

  // 2. NOW we can do conditional returns
  if (!auth.isAuthenticated) {
    return (
      <Login onLogin={auth.login} loading={auth.loading} error={auth.error} />
    );
  }

  const footer = (
    <>
      {state.toast && (
        <Toast
          msg={state.toast.msg}
          type={state.toast.type}
          onClose={() => state.setToast(null)}
          key={state.toast.id}
        />
      )}
    </>
  );

  return (
    <AppShell
      tab={state.tab}
      today={state.today}
      onTabChange={state.setTab}
      onLogout={auth.logout}
      loadErrors={state.loadErrors}
      onRefresh={state.refresh}
      footer={footer}
    >
      <AppPage tab={state.tab} state={state} handlers={handlers} />
      <AppModals state={state} handlers={handlers} />
    </AppShell>
  );
}
