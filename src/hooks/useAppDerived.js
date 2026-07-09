import { useMemo } from "react";
import { filterCustomers, filterImports, filterBills } from "../lib/filters.js";

export function useAppDerived(state) {
  // Destructure safely with fallbacks
  const { 
    customers = [], 
    imports = [], 
    bills = [], 
    brands = [], 
    custSearch, 
    custFilter, 
    impFilter, 
    billFilter 
  } = state;

  // useMemo is called directly at the top level of the custom hook
  return useMemo(() => {
    const activeC = customers.filter((c) => c.status === "Active");
    
    const totalRevenue = bills
      .filter((b) => b.status === "Paid" || b.status === "Partial")
      .reduce((sum, b) => sum + (b.paid || 0), 0);
      
    const pendingDues = bills
      .filter((b) => b.status !== "Paid")
      .reduce((sum, b) => sum + (b.amount - (b.paid || 0)), 0);

    const filteredC = filterCustomers(customers, custSearch, custFilter);
    const filteredI = filterImports(imports, impFilter);
    const filteredB = filterBills(bills, billFilter);
    
    const activeBrandsCount = brands.filter((b) => b.status === "Active").length;

    return { 
      activeC, 
      totalRevenue, 
      pendingDues, 
      filteredC, 
      filteredI, 
      filteredB, 
      activeBrandsCount 
    };
   }, [
    customers, imports, bills, brands, 
    custSearch, custFilter, impFilter, billFilter
  ]);
}