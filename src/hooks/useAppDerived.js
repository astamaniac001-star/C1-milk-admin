// src/hooks/useAppDerived.js
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
 const activeC = customers.filter((c) => c.status === "Active");
 const totalRevenue = bills
  .filter((b) => b.status === "Paid")
  .reduce((s, b) => s + b.paid, 0);
 const pendingDues = bills
  .filter((b) => b.status !== "Paid")
  .reduce((s, b) => s + (b.amount - b.paid), 0);
 const confirmedStock = imports
  .filter((i) => i.status === "Confirmed")
  .reduce((s, i) => s + i.qty, 0);
 const todayLogs = logs.filter((l) => l.date === logDate);
 const filteredC = filterCustomers(customers, custSearch, custFilter);
 const filteredI = filterImports(imports, impFilter);
 const filteredB = filterBills(bills, billFilter);
 const activeBrandsCount = brands.filter((b) => b.status === "Active").length;

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