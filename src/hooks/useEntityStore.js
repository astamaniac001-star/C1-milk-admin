import { useState, useEffect, useCallback, useRef } from "react";
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

export function useEntityStore(_token) {
  // _token intentionally unused: kept in the signature to make the dependency
  // on auth explicit at the App.jsx layer; future code may want to scope the
  // fetch to the current session.
  // 1. Initialize with empty arrays (Fixes fatal build error)
  const [customers, setCustomers] = useState([]);
  const [imports, setImports] = useState([]);
  const [bills, setBills] = useState([]);
  const [logs, setLogs] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [pauses, setPauses] = useState([]);
  const [brands, setBrands] = useState([]);

  // Tracks which fetches failed so we can surface a single "partial load"
  // hint instead of silently rendering empty arrays when the backend is down.
  const failedActionsRef = useRef(new Set());
  const failedActions = Array.from(failedActionsRef.current);

  // Helper to safely fetch data. On failure: log + record on failedActionsRef
  // + return empty array (still allows the rest of the dashboard to render).
  const safeFetch = useCallback(async (action, payload, fallbackKey) => {
    try {
      const res = await callApi(action, payload);
      return res[fallbackKey] || [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[useEntityStore] ${action} failed:`, err.message);
      failedActionsRef.current.add(action);
      return [];
    }
  }, []);

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
  }, [safeFetch]);

  // Fix Gap 1: Expose a function to re-fetch logs when the user changes the date in the Delivery tab.
  // useCallback (stable identity) so Delivery's useEffect doesn't re-fire on every render.
  // On failure: keep prior data and log — don't wipe the user's view on a transient blip.
  const fetchLogs = useCallback(async (date) => {
    try {
      const res = await callApi("getDailyLogs", { date });
      setLogs((res.logs || []).map(mapLogFromApi));
    } catch (err) {
      console.error("Failed to fetch logs for date:", date, err);
      // intentional: do not call setLogs here — the previous logs remain visible.
    }
  }, []);

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
    loadErrors: failedActions, // Actions that failed on the last bulk fetch
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
