// ── seed.js ──────────────────────────────────────────────────────────────────
// Demo seed data + the initial write-queue snapshot. Loaded once on app mount.
// Real app would replace this with an API/fetch call.

import { uuid, daysInMonth } from "../lib/utils.js";

export const seedCustomers = [
  { id:"C001", name:"Ramesh Sharma",    address:"14, Shivaji Nagar",  phone:"9876543210", status:"Active",   product:"Full Cream",   qty:2,   deliveryDays:[1,2,3,4,5,6,0], balance:-320 },
  { id:"C002", name:"Priya Mehta",      address:"7B, Patel Colony",   phone:"9988776655", status:"Active",   product:"Toned",         qty:1,   deliveryDays:[1,2,3,4,5,6,0], balance:-960 },
  { id:"C003", name:"Suresh Patel",     address:"3, Gandhi Road",     phone:"9012345678", status:"Paused",   product:"Double Toned",  qty:1.5, deliveryDays:[1,2,3,4,5],     balance:0 },
  { id:"C004", name:"Anita Desai",      address:"22, MG Colony",      phone:"8765432109", status:"Active",   product:"Full Cream",    qty:2,   deliveryDays:[1,2,3,4,5,6,0], balance:-2160 },
  { id:"C005", name:"Vijay Kumar",      address:"9, Nehru Street",    phone:"7654321098", status:"Active",   product:"Toned",         qty:1,   deliveryDays:[1,2,3,4,5,6,0], balance:0 },
  { id:"C006", name:"Kavita Joshi",     address:"5, Tilak Nagar",     phone:"9123456780", status:"Inactive", product:"Full Cream",    qty:0,   deliveryDays:[],               balance:0 },
  { id:"C007", name:"Deepak Agarwal",   address:"11, Civil Lines",    phone:"9871234560", status:"Active",   product:"Toned",         qty:1.5, deliveryDays:[1,2,3,4,5,6,0], balance:-1440 },
  { id:"C008", name:"Sunita Yadav",     address:"33, Rajiv Nagar",    phone:"9090909090", status:"Active",   product:"Full Cream",    qty:1,   deliveryDays:[1,2,3,4,5,6,0], balance:-960 },
];

export const seedImports = [
  { id:"IMP001", date:"2025-01-18", brand:"Amul",         type:"Full Cream",   qty:120, rate:36,   total:4320, invoice:"INV-2025-001", status:"Confirmed", version:1 },
  { id:"IMP002", date:"2025-01-17", brand:"Mother Dairy", type:"Toned",        qty:80,  rate:32,   total:2560, invoice:"INV-2025-002", status:"Confirmed", version:1 },
  { id:"IMP003", date:"2025-01-16", brand:"Amul",         type:"Double Toned", qty:60,  rate:30,   total:1800, invoice:"",            status:"Draft",     version:1 },
  { id:"IMP004", date:"2025-01-15", brand:"Nandini",      type:"Full Cream",   qty:100, rate:35,   total:3500, invoice:"INV-2025-004", status:"Confirmed", version:1 },
  { id:"IMP005", date:"2025-01-10", brand:"Mother Dairy", type:"Toned",        qty:90,  rate:31.5, total:2835, invoice:"INV-2025-005", status:"Confirmed", version:1 },
];

export const seedBills = [
  { id:"BL001", custId:"C001", customer:"Ramesh Sharma",  month:"Jan 2025", amount:2160, paid:2160, status:"Paid",    due:"2025-02-05", locked:false },
  { id:"BL002", custId:"C002", customer:"Priya Mehta",    month:"Jan 2025", amount:960,  paid:0,    status:"Unpaid",  due:"2025-02-05", locked:false },
  { id:"BL003", custId:"C003", customer:"Suresh Patel",   month:"Dec 2024", amount:1440, paid:1000, status:"Partial", due:"2025-01-05", locked:false },
  { id:"BL004", custId:"C004", customer:"Anita Desai",    month:"Jan 2025", amount:2160, paid:0,    status:"Unpaid",  due:"2025-02-05", locked:false },
  { id:"BL005", custId:"C005", customer:"Vijay Kumar",    month:"Jan 2025", amount:960,  paid:960,  status:"Paid",    due:"2025-02-05", locked:true  },
  { id:"BL006", custId:"C007", customer:"Deepak Agarwal", month:"Jan 2025", amount:1440, paid:0,    status:"Unpaid",  due:"2025-02-05", locked:false },
  { id:"BL007", custId:"C008", customer:"Sunita Yadav",   month:"Jan 2025", amount:960,  paid:500,  status:"Partial", due:"2025-02-05", locked:false },
];

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

export const seedAdjustments = [
  { id:"ADJ001", custId:"C001", customer:"Ramesh Sharma", date:"2025-01-05", amount:-50,  reason:"Half delivery",   applied:true  },
  { id:"ADJ002", custId:"C002", customer:"Priya Mehta",   date:"2025-01-12", amount:100,  reason:"Extra delivery",  applied:false },
  { id:"ADJ003", custId:"C004", customer:"Anita Desai",   date:"2025-01-08", amount:-30,  reason:"Quality issue",   applied:false },
];

export const seedPauses = [
  { id:"P001", custId:"C003", customer:"Suresh Patel", startDate:"2025-01-10", endDate:"2025-01-25", reason:"Out of town" },
];

export const seedBrands = [
  { id:"BR001", name:"Amul",         supplier:"Amul Dairy",        phone:"9000000001", status:"Active" },
  { id:"BR002", name:"Mother Dairy", supplier:"Mother Dairy India", phone:"9000000002", status:"Active" },
  { id:"BR003", name:"Nandini",      supplier:"KMF",               phone:"9000000003", status:"Active" },
  { id:"BR004", name:"Parag",        supplier:"Parag Milk Foods",  phone:"9000000004", status:"Inactive" },
];

export const seedQueue = [
  { key:"payment:BL002",      action:"recordPayment", status:"pending", retries:0 },
  { key:"cust-upd:C003",      action:"updateCustomer",status:"failed",  retries:2 },
  { key:"adj:C004:2025-01-10",action:"addAdjustment", status:"dead",    retries:5 },
];