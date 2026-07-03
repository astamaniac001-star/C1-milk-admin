import { useMemo, useCallback } from "react";
import {
  callApi,
  mapCustomerToApi,
  mapImportToApi,
  mapPaymentToApi,
  mapBillFromApi,
} from "../lib/api.js";
import { getToday } from "../lib/utils.js";

// fallow-ignore-next-line complexity
export function useAppHandlers(state) {
  const {
    customers,
    setCustomers,
    setBills,
    setImports,
    setLogs,
    setAdjustments,
    setBrands,
    setSubscriptions,
    toast$,
    closeModal,
    form = {},
    modal = {},
  } = state;

  const showToast = useCallback((msg, type) => toast$(msg, type), [toast$]);

  // 1. Customer Handlers
  const customerHandlers = useMemo(
    () => ({
      addCustomer: async (formArg) => {
        const f = formArg || form;
        try {
          const payload = mapCustomerToApi(f);
          const res = await callApi("addCustomer", payload);
          setCustomers((prev) => [...prev, res.customer]);
          showToast("Customer added", "success");
          if (closeModal) closeModal();
        } catch (e) {
          showToast(e.message, "error");
        }
      },
      updateCustomer: async (formArg) => {
        const f = formArg || form;
        try {
          const payload = mapCustomerToApi(f);
          const res = await callApi("updateCustomer", payload);
          const updated = res.customer || { ...f, version: res.newVersion };
          setCustomers((prev) =>
            prev.map((c) => (c.id === f.id ? updated : c)),
          );
          showToast("Customer updated", "success");
          if (closeModal) closeModal();
        } catch (e) {
          showToast(e.message, "error");
        }
      },
    }),
    [setCustomers, showToast, closeModal, form],
  );

  // 2. Billing Handlers

  const billingHandlers = useMemo(() => {
    // ✅ 1. Helpers are defined INSIDE the useMemo
    const getPaymentData = (billIdArg, amountArg) => {
      const billId = billIdArg || modal.data?.id || modal.data?.billId;
      const amount = amountArg !== undefined ? amountArg : form.payAmt;
      return { billId, amount };
    };

    const getAdjustmentData = (billIdArg, amountArg, reasonArg) => {
      const billId = billIdArg || form.custId || form.billId || modal.data?.id;
      const amount = amountArg !== undefined ? amountArg : form.amount;
      const reason = reasonArg !== undefined ? reasonArg : form.reason;
      return { billId, amount, reason };
    };

    return {
      recordPayment: async (billIdArg, amountArg) => {
        // ✅ 2. Helpers are USED here
        const { billId, amount } = getPaymentData(billIdArg, amountArg);
        if (!amount || Number(amount) <= 0) {
          showToast("Enter valid amount", "error");
          return;
        }
        try {
          const payload = mapPaymentToApi(billId, amount);
          const res = await callApi("recordPayment", payload);
          setBills((prev) =>
            prev.map((b) =>
              b.id !== billId
                ? b
                : {
                    ...b,
                    paid: res.amountPaid ?? b.paid + Number(amount),
                    status:
                      res.status ??
                      (b.paid + Number(amount) >= b.amount
                        ? "Paid"
                        : "Partial"),
                  },
            ),
          );
          showToast(`₹${amount} recorded`, "success");
          if (closeModal) closeModal();
        } catch (e) {
          showToast(e.message, "error");
        }
      },

      generateMonthlyBills: async (month) => {
        try {
          const activeCustomers = customers.filter(
            (c) => c.status === "Active",
          );
          for (const c of activeCustomers) {
            await callApi("generateMonthBill", {
              customerId: c.id,
              month,
            }).catch(() => {});
          }
          const res = await callApi("getBills", {});
          setBills((res.bills || []).map(mapBillFromApi));
          showToast("Bills generated", "success");
        } catch (e) {
          showToast(e.message, "error");
        }
      },

      saveAdjustment: async (billIdArg, amountArg, reasonArg) => {
        // ✅ 3. Helpers are USED here
        const { billId, amount, reason } = getAdjustmentData(
          billIdArg,
          amountArg,
          reasonArg,
        );
        if (!billId || !amount || !reason) {
          showToast("Fill all fields", "error");
          return;
        }
        try {
          const payload = {
            billId,
            amount: Number(amount),
            reason,
            idempotencyKey: Date.now().toString(),
          };
          await callApi("addAdjustment", payload);
          const newAdj = {
            id: Date.now().toString(),
            billId,
            amount: Number(amount),
            reason,
            date: getToday(),
          };
          setAdjustments((prev) => [...prev, newAdj]);
          showToast("Added", "success");
          if (closeModal) closeModal();
        } catch (e) {
          showToast(e.message, "error");
        }
      },
    };
  }, [customers, setBills, setAdjustments, showToast, closeModal, form, modal]);

  // 3. Import Handlers
  const importHandlers = useMemo(
    () => ({
      addMilkImport: async (formArg) => {
        const f = formArg || form;
        try {
          const payload = mapImportToApi(f);
          const res = await callApi("addMilkImport", payload);
          setImports((prev) => [...prev, res.import]);
          showToast("Import added", "success");
          if (closeModal) closeModal();
        } catch (e) {
          showToast(e.message, "error");
        }
      },
      updateMilkImport: async (formArg) => {
        const f = formArg || form;
        try {
          const payload = mapImportToApi(f);
          const res = await callApi("updateMilkImport", payload);
          const updated = res.import || { ...f, version: res.newVersion };
          setImports((prev) => prev.map((i) => (i.id === f.id ? updated : i)));
          showToast("Import updated", "success");
          if (closeModal) closeModal();
        } catch (e) {
          showToast(e.message, "error");
        }
      },
    }),
    [setImports, showToast, closeModal, form],
  );

  // 4. Delivery Handlers
  const deliveryHandlers = useMemo(
    () => ({
      toggleDeliveryLog: async (logId, delivered) => {
        try {
          const payload = {
            logId,
            delivered,
            date: getToday(),
            idempotencyKey: Date.now().toString(),
          };
          await callApi("updateLogEntry", payload);

          setLogs((prev) =>
            prev.map((l) =>
              l.id === logId
                ? {
                    ...l,
                    delivered,
                    status: delivered ? "Delivered" : "Pending",
                  }
                : l,
            ),
          );
          showToast("Log updated", "success");
        } catch (e) {
          showToast(e.message, "error");
        }
      },
      bulkUpsertLogs: async (logsToUpsert) => {
        try {
          const payload = {
            logs: logsToUpsert,
            idempotencyKey: Date.now().toString(),
          };
          await callApi("bulkUpsertLogs", payload);

          const res = await callApi("getDailyLogs", { date: getToday() });
          setLogs(
            (res.logs || []).map((l) => ({
              id: l.logId,
              custId: l.customerId,
              date: l.date,
              delivered: l.delivered,
              status: l.status,
            })),
          );
          showToast("Logs saved", "success");
        } catch (e) {
          showToast(e.message, "error");
        }
      },
    }),
    [setLogs, showToast],
  );

  // 5. Admin / Misc Handlers
  const adminHandlers = useMemo(
    () => ({
      addPause: async (customerId, startDate, endDate, reason) => {
        try {
          const payload = {
            customerId,
            startDate,
            endDate,
            reason,
            idempotencyKey: Date.now().toString(),
          };
          await callApi("addPausePeriod", payload);
          showToast("Pause added", "success");
          if (closeModal) closeModal();
        } catch (e) {
          showToast(e.message, "error");
        }
      },
      addBrand: async (brandName) => {
        try {
          const payload = { brandName, idempotencyKey: Date.now().toString() };
          await callApi("addMilkBrand", payload);
          showToast("Brand added", "success");
          if (closeModal) closeModal();
        } catch (e) {
          showToast(e.message, "error");
        }
      },
    }),
    [showToast, closeModal],
  );

  // 6. Dispatch helpers — modal Save buttons funnel through these so the
  //    modal layer doesn't need to know whether something is create vs edit.
  const saveCustomer = useCallback(
    async (formArg) => {
      const f = formArg || form;
      if (!f) return;
      if (f.id) {
        return customerHandlers.updateCustomer(f);
      }
      return customerHandlers.addCustomer(f);
    },
    [customerHandlers, form],
  );

  const saveImport = useCallback(
    async (formArg) => {
      const f = formArg || form;
      if (!f) return;
      if (f.id) {
        return importHandlers.updateMilkImport(f);
      }
      return importHandlers.addMilkImport(f);
    },
    [importHandlers, form],
  );

  const savePause = useCallback(
    async (formArg) => {
      const f = formArg || form;
      if (!f) return;
      return adminHandlers.addPause(
        f.custId || modal.data?.custId,
        f.startDate,
        f.endDate,
        f.reason,
      );
    },
    [adminHandlers, form, modal],
  );

  const saveBrand = useCallback(
    async (formArg) => {
      const f = formArg || form;
      if (!f) return;
      const brandName =
        f.name ||
        f.brandName ||
        modal.data?.name ||
        modal.data?.brandName ||
        "";
      if (!brandName || !String(brandName).trim()) {
        showToast("Brand name is required", "error");
        return;
      }
      try {
        await callApi("addMilkBrand", {
          brandName: brandName.trim(),
          supplierName: f.supplier,
          supplierPhone: f.phone,
          defaultMilkType: f.defaultType,
          ratePerLiter:
            f.rate !== undefined && f.rate !== "" ? Number(f.rate) : undefined,
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        });
        setBrands((prev) => [
          ...prev,
          {
            id: "BRAND-" + Date.now().toString(36).toUpperCase(),
            name: brandName.trim(),
            supplier: f.supplier || "",
            phone: f.phone || "",
            status: "Active",
          },
        ]);
        showToast("Brand added", "success");
        if (closeModal) closeModal();
      } catch (err) {
        showToast(err.message, "error");
      }
    },
    [setBrands, showToast, closeModal, form, modal],
  );

  //7. ── SUBSCRIPTION HANDLERS ──────────────────────────────────────────────
  const saveSubscription = useCallback(
    async (data) => {
      try {
        const payload = { ...data };

        // If editing, we must pass the expectedVersion for Optimistic Concurrency Control
        if (data.id) {
          payload.expectedVersion = data.version;
        } else {
          // If creating, pass an idempotencyKey to prevent duplicate network retries
          payload.idempotencyKey = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        const res = await callApi("saveSubscription", payload);

        if (data.id) {
          // Update existing
          setSubscriptions((prev) =>
            prev.map((s) =>
              s.id === data.id ? { ...s, ...data, version: res.newVersion } : s,
            ),
          );
        } else {
          // Append new
          setSubscriptions((prev) => [
            ...prev,
            { ...data, id: res.id, version: res.newVersion },
          ]);
        }

        showToast("Subscription saved", "success");
        if (closeModal) closeModal();
      } catch (err) {
        showToast(err.message || "Failed to save subscription", "error");
      }
    },
    [setSubscriptions, showToast, closeModal],
  );

  const generateDailyLogs = useCallback(
    async (date) => {
      try {
        // Generate a unique idempotency key for this batch run
        const idempotencyKey = `gen-logs-${date}-${Date.now()}`;
        const summary = await callApi("generateDailyLogsForDate", {
          date,
          idempotencyKey,
        });

        // Show a detailed toast based on the backend summary
        const skipped =
          (summary.skippedExisting || 0) +
          (summary.skippedPaused || 0) +
          (summary.skippedWrongDay || 0) +
          (summary.skippedInactiveCust || 0);

        showToast(
          `Generated ${summary.created} logs. Skipped ${skipped}.`,
          summary.created > 0 ? "success" : "info",
        );

        // Crucial: Refetch the logs for that specific date so the Delivery UI updates immediately
        if (state.fetchLogs) {
          await state.fetchLogs(date);
        }
      } catch (err) {
        showToast(err.message || "Failed to generate logs", "error");
      }
    },
    [showToast, state],
  );

  // 8. Bill lifecycle — used by the Lock / Unlock buttons on the Billing tab
  const lockBill = useCallback(
    async (billId) => {
      try {
        await callApi("lockBill", { billId });
        setBills((prev) =>
          prev.map((b) => (b.id === billId ? { ...b, locked: true } : b)),
        );
        showToast("Bill locked", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    },
    [setBills, showToast],
  );

  const unlockBill = useCallback(
    async (billId) => {
      try {
        await callApi("unlockBill", { billId });
        setBills((prev) =>
          prev.map((b) => (b.id === billId ? { ...b, locked: false } : b)),
        );
        showToast("Bill unlocked", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    },
    [setBills, showToast],
  );

  // 9. WhatsApp share — fetches the bill text and opens wa.me in a new tab.
  //    Falls back to a plain text message if getBillText fails so the link is
  //    always usable even when the network is flaky.
  const whatsapp = useCallback(
    async (phone, billId) => {
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
          // keep the fallback text — wa.me link still works
        }
      }
      const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
      // cspell:disable-next-line
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [showToast],
  );

  const addAdHocLog = useCallback(
    async (data) => {
      try {
        await callApi("addAdHocLog", {
          ...data,
          idempotencyKey: `adhoc-${Date.now()}`,
        });
        showToast("Extra delivery added", "success");
        if (closeModal) closeModal();
        if (state.fetchLogs) await state.fetchLogs(data.date);
      } catch (err) {
        showToast(err.message || "Failed to add extra delivery", "error");
      }
    },
    [showToast, closeModal, state],
  );

  const addCreditNote = useCallback(
    async (data) => {
      try {
        await callApi("addCreditNote", data);
        showToast("Credit note issued", "success");
        if (closeModal) closeModal();
        if (state.refresh) state.refresh();
      } catch (err) {
        showToast(err.message || "Failed to issue credit note", "error");
      }
    },
    [showToast, closeModal, state],
  );

  const fetchSubscriptionHistory = useCallback(
    async (subscriptionId) => {
      try {
        const res = await callApi("getSubscriptionHistory", { subscriptionId });
        return res.history || [];
      } catch (err) {
        showToast(err.message || "Failed to load history", "error");
        return [];
      }
    },
    [showToast],
  );

  return useMemo(
    () => ({
      ...customerHandlers,
      ...billingHandlers,
      ...importHandlers,
      ...deliveryHandlers,
      ...adminHandlers,
      saveCustomer,
      saveImport,
      savePause,
      saveBrand,
      lockBill,
      unlockBill,
      whatsapp,
      saveSubscription,
      generateDailyLogs,
      addAdHocLog,
      addCreditNote,
      fetchSubscriptionHistory,
    }),
    [
      customerHandlers,
      billingHandlers,
      importHandlers,
      deliveryHandlers,
      adminHandlers,
      saveCustomer,
      saveImport,
      savePause,
      saveBrand,
      lockBill,
      unlockBill,
      whatsapp,
      saveSubscription,
      generateDailyLogs,
      addAdHocLog,
      addCreditNote,
      fetchSubscriptionHistory,
    ],
  );
}
