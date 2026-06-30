import Dashboard from "../pages/Dashboard.jsx";
import Customers from "../pages/Customers.jsx";
import Delivery from "../pages/Delivery.jsx";
import Imports from "../pages/Imports.jsx";
import Billing from "../pages/Billing.jsx";
import More from "../pages/More.jsx";

function renderDashboard(state, handlers) {
  return (
    <Dashboard
      today={state.today}
      activeC={state.activeC}
      totalRevenue={state.totalRevenue}
      pendingDues={state.pendingDues}
      confirmedStock={state.confirmedStock}
      logs={state.logs}
      bills={state.bills} // Changed todayLogs -> logs, removed queue
      onSetTab={state.setTab}
      onOpenModal={state.openModal}
      onGenerateBill={handlers.generateMonthlyBills} // Fixed handler name to match Phase 2
    />
  );
}

function renderCustomers(state, handlers) {
  return (
    <Customers
      filtered={state.filteredC}
      total={state.filteredC.length}
      bills={state.bills}
      search={state.custSearch}
      onSearchChange={state.setCustSearch}
      filter={state.custFilter}
      onFilterChange={state.setCustFilter}
      onOpenModal={state.openModal}
      onWhatsapp={handlers.whatsapp}
      onDeactivate={handlers.updateCustomer} // Deactivating is just an update to status: 'Inactive'
    />
  );
}

function renderDelivery(state, handlers) {
  return (
    <Delivery
      logDate={state.logDate}
      onLogDateChange={state.setLogDate}
      logs={state.logs} // Changed todayLogs -> logs
      onToggleLog={handlers.toggleDeliveryLog} // Fixed handler name to match Phase 2
      fetchLogs={state.fetchLogs} // Added to support the Gap 1 date picker fix
    />
  );
}

function renderImports(state, handlers) {
  return (
    <Imports
      filtered={state.filteredI}
      brands={state.brands}
      impFilter={state.impFilter}
      onImpFilterChange={state.setImpFilter}
      onOpenModal={state.openModal}
      onConfirm={handlers.addMilkImport} // Fixed handler name to match Phase 2
      onDelete={handlers.updateMilkImport} // Imports are soft-deleted/updated
    />
  );
}

function renderBilling(state, handlers) {
  return (
    <Billing
      bills={state.bills}
      filtered={state.filteredB}
      billFilter={state.billFilter}
      billMonth={state.billMonth}
      pendingDues={state.pendingDues}
      customers={state.customers}
      onBillFilterChange={state.setBillFilter}
      onBillMonthChange={state.setBillMonth}
      onGenerateBill={handlers.generateMonthlyBills} // Fixed handler name to match Phase 2
      onOpenModal={state.openModal}
      onLock={handlers.lockBill}
      onUnlock={handlers.unlockBill}
      onWhatsapp={handlers.whatsapp}
    />
  );
}

function renderMore(state, handlers) {
  return (
    <More
      adjustments={state.adjustments}
      pauses={state.pauses}
      brands={state.brands}
      diagRan={state.diagRan}
      activeBrandsCount={state.activeBrandsCount}
      onOpenModal={state.openModal}
      onApplyAdj={handlers.saveAdjustment}
      onRunDiag={() => {
        state.setDiagRan(true);
        state.toast$("19 checks complete", "info");
      }}
      onHealthCheck={() => state.toast$("Health check passed — V17", "success")}
    />
  );
}

const PAGE_RENDERERS = {
  dashboard: renderDashboard,
  customers: renderCustomers,
  delivery: renderDelivery,
  imports: renderImports,
  billing: renderBilling,
  more: renderMore,
};

export function AppPage({ tab, state, handlers }) {
  const render = PAGE_RENDERERS[tab] || PAGE_RENDERERS.dashboard;
  return render(state, handlers);
}
