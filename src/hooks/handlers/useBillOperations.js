import { useCallback } from "react";
import { mapBillFromApi, callApi } from "../../lib/api.js";
import { useHelpers } from "./shared.js";

export function useBillOperations(state) {
  const { customers, setBills } = state;
  const { showToast, handleIdAction } = useHelpers(state);

  const generateMonthlyBills = useCallback(async (month) => {
    try {
      const activeCustomers = customers.filter((c) => c.status === "Active");
      const results = await Promise.allSettled(
        activeCustomers.map((c) =>
          callApi("generateMonthBill", { customerId: c.id, month })
        )
      );
      
      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        // 🚨 FIXED BUG: Changed toast$ to showToast
        showToast(`Generated bills, but ${failedCount} failed. Check logs.`, "warning");
      } else {
        showToast("All monthly bills generated successfully!", "success");
      }
      
      const res = await callApi("getBills", {});
      setBills((res.bills || []).map(mapBillFromApi));
    } catch (e) {
      showToast(e.message, "error");
    }
  }, [customers, setBills, showToast]);

  const lockBill = useCallback((billId) =>
    handleIdAction("lockBill", "billId", billId, "Bill locked", "getBills", setBills, mapBillFromApi, "bills"),
  [handleIdAction, setBills]);

  const unlockBill = useCallback((billId) =>
    handleIdAction("unlockBill", "billId", billId, "Bill unlocked", "getBills", setBills, mapBillFromApi, "bills"),
  [handleIdAction, setBills]);

  const whatsapp = useCallback(async (phone, billId) => {
    if (!phone) {
      showToast("No phone number on file", "error");
      return;
    }
    const digits = String(phone).replace(/\D/g, "");
    const intlPhone = digits.length === 10 ? "91" + digits : digits;
    if (!intlPhone) {
      showToast("Invalid phone number", "error");
      return;
    }
    
    let text = `Pending milk bill — Bill ${billId}`;
    if (billId) {
      try {
        const data = await callApi("getBillText", { billId });
        if (data?.text) text = data.text;
      } catch {
        // keep the fallback text
      }
    }
    
    const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
    // cspell:disable-next-line
    window.open(url, "_blank", "noopener,noreferrer");
  }, [showToast]);

  return { generateMonthlyBills, lockBill, unlockBill, whatsapp };
}