// ── useAppHandlers.js ─────────────────────────────────────────────────────────
// All the imperative save/edit/generate logic lives here. App.jsx owns state
// and passes it in; this hook returns the bound handlers.
//
// Extracting these out of App keeps App's cognitive complexity low — every
// handler used to be defined inside App and contributed to its score.

import { useCallback, useMemo } from "react";

import { RATE_BY_PRODUCT } from "../lib/constants.js";
import { fmt, uuid, cleanPhone, monthLabel, daysInMonth } from "../lib/utils.js";

/**
 * @param {Object}   ctx                     All state + setters + modal helpers.
 * @param {Array}    ctx.customers           customers[]              (read by saveAdjustment/savePause)
 * @param {Array}    ctx.bills               bills[]                  (read by generateBill/whatsapp)
 * @param {Function} ctx.setCustomers
 * @param {Function} ctx.setImports
 * @param {Function} ctx.setBills
 * @param {Function} ctx.setLogs
 * @param {Function} ctx.setAdjustments
 * @param {Function} ctx.setPauses
 * @param {Function} ctx.setBrands
 * @param {Function} ctx.setQueue
 * @param {Object}   ctx.form                form{}                   (live form values)
 * @param {Object}   ctx.modal               modal{}                  (read for bill lookup in recordPayment)
 * @param {string}   ctx.today               today's date (YYYY-MM-DD)
 * @param {string}   ctx.billMonth           selected bill month (YYYY-MM)
 * @param {Function} ctx.toast$              toast(msg, type)
 * @param {Function} ctx.closeModal          closes the open modal
 * @param {Array}    ctx.activeC             already-filtered active customers
 * @returns {Object} All the bound handlers.
 */
