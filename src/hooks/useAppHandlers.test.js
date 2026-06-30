import { describe, it, expect, vi } from "vitest";
import { useAppHandlers } from "./useAppHandlers";

vi.mock("react", () => ({
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
  useState: (init) => [init, vi.fn()],
  useEffect: () => {},
}));

vi.mock("../lib/api.js", () => ({
  callApi: vi.fn().mockResolvedValue({
    success: true,
    data: { customer: { id: "C123" }, amountPaid: 100, status: "Paid" },
  }),
  mapCustomerToApi: (form) => form,
  mapImportToApi: (form) => form,
  mapPaymentToApi: (id, amt) => ({ billId: id, amountPaid: amt }),
  mapBillFromApi: (b) => b,
}));

function createMockHandlers(overrides = {}) {
  const defaults = {
    bills: [],
    setBills: vi.fn(),
    form: {},
    modal: {},
    toast$: vi.fn(),
    closeModal: vi.fn(),
    customers: [],
    setCustomers: vi.fn(),
    setImports: vi.fn(),
    setLogs: vi.fn(),
    setAdjustments: vi.fn(),
    setPauses: vi.fn(),
    setBrands: vi.fn(),
    setQueue: vi.fn(),
    today: "2025-01-15",
    billMonth: "2025-01",
    activeC: [],
  };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAppHandlers({ ...defaults, ...overrides });
}

describe("useAppHandlers - recordPayment", () => {
  it("validates payment amount and updates bill", async () => {
    const setBills = vi.fn();
    const toast$ = vi.fn();
    const closeModal = vi.fn();

    const handlers = createMockHandlers({
      bills: [{ id: "B1", paid: 0, amount: 200 }],
      setBills,
      form: { payAmt: "100", payMode: "Cash" },
      modal: { data: { id: "B1" } },
      toast$,
      closeModal,
    });

    await handlers.recordPayment();

    expect(setBills).toHaveBeenCalled();
    expect(toast$).toHaveBeenCalledWith("₹100 recorded", "success");
    expect(closeModal).toHaveBeenCalled();
  });

  it("rejects invalid payment amount", () => {
    const toast$ = vi.fn();

    const handlers = createMockHandlers({
      form: { payAmt: "0" },
      toast$,
    });

    handlers.recordPayment();

    expect(toast$).toHaveBeenCalledWith("Enter valid amount", "error");
  });
});

describe("useAppHandlers - saveAdjustment", () => {
  it("validates and creates adjustment", async () => {
    const setAdjustments = vi.fn();
    const toast$ = vi.fn();
    const closeModal = vi.fn();

    const handlers = createMockHandlers({
      setAdjustments,
      form: { custId: "C1", amount: "50", reason: "Quality issue" },
      customers: [{ id: "C1", name: "Ramesh" }],
      toast$,
      closeModal,
    });

    await handlers.saveAdjustment();

    expect(setAdjustments).toHaveBeenCalled();
    expect(toast$).toHaveBeenCalledWith("Added", "success");
    expect(closeModal).toHaveBeenCalled();
  });

  it("rejects incomplete adjustment data", () => {
    const toast$ = vi.fn();

    const handlers = createMockHandlers({
      form: { custId: "", amount: "", reason: "" },
      toast$,
    });

    handlers.saveAdjustment();

    expect(toast$).toHaveBeenCalledWith("Fill all fields", "error");
  });
});
