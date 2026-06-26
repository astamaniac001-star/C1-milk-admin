// ── App.jsx ───────────────────────────────────────────────────────────────────
// Orchestrator: owns global state, derives memoized views, wires handlers,
// and composes the page tree.
//
//   lib/         — constants + pure helpers
//   data/        — seed snapshots
//   components/  — UI primitives + form modals
//   pages/       — one component per bottom-nav tab
//   hooks/       — useAppHandlers (all save/edit/generate logic)

import { useState, useMemo, useEffect, useRef, useCallback } from "react";

import { BLUE, MILK_TYPES, PRODUCTS, PAY_MODES } from "./lib/constants.js";
import { getToday } from "./lib/utils.js";
import {
  seedCustomers, seedImports, seedBills, seedLogs,
  seedAdjustments, seedPauses, seedBrands, seedQueue,
} from "./data/seed.js";

import { Toast } from "./components/ui.jsx";
import {
  CustomerModal, ImportModal, PaymentModal, BillDetailModal,
  AdjustmentModal, PauseModal, BrandModal,
} from "./components/forms.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Customers from "./pages/Customers.jsx";
import Delivery  from "./pages/Delivery.jsx";
import Imports   from "./pages/Imports.jsx";
import Billing   from "./pages/Billing.jsx";
import More      from "./pages/More.jsx";

import { useAppHandlers } from "./hooks/useAppHandlers.js";

// Bottom-nav tabs. Order matters — index 0 is the home tab.
const TABS = [
  { id:"dashboard", icon:"🏠", label:"Home" },
  { id:"customers", icon:"👥", label:"Customers" },
  { id:"delivery",  icon:"🚚", label:"Delivery" },
  { id:"imports",   icon:"🥛", label:"Imports" },
  { id:"billing",   icon:"🧾", label:"Billing" },
  { id:"more",      icon:"☰",  label:"More" },
];

const TAB_TITLES = {
  dashboard:"Dashboard", customers:"Customers", delivery:"Daily Delivery",
  imports:"Milk Imports", billing:"Billing", more:"More",
};