export function useAppHandlers({
  customers, bills,
  setCustomers, setImports, setBills, setLogs, setAdjustments, setPauses, setBrands, setQueue,
  form, modal,
  today, billMonth,
  toast$, closeModal, activeC,
}) {

  // ── customers ──
  const saveCustomer = useCallback(() => {
    if (!form.name?.trim())    { toast$("Name is required", "error"); return; }
    if (!form.address?.trim()) { toast$("Address is required", "error"); return; }
    if (form.phone && !/^\d{10}$/.test(cleanPhone(form.phone))) { toast$("Enter valid 10-digit phone", "error"); return; }

    if (form.id) {
      setCustomers(p => p.map(c => c.id === form.id ? { ...c, ...form } : c));
      toast$("Customer updated", "success");
    } else {
      // FIX-5: explicitly default `product`. Without this, if the user never
      // touches the product <select>, form.product is undefined (defaultValue
      // only sets the DOM value, not React state), which breaks billing rate
      // lookup and the customer card display.
      const nc = {
        ...form,
        id: "C" + uuid(),
        status: "Active",
        balance: 0,
        deliveryDays: [1,2,3,4,5,6,0],
        qty: parseFloat(form.qty) || 1,
        product: form.product || "Full Cream",
      };
      setCustomers(p => [...p, nc]);
      toast$("Customer added", "success");
    }
    closeModal();
  }, [form, setCustomers, toast$, closeModal]);

  const deleteCustomer = useCallback(id => {
    setCustomers(p => p.map(c => c.id === id ? { ...c, status: "Inactive" } : c));
    toast$("Customer deactivated", "info");
    closeModal();
  }, [setCustomers, toast$, closeModal]);

  // ── imports ──
  const saveImport = useCallback(() => {
    const qty = parseFloat(form.qty) || 0, rate = parseFloat(form.rate) || 0;
    if (!form.date || !form.brand || !form.type) { toast$("Fill required fields", "error"); return; }
    if (qty <= 0 || qty > 9999) { toast$("Invalid quantity", "error"); return; }
    if (rate <= 0)               { toast$("Invalid rate", "error"); return; }
    const total = Math.round(qty * rate * 100) / 100;
    if (form.id) {
      setImports(p => p.map(i => i.id === form.id ? { ...i, ...form, qty, rate, total, version: (i.version || 1) + 1 } : i));
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

  // ── bills ──
  const recordPayment = useCallback(() => {
    const amt = parseFloat(form.payAmt) || 0;
    if (amt <= 0) { toast$("Enter valid amount", "error"); return; }
    const billId = modal?.data?.id;
    setBills(p => p.map(b => {
      if (b.id !== billId) return b;
      const np = Math.min(b.paid + amt, b.amount);
      return { ...b, paid: np, status: np >= b.amount ? "Paid" : "Partial" };
    }));
    toast$(`${fmt(amt)} via ${form.payMode || "Cash"} recorded`, "success");
    closeModal();
  }, [form, modal, setBills, toast$, closeModal]);

  const lockBill   = useCallback(id => { setBills(p => p.map(b => b.id === id ? { ...b, locked: true  } : b)); toast$("Bill locked",   "info"); }, [setBills, toast$]);
  const unlockBill = useCallback(id => { setBills(p => p.map(b => b.id === id ? { ...b, locked: false } : b)); toast$("Bill unlocked", "info"); }, [setBills, toast$]);

  // ── delivery ──
  const toggleLog = useCallback(lid => {
    setLogs(p => p.map(l => l.id === lid ? { ...l, delivered: !l.delivered } : l));
  }, [setLogs]);

  // ── adjustments ──
  const saveAdjustment = useCallback(() => {
    const amt = parseFloat(form.amount) || 0;
    if (!form.custId || !amt || !form.reason) { toast$("Fill all fields", "error"); return; }
    const cust = customers.find(c => c.id === form.custId);
    setAdjustments(p => [...p, { id: "ADJ" + uuid(), custId: form.custId, customer: cust?.name || "", date: form.date || today, amount: amt, reason: form.reason, applied: false }]);
    toast$("Adjustment added", "success");
    closeModal();
  }, [form, customers, today, setAdjustments, toast$, closeModal]);

  const applyAdj = useCallback(id => {
    setAdjustments(p => p.map(a => a.id === id ? { ...a, applied: true } : a));
    toast$("Adjustment applied to bill", "success");
  }, [setAdjustments, toast$]);

  // ── pauses ──
  const savePause = useCallback(() => {
    if (!form.custId || !form.startDate || !form.endDate) { toast$("Fill all fields", "error"); return; }
    const cust = customers.find(c => c.id === form.custId);
    setPauses(p => [...p, { id: "P" + uuid(), custId: form.custId, customer: cust?.name || "", startDate: form.startDate, endDate: form.endDate, reason: form.reason || "" }]);
    setCustomers(p => p.map(c => c.id === form.custId ? { ...c, status: "Paused" } : c));
    toast$("Pause period saved", "success");
    closeModal();
  }, [form, customers, setPauses, setCustomers, toast$, closeModal]);

  // ── brands ──
  const saveBrand = useCallback(() => {
    if (!form.name?.trim()) { toast$("Brand name required", "error"); return; }
    setBrands(p => [...p, {
      id: "BR" + uuid(),
      name: form.name,
      supplier: form.supplier || "",
      phone: form.phone || "",
      defaultMilkType: form.defaultType || "",
      rate: form.rate !== undefined && form.rate !== "" ? parseFloat(form.rate) : null,
      status: "Active",
    }]);
    toast$("Brand added", "success");
    closeModal();
  }, [form, setBrands, toast$, closeModal]);

  // ── write queue ──
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

  // ── billing generation ──
  const generateBill = useCallback(() => {
    const label = monthLabel(billMonth);
    const totalDaysInMonth = daysInMonth(billMonth);
    const existing = new Set(bills.map(b => b.custId + "-" + b.month));

    const newBills = activeC.filter(c => !existing.has(c.id + "-" + label)).map(c => {
      let scheduledDays = 0;
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dateStr = billMonth + "-" + String(d).padStart(2, "0");
        const dow = new Date(dateStr).getDay();
        if (c.deliveryDays?.includes(dow)) scheduledDays++;
      }
      const rate = RATE_BY_PRODUCT[c.product] || 32;
      const amount = Math.round(c.qty * rate * scheduledDays);
      const [y, m] = billMonth.split("-").map(Number);
      const dueY = m === 12 ? y + 1 : y, dueM = m === 12 ? 1 : m + 1;
      return {
        id: "BL" + uuid(), custId: c.id, customer: c.name,
        month: label, amount, paid: 0, status: "Unpaid",
        due: `${dueY}-${String(dueM).padStart(2, "0")}-05`, locked: false,
      };
    });

    if (newBills.length === 0) { toast$("All bills already generated for " + label, "info"); return; }
    setBills(p => [...p, ...newBills]);
    toast$(`${newBills.length} bill(s) generated for ${label}`, "success");
  }, [billMonth, activeC, bills, setBills, toast$]);

  // FIX-6: "noreferrer" alongside "noopener". Without noreferrer some browsers
  // still expose window.opener to the target page, enabling tab-napping.
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

  return useMemo(() => ({
    saveCustomer, deleteCustomer,
    saveImport, confirmImport, deleteImport,
    recordPayment, lockBill, unlockBill,
    toggleLog,
    saveAdjustment, applyAdj,
    savePause,
    saveBrand,
    retryQueue, dismissQueue,
    generateBill, whatsapp,
  }), [
    saveCustomer, deleteCustomer,
    saveImport, confirmImport, deleteImport,
    recordPayment, lockBill, unlockBill,
    toggleLog,
    saveAdjustment, applyAdj,
    savePause,
    saveBrand,
    retryQueue, dismissQueue,
    generateBill, whatsapp,
  ]);
}