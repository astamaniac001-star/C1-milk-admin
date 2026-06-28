import { useState } from "react";

import {
  seedCustomers, seedImports, seedBills, seedLogs,
  seedAdjustments, seedPauses, seedBrands, seedQueue,
} from "../data/seed.js";

export function useEntityStore() {
  const [customers, setCustomers] = useState(seedCustomers);
  const [imports, setImports] = useState(seedImports);
  const [bills, setBills] = useState(seedBills);
  const [logs, setLogs] = useState(seedLogs);
  const [adjustments, setAdjustments] = useState(seedAdjustments);
  const [pauses, setPauses] = useState(seedPauses);
  const [brands, setBrands] = useState(seedBrands);
  const [queue, setQueue] = useState(seedQueue);

  return {
    customers, setCustomers, imports, setImports, bills, setBills,
    logs, setLogs, adjustments, setAdjustments, pauses, setPauses,
    brands, setBrands, queue, setQueue,
  };
}

export function useFilterState() {
  const [custSearch, setCustSearch] = useState("");
  const [custFilter, setCustFilter] = useState("All");
  const [impFilter, setImpFilter] = useState({ month: "", brand: "", status: "" });
  const [billFilter, setBillFilter] = useState("All");
  const [diagRan, setDiagRan] = useState(false);

  return {
    custSearch, setCustSearch, custFilter, setCustFilter,
    impFilter, setImpFilter, billFilter, setBillFilter,
    diagRan, setDiagRan,
  };
}
