// src/hooks/useEntityStore.js
import { useState, useEffect } from "react";
import { callApi, mapCustomerFromApi } from "../lib/api.js";
import {
 seedCustomers, seedImports, seedBills, seedLogs,
 seedAdjustments, seedPauses, seedBrands, seedQueue,
} from "../data/seed.js";

export function useEntityStore() {
  const [customers, setCustomers] = useState([]); // Start empty, will be filled by API
  const [imports, setImports] = useState(seedImports);
  const [bills, setBills] = useState(seedBills);
  const [logs, setLogs] = useState(seedLogs);
  const [adjustments, setAdjustments] = useState(seedAdjustments);
  const [pauses, setPauses] = useState(seedPauses);
  const [brands, setBrands] = useState(seedBrands);
  const [queue, setQueue] = useState(seedQueue);

  // Fetch real customers from backend on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return; // Don't fetch if not logged in

    callApi("getCustomers", { limit: 200 })
      .then(data => {
        if (data.customers && data.customers.length > 0) {
          setCustomers(data.customers.map(mapCustomerFromApi));
        } else {
          setCustomers(seedCustomers); // Fallback to seed if backend is empty
        }
      })
      .catch(err => {
        console.error("Failed to fetch customers, using seed data", err);
        setCustomers(seedCustomers);
      });
  }, []);

  return {
    customers, setCustomers, imports, setImports, bills, setBills,
    logs, setLogs, adjustments, setAdjustments, pauses, setPauses,
    brands, setBrands, queue, setQueue,
  };
}