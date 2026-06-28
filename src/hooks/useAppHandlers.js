// ── useAppHandlers.js ─────────────────────────────────────────────────────────
// All the imperative save/edit/generate logic lives here. App.jsx owns state
// and passes it in; this hook returns the bound handlers.

import { useCallback, useMemo } from "react";

import { fmt, uuid, cleanPhone, monthLabel } from "../lib/utils.js";
import { applyPayment, generateBillsForMonth } from "../lib/billing.js";
import {
  validateCustomerForm, buildNewCustomer,
  validateImportForm, parseImportValues, parseOptionalRate,
} from "../lib/validation.js";

// ── Customer handlers ───────────────────────────────────────────────────────────
function useCustomerHandlers({ setCustomers, form, toast$, closeModal }) {
  const saveCustomer = useCallback(() => {
    const err = validateCustomerForm(form);
    if (err) { toast$(err, "error"); return; }

    if (form.id) {
      setCustomers(p => p.map(c => c.id === form.id ? { ...c, ...form } : c));
      toast$("Customer updated", "success");
    } else {
      setCustomers(p => [...p, buildNewCustomer(form)]);
      toast$("Customer added", "success");
    }
    closeModal();
  }, [form, setCustomers, toast$, closeModal]);

  const deleteCustomer = useCallback(id => {
    setCustomers(p => p.map(c => c.id === id ? { ...c, status: "Inactive" } : c));
    toast$("Customer deactivated", "info");
    closeModal();
  }, [setCustomers, toast$, closeModal]);

  return { saveCustomer, deleteCustomer };
}

// ── Import handlers ─────────────────────────────────────────────────────────────
function useImportHandlers({ setImports, form, toast$, closeModal }) {
  const saveImport = useCallback(() => {
    const err = validateImportForm(form);
    if (err) { toast$(err, "error"); return; }
    const { qty, rate, total } = parseImportValues(form);

    if (form.id) {
      setImports(p => p.map(i => i.id === form.id
        ? { ...i, ...form, qty, rate, total, version: (i.version || 1) + 1 }
        : i));
      toast$("Import updated", "success");
    } else {
      setImports(p => [...p, { ...form, id: "IMP" + uuid(), qty, rate, total, status: "Draft", version: 1 }]);
      toast$("Import saved as Draft", "success");
    }
    closeModal();
  }, [form, setImports, toast$, closeModal]);

  const confirmImport = useCallback(id => {
    setImports(p => p.map(i => i.id === id ? { ...i, status: "Confirmed", version: (i.version || 1) + 1 } : i));
    toast$("Import confirmed", "success");
  }, [setImports, toast$]);

  const deleteImport = useCallback(id => {
    setImports(p => p.filter(i => i.id !== id));
    toast$("Import deleted", "info");
  }, [setImports, toast$]);

  return { saveImport, confirmImport, deleteImport };
}

// ── Bill handlers ───────────────────────────────────────────────────────────────
function useBillHandlers({ setBills, form, modal, toast$, closeModal, activeC, bills, billMonth }) {
  const recordPayment = useCallback(() => {
    const amt = parseFloat(form.payAmt) || 0;
    if (amt <= 0) { toast$("Enter valid amount", "error"); return; }
    const billId = modal?.data?.id;
    setBills(p => p.map(b => b.id === billId ? applyPayment(b, amt) : b));
    toast$(`${fmt(amt)} via ${form.payMode || "Cash"} recorded`, "success");
    closeModal();
  }, [form, modal, setBills, toast$, closeModal]);

  const lockBill = useCallback(id => {
    setBills(p => p.map(b => b.id === id ? { ...b, locked: true } : b));
    toast$("Bill locked", "info");
  }, [setBills, toast$]);

  const unlockBill = useCallback(id => {
    setBills(p => p.map(b => b.id === id ? { ...b, locked: false } : b));
    toast$("Bill unlocked", "info");
  }, [setBills, toast$]);

  const generateBill = useCallback(() => {
    const result = generateBillsForMonth(activeC, bills, billMonth);
    if (!result) {
      toast$(`All bills already generated for ${monthLabel(billMonth)}`, "info");
      return;
    }
    setBills(p => [...p, ...result.newBills]);
    toast$(`${result.newBills.length} bill(s) generated for ${result.label}`, "success");
  }, [billMonth, activeC, bills, setBills, toast$]);

  return { recordPayment, lockBill, unlockBill, generateBill };
}