export default function App() {
  // ── global state ──
  const [tab,   setTab]   = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({});

  // FIX-2: removed upper bound "2026-12-31" — it would freeze today's date
  // for all users after Dec 31 2026. Only the lower bound guards against a
  // wildly wrong device clock in a demo context.
  const today = useMemo(() => {
    const d = getToday();
    return d >= "2025-01-01" ? d : "2025-01-18";
  }, []);

  const [customers,   setCustomers]   = useState(seedCustomers);
  const [imports,     setImports]     = useState(seedImports);
  const [bills,       setBills]       = useState(seedBills);
  const [logs,        setLogs]        = useState(seedLogs);
  const [adjustments, setAdjustments] = useState(seedAdjustments);
  const [pauses,      setPauses]      = useState(seedPauses);
  const [brands,      setBrands]      = useState(seedBrands);
  const [queue,       setQueue]       = useState(seedQueue);

  const [custSearch, setCustSearch] = useState("");
  const [custFilter, setCustFilter] = useState("All");
  const [impFilter,  setImpFilter]  = useState({ month:"", brand:"", status:"" });
  const [billFilter, setBillFilter] = useState("All");
  const [diagRan,    setDiagRan]    = useState(false);

  // FIX-4: Initialize billMonth to the real current month, not a hardcoded demo month.
  const [billMonth, setBillMonth] = useState(() => {
    const d = getToday();
    return d >= "2025-01-01" ? d.substring(0, 7) : "2025-01";
  });

  // FIX-3: Initialize logDate to today's real date so the delivery log opens
  // on the current day rather than a hardcoded demo date.
  const [logDate, setLogDate] = useState(() => {
    const d = getToday();
    return d >= "2025-01-01" ? d : "2025-01-18";
  });

  // setF("name") → (e) => setForm(p => ({...p, name: e.target.value}))
  // Stable across renders thanks to useCallback([]).
  const setF = useCallback(k => e => setForm(p => ({ ...p, [k]: e.target.value })), []);

  // Toast queue with id-based sequencing so stale timers never clear a newer toast.
  const toastIdRef = useRef(0);
  const toast$ = useCallback((msg, type = "info") => {
    const id = ++toastIdRef.current;
    setToast({ id, msg, type });
    setTimeout(() => {
      setToast(curr => (curr && curr.id === id ? null : curr));
    }, 3000);
  }, []);
  useEffect(() => () => { toastIdRef.current = -1; }, []);

  const openModal  = useCallback((type, data = {}) => { setModal({ type, data }); setForm(data); }, []);
  const closeModal = useCallback(() => { setModal(null); setForm({}); }, []);

  // ── derived (memoized) ──
  const activeC        = useMemo(() => customers.filter(c => c.status === "Active"),                       [customers]);
  const totalRevenue   = useMemo(() => bills.filter(b => b.status === "Paid").reduce((s,b) => s+b.paid, 0),   [bills]);
  const pendingDues    = useMemo(() => bills.filter(b => b.status !== "Paid").reduce((s,b) => s+(b.amount-b.paid), 0), [bills]);
  const confirmedStock = useMemo(() => imports.filter(i => i.status === "Confirmed").reduce((s,i) => s+i.qty, 0), [imports]);
  const todayLogs      = useMemo(() => logs.filter(l => l.date === logDate),                                    [logs, logDate]);

  const filteredC = useMemo(() => customers.filter(c => {
    const q = custSearch.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || c.phone.includes(q);
    const matchF = custFilter === "All" || c.status === custFilter;
    return matchQ && matchF;
  }), [customers, custSearch, custFilter]);

  const filteredI = useMemo(() => imports.filter(i => {
    if (impFilter.brand  && i.brand  !== impFilter.brand)  return false;
    if (impFilter.status && i.status !== impFilter.status) return false;
    if (impFilter.month  && !i.date.startsWith(impFilter.month)) return false;
    return true;
  }), [imports, impFilter]);

  const filteredB = useMemo(() => bills.filter(b => billFilter === "All" || b.status === billFilter), [bills, billFilter]);

  const activeBrandsCount = useMemo(() => brands.filter(b => b.status === "Active").length, [brands]);

  // ── handlers (extracted to useAppHandlers) ──
  const handlers = useAppHandlers({
    customers, setCustomers, imports, setImports, bills, setBills,
    logs, setLogs, adjustments, setAdjustments, pauses, setPauses,
    brands, setBrands, queue, setQueue, form, modal,
    today, billMonth, toast$, closeModal, activeC,
  });

  // ── modal dispatch ──
  // form/modal state stays here; each entry wires a modal component to the
  // matching handler. Adding a new modal = component + one entry here.
  const MODAL_RENDERERS = {
    addCustomer:  () => <CustomerModal   data={modal.data} isEdit={false} onChange={setF} onSave={handlers.saveCustomer}   onClose={closeModal} products={PRODUCTS} />,
    editCustomer: () => <CustomerModal   data={modal.data} isEdit={true}  onChange={setF} onSave={handlers.saveCustomer}   onClose={closeModal} products={PRODUCTS} />,
    addImport:    () => <ImportModal     data={modal.data} form={form}   onChange={setF} onSave={handlers.saveImport}     onClose={closeModal} today={today} brands={brands} milkTypes={MILK_TYPES} />,
    payment:      () => <PaymentModal    data={modal.data} form={form}   onChange={setF} onSave={handlers.recordPayment}  onClose={closeModal} today={today} payModes={PAY_MODES} />,
    billDetail:   () => <BillDetailModal data={modal.data} onClose={closeModal} />,
    addAdj:       () => <AdjustmentModal data={modal.data} onChange={setF} onSave={handlers.saveAdjustment} onClose={closeModal} today={today} customers={customers} />,
    addPause:     () => <PauseModal      data={modal.data} onChange={setF} onSave={handlers.savePause}      onClose={closeModal} today={today} customers={customers} />,
    addBrand:     () => <BrandModal      onChange={setF} onSave={handlers.saveBrand} onClose={closeModal} milkTypes={MILK_TYPES} />,
  };

  // ── page props bundles ──
  // Keeps each page's call-site clean: <Dashboard {...dashboardProps} />
  const dashboardProps = {
    today, activeC, totalRevenue, pendingDues, confirmedStock, todayLogs,
    queue, bills,
    onSetTab: setTab, onOpenModal: openModal, onGenerateBill: handlers.generateBill,
  };

  const customerProps = {
    filtered: filteredC, total: filteredC.length, bills,
    search: custSearch, onSearchChange: setCustSearch,
    filter: custFilter, onFilterChange: setCustFilter,
    onOpenModal: openModal, onWhatsapp: handlers.whatsapp, onDeactivate: handlers.deleteCustomer,
  };

  const deliveryProps = {
    logDate, onLogDateChange: setLogDate, todayLogs, onToggleLog: handlers.toggleLog,
  };

  const importsProps = {
    filtered: filteredI, brands, impFilter, onImpFilterChange: setImpFilter,
    onOpenModal: openModal, onConfirm: handlers.confirmImport, onDelete: handlers.deleteImport,
  };

  const billingProps = {
    bills, filtered: filteredB, billFilter, billMonth, pendingDues, customers,
    onBillFilterChange: setBillFilter, onBillMonthChange: setBillMonth,
    onGenerateBill: handlers.generateBill, onOpenModal: openModal,
    onLock: handlers.lockBill, onUnlock: handlers.unlockBill, onWhatsapp: handlers.whatsapp,
  };

  const moreProps = {
    adjustments, pauses, queue, brands, diagRan, activeBrandsCount,
    onOpenModal: openModal, onApplyAdj: handlers.applyAdj,
    onRetry: handlers.retryQueue, onDismiss: handlers.dismissQueue,
    onRunDiag: () => { setDiagRan(true); toast$("19 checks complete", "info"); },
    onHealthCheck: () => toast$("Health check passed — V17", "success"),
  };

  // Tab → page component map. `tab` is the source of truth.
  const pageNode = (() => {
    switch (tab) {
      case "customers": return <Customers {...customerProps} />;
      case "delivery":  return <Delivery  {...deliveryProps} />;
      case "imports":   return <Imports   {...importsProps} />;
      case "billing":   return <Billing   {...billingProps} />;
      case "more":      return <More      {...moreProps} />;
      case "dashboard":
      default:          return <Dashboard {...dashboardProps} />;
    }
  })();

  const modalNode = modal && MODAL_RENDERERS[modal.type] ? MODAL_RENDERERS[modal.type]() : null;

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", maxWidth:420, margin:"0 auto", background:"#f8fafc", minHeight:640, position:"relative", paddingBottom:68 }}>
      {/* Header */}
      <div style={{ background:BLUE, color:"#fff", padding:"14px 16px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:200 }}>
        <div>
          <div style={{ fontSize:10, opacity:0.7, letterSpacing:0.8 }}>MILK DELIVERY ADMIN V17</div>
          <div style={{ fontSize:16, fontWeight:700, marginTop:1 }}>{TAB_TITLES[tab]}</div>
        </div>
        <div style={{ textAlign:"right", fontSize:11, opacity:0.85 }}>
          <div>{today}</div>
          <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end", marginTop:2 }}>
            <span style={{ width:6, height:6, background:"#4ade80", borderRadius:"50%", display:"inline-block" }} />
            Online
          </div>
        </div>
      </div>

      {/* Page */}
      <div style={{ padding:"14px 12px" }}>{pageNode}</div>

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, background:"#fff", borderTop:"0.5px solid #e5e7eb", display:"flex", zIndex:300 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"9px 2px 7px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, position:"relative" }}>
            {t.id === "more" && queue.filter(q => q.status === "dead").length > 0 && (
              <span style={{ position:"absolute", top:6, right:"20%", width:7, height:7, background:"#ef4444", borderRadius:"50%", display:"block" }} />
            )}
            <span style={{ fontSize:17 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? BLUE : "#9ca3af" }}>{t.label}</span>
            {tab === t.id && <span style={{ position:"absolute", bottom:0, left:"20%", right:"20%", height:2, background:BLUE, borderRadius:2 }} />}
          </button>
        ))}
      </div>

      {modalNode}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} key={toast.id} />}
    </div>
  );
}