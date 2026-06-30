import { useMemo } from "react";

import { filterCustomers, filterImports, filterBills } from "../lib/filters.js";

export function useAppDerived({
  customers,
  imports,
  bills,
  logs,
  brands,
  logDate,
  custSearch,
  custFilter,
  impFilter,
  billFilter,
}) {
  const activeC = useMemo(
    () => customers.filter((c) => c.status === "Active"),
    [customers],
  );
  const totalRevenue = useMemo(
    () =>
      bills.filter((b) => b.status === "Paid").reduce((s, b) => s + b.paid, 0),
    [bills],
  );
  const pendingDues = useMemo(
    () =>
      bills
        .filter((b) => b.status !== "Paid")
        .reduce((s, b) => s + (b.amount - b.paid), 0),
    [bills],
  );
  const confirmedStock = useMemo(
    () =>
      imports
        .filter((i) => i.status === "Confirmed")
        .reduce((s, i) => s + i.qty, 0),
    [imports],
  );
  const todayLogs = useMemo(
    () => logs.filter((l) => l.date === logDate),
    [logs, logDate],
  );
  const filteredC = useMemo(
    () => filterCustomers(customers, custSearch, custFilter),
    [customers, custSearch, custFilter],
  );
  const filteredI = useMemo(
    () => filterImports(imports, impFilter),
    [imports, impFilter],
  );
  const filteredB = useMemo(
    () => filterBills(bills, billFilter),
    [bills, billFilter],
  );
  const activeBrandsCount = useMemo(
    () => brands.filter((b) => b.status === "Active").length,
    [brands],
  );

  return {
    activeC,
    totalRevenue,
    pendingDues,
    confirmedStock,
    todayLogs,
    filteredC,
    filteredI,
    filteredB,
    activeBrandsCount,
  };
}
