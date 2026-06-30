import { useState, useEffect } from "react";
import {
  callApi,
  mapCustomerFromApi,
  mapBillFromApi,
  mapImportFromApi,
  mapLogFromApi,
  mapAdjustmentFromApi,
  mapPauseFromApi,
  mapBrandFromApi,
} from "../lib/api.js";
import { getToday } from "../lib/utils.js";

export function useEntityStore() {
  // 1. Initialize with empty arrays (Fixes fatal build error)
  const [customers, setCustomers] = useState([]);
  const [imports, setImports] = useState([]);
  const [bills, setBills] = useState([]);
  const [logs, setLogs] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [pauses, setPauses] = useState([]);
  const [brands, setBrands] = useState([]);

  // Helper to safely fetch data and return an empty array on failure.
  // This removes 7 try/catch blocks from the main function, dropping complexity.
  const safeFetch = async (action, payload, fallbackKey) => {
    try {
      const res = await callApi(action, payload);
      return res[fallbackKey] || [];
    } catch {
      return [];
    }
  };

  // 2. Fetch real data from backend on mount
  useEffect(() => {
    const fetchData = async () => {
      const [custs, bils, imps, lgs, adjs, paus, brnds] = await Promise.all([
        safeFetch("getCustomers", {}, "customers"),
        safeFetch("getBills", {}, "bills"),
        safeFetch("getMilkImports", {}, "imports"),
        safeFetch("getDailyLogs", { date: getToday() }, "logs"),
        safeFetch("getAdjustments", {}, "adjustments"),
        safeFetch("getPauses", {}, "pauses"),
        safeFetch("getBrands", {}, "brands"),
      ]);

      // 3. Map backend responses to frontend format
      setCustomers(custs.map(mapCustomerFromApi));
      setBills(bils.map(mapBillFromApi));
      setImports(imps.map(mapImportFromApi));
      setLogs(lgs.map(mapLogFromApi));
      setAdjustments(adjs.map(mapAdjustmentFromApi));
      setPauses(paus.map(mapPauseFromApi));
      setBrands(brnds.map(mapBrandFromApi));
    };

    fetchData();
  }, []);

  // Fix Gap 1: Expose a function to re-fetch logs when the user changes the date in the Delivery tab
  const fetchLogs = async (date) => {
    try {
      const res = await callApi("getDailyLogs", { date });
      setLogs((res.logs || []).map(mapLogFromApi));
    } catch (err) {
      console.error("Failed to fetch logs for date:", date, err);
      setLogs([]);
    }
  };

  // Note: 'queue' and 'setQueue' have been completely removed (Phase 3 Dead Code Cleanup)
  return {
    customers,
    setCustomers,
    imports,
    setImports,
    bills,
    setBills,
    logs,
    setLogs,
    adjustments,
    setAdjustments,
    pauses,
    setPauses,
    brands,
    setBrands,
    fetchLogs, // Exposed for the Delivery tab date picker
  };
}

export function useFilterState() {
  const [custSearch, setCustSearch] = useState("");
  const [custFilter, setCustFilter] = useState("All");
  const [impFilter, setImpFilter] = useState({
    month: "",
    brand: "",
    status: "",
  });
  const [billFilter, setBillFilter] = useState("All");
  const [diagRan, setDiagRan] = useState(false);

  return {
    custSearch,
    setCustSearch,
    custFilter,
    setCustFilter,
    impFilter,
    setImpFilter,
    billFilter,
    setBillFilter,
    diagRan,
    setDiagRan,
  };
}
