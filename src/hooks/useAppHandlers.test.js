import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppHandlers } from "./useAppHandlers.js";

const mockUseCallback = vi.fn((fn) => fn);
const mockUseMemo = vi.fn((fn) => fn());

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return { ...actual, useCallback: (...args) => mockUseCallback(...args), useMemo: (...args) => mockUseMemo(...args) };
});

// Mock the dependencies
vi.mock("../lib/utils.js", () => ({
  fmt: (v) => `₹${v}`,
  uuid: () => "test-uuid",
  cleanPhone: (p) => p.replace(/\D/g, ""),
  monthLabel: (m) => m,
}));

vi.mock("../lib/billing.js", () => ({
  applyPayment: (bill, amt) => ({ ...bill, paid: bill.paid + amt }),
  generateBillsForMonth: () => ({ newBills: [], label: "Test" }),
}));

vi.mock("../lib/validation.js", () => ({
  validateCustomerForm: () => null,
  buildNewCustomer: (f) => ({ ...f, id: "C123", status: "Active" }),
  validateImportForm: () => null,
  parseImportValues: (f) => ({ qty: f.qty, rate: f.rate, total: f.qty * f.rate }),
  parseOptionalRate: (r) => r ? parseFloat(r) : null,
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
  return useAppHandlers({ ...defaults, ...overrides });
}

beforeEach(() => {
  mockUseCallback.mockClear();
  mockUseMemo.mockClear();
});

describe("useAppHandlers - recordPayment", () => {
  it("validates payment amount and updates bill", () => {
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

    handlers.recordPayment();

    expect(setBills).toHaveBeenCalled();
    expect(toast$).toHaveBeenCalledWith("₹100 via Cash recorded", "success");
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
  it("validates and creates adjustment", () => {
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

    handlers.saveAdjustment();

    expect(setAdjustments).toHaveBeenCalled();
    expect(toast$).toHaveBeenCalledWith("Adjustment added", "success");
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
