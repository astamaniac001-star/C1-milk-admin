// ── seed.js ──────────────────────────────────────────────────────────────────
// Demo seed data + the initial write-queue snapshot. Loaded once on app mount.
// Real app would replace this with an API/fetch call.

import { uuid, daysInMonth } from "../lib/utils.js";

export const seedCustomers = [];


export const seedImports = [];
  

export const seedBills = [];

// Build the Jan 2025 daily delivery log deterministically from the customer list.
// Active customers get one log row per delivery-day they have configured.
const buildLogs = () => {
  const logs = [];
  const active = seedCustomers.filter(c => c.status === "Active");
  const total = daysInMonth("2025-01");
  for (let d = 1; d <= total; d++) {
    const dateStr = `2025-01-${String(d).padStart(2,"0")}`;
    const dow = new Date(dateStr).getDay();
    active.forEach(c => {
      if (!c.deliveryDays.includes(dow)) return;
      logs.push({ id: uuid(), custId: c.id, customer: c.name, date: dateStr, product: c.product, qty: c.qty, delivered: true, note:"" });
    });
  }
  return logs;
};

export const seedLogs = buildLogs();

export const seedAdjustments = [];


export const seedPauses = [];

export const seedBrands = [];

export const seedQueue = [];