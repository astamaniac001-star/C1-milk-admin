// ── App.jsx ───────────────────────────────────────────────────────────────────
// Thin orchestrator: state hook + handlers hook + layout shell.

import { Toast } from "./components/ui.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { AppPage } from "./components/AppPage.jsx";
import { AppModals } from "./components/AppModals.jsx";
import { useAppState } from "./hooks/useAppState.js";
import { useAppHandlers } from "./hooks/useAppHandlers.js";

export default function App() {
  const state = useAppState();

  const handlers = useAppHandlers({
    customers: state.customers, setCustomers: state.setCustomers,
    imports: state.imports, setImports: state.setImports,
    bills: state.bills, setBills: state.setBills,
    logs: state.logs, setLogs: state.setLogs,
    adjustments: state.adjustments, setAdjustments: state.setAdjustments,
    pauses: state.pauses, setPauses: state.setPauses,
    brands: state.brands, setBrands: state.setBrands,
    queue: state.queue, setQueue: state.setQueue,
    form: state.form, modal: state.modal,
    today: state.today, billMonth: state.billMonth,
    toast$: state.toast$, closeModal: state.closeModal, activeC: state.activeC,
  });

  const footer = (
    <>
      <AppModals
        modal={state.modal} form={state.form} setF={state.setF} closeModal={state.closeModal}
        handlers={handlers} today={state.today} brands={state.brands} customers={state.customers}
      />
      {state.toast && (
        <Toast msg={state.toast.msg} type={state.toast.type} onClose={() => state.setToast(null)} key={state.toast.id} />
      )}
    </>
  );

  return (
    <AppShell tab={state.tab} today={state.today} queue={state.queue} onTabChange={state.setTab} footer={footer}>
      <AppPage tab={state.tab} state={state} handlers={handlers} />
    </AppShell>
  );
}