// ── Adjustment & Pause handlers ──────────────────────────────────────────────────
function useAdjustmentHandlers({ setAdjustments, setCustomers, setPauses, form, customers, today, toast$, closeModal }) {
  const saveAdjustment = useCallback(() => {
    const amt = parseFloat(form.amount) || 0;
    if (!form.custId || !amt || !form.reason) { toast$("Fill all fields", "error"); return; }
    const cust = customers.find(c => c.id === form.custId);
    setAdjustments(p => [...p, {
      id: "ADJ" + uuid(), custId: form.custId, customer: cust?.name || "",
      date: form.date || today, amount: amt, reason: form.reason, applied: false,
    }]);
    toast$("Adjustment added", "success");
    closeModal();
  }, [form, customers, today, setAdjustments, toast$, closeModal]);

  const applyAdj = useCallback(id => {
    setAdjustments(p => p.map(a => a.id === id ? { ...a, applied: true } : a));
    toast$("Adjustment applied to bill", "success");
  }, [setAdjustments, toast$]);

  const savePause = useCallback(() => {
    if (!form.custId || !form.startDate || !form.endDate) { toast$("Fill all fields", "error"); return; }
    const cust = customers.find(c => c.id === form.custId);
    setPauses(p => [...p, {
      id: "P" + uuid(), custId: form.custId, customer: cust?.name || "",
      startDate: form.startDate, endDate: form.endDate, reason: form.reason || "",
    }]);
    setCustomers(p => p.map(c => c.id === form.custId ? { ...c, status: "Paused" } : c));
    toast$("Pause period saved", "success");
    closeModal();
  }, [form, customers, setPauses, setCustomers, toast$, closeModal]);

  return { saveAdjustment, applyAdj, savePause };
}

// ── Brand handlers ─────────────────────────────────────────────────────────────
function useBrandHandlers({ setBrands, form, toast$, closeModal }) {
  const saveBrand = useCallback(() => {
    if (!form.name?.trim()) { toast$("Brand name required", "error"); return; }
    setBrands(p => [...p, {
      id: "BR" + uuid(),
      name: form.name,
      supplier: form.supplier || "",
      phone: form.phone || "",
      defaultMilkType: form.defaultType || "",
      rate: parseOptionalRate(form.rate),
      status: "Active",
    }]);
    toast$("Brand added", "success");
    closeModal();
  }, [form, setBrands, toast$, closeModal]);

  return { saveBrand };
}

// ── Queue handlers ───────────────────────────────────────────────────────────────
function useQueueHandlers({ setQueue, toast$ }) {
  const retryQueue = useCallback(key => {
    setQueue(p => p.map(q => q.key === key ? { ...q, status: "pending", retries: 0 } : q));
    setTimeout(() => {
      setQueue(p => p.filter(q => q.key !== key));
      toast$("Write synced successfully", "success");
    }, 1500);
    toast$("Retrying…", "info");
  }, [setQueue, toast$]);

  const dismissQueue = useCallback(key => {
    setQueue(p => p.filter(q => q.key !== key));
    toast$("Write dismissed", "info");
  }, [setQueue, toast$]);

  return { retryQueue, dismissQueue };
}

// ── Other handlers ─────────────────────────────────────────────────────────────
function useOtherHandlers({ setLogs, bills, toast$ }) {
  const toggleLog = useCallback(lid => {
    setLogs(p => p.map(l => l.id === lid ? { ...l, delivered: !l.delivered } : l));
  }, [setLogs]);

  const whatsapp = useCallback((phone, billId) => {
    const b = bills.find(x => x.id === billId);
    if (!b) return;
    const digits = cleanPhone(phone);
    if (digits.length < 10) { toast$("Invalid phone number for WhatsApp", "error"); return; }
    const text = `Dear ${b.customer},\nYour milk bill for ${b.month}:\nAmount: ₹${b.amount}\nPaid: ₹${b.paid}\nDue: ₹${b.amount - b.paid}\n\nPlease pay by ${b.due}.\n- Milk Delivery Admin V17`;
    window.open(
      `https://wa.me/91${digits.length === 10 ? digits : digits.replace(/^91/, "")}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    toast$("WhatsApp opened", "success");
  }, [bills, toast$]);

  return { toggleLog, whatsapp };
}

// ── Main hook composition ───────────────────────────────────────────────────────
export function useAppHandlers(state) {
  const {
    customers, bills,
    setCustomers, setImports, setBills, setLogs, setAdjustments, setPauses, setBrands, setQueue,
    form, modal,
    today, billMonth,
    toast$, closeModal, activeC,
  } = state;
  const customerHandlers = useCustomerHandlers({ setCustomers, form, toast$, closeModal });
  const importHandlers = useImportHandlers({ setImports, form, toast$, closeModal });
  const billHandlers = useBillHandlers({ setBills, form, modal, toast$, closeModal, activeC, bills, billMonth });
  const adjustmentHandlers = useAdjustmentHandlers({ setAdjustments, setCustomers, form, customers, today, toast$, closeModal, setPauses });
  const brandHandlers = useBrandHandlers({ setBrands, form, toast$, closeModal });
  const queueHandlers = useQueueHandlers({ setQueue, toast$ });
  const otherHandlers = useOtherHandlers({ setLogs, bills, toast$ });

  return useMemo(() => ({
    ...customerHandlers,
    ...importHandlers,
    ...billHandlers,
    ...adjustmentHandlers,
    ...brandHandlers,
    ...queueHandlers,
    ...otherHandlers,
  }), [
    customerHandlers, importHandlers, billHandlers,
    adjustmentHandlers, brandHandlers, queueHandlers, otherHandlers
  ]);
}
