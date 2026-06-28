import { RATE_BY_PRODUCT } from "./constants.js";
import { uuid, monthLabel, daysInMonth } from "./utils.js";

function countScheduledDays(customer, billMonth, totalDaysInMonth) {
  let scheduledDays = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${billMonth}-${String(d).padStart(2, "0")}`;
    const dow = new Date(dateStr).getDay();
    if (customer.deliveryDays?.includes(dow)) scheduledDays++;
  }
  return scheduledDays;
}

function billDueDate(billMonth) {
  const [y, m] = billMonth.split("-").map(Number);
  const dueY = m === 12 ? y + 1 : y;
  const dueM = m === 12 ? 1 : m + 1;
  return `${dueY}-${String(dueM).padStart(2, "0")}-05`;
}

function buildBillForCustomer(customer, billMonth, label, totalDaysInMonth) {
  const scheduledDays = countScheduledDays(customer, billMonth, totalDaysInMonth);
  const rate = RATE_BY_PRODUCT[customer.product] || 32;
  const amount = Math.round(customer.qty * rate * scheduledDays);
  return {
    id: "BL" + uuid(),
    custId: customer.id,
    customer: customer.name,
    month: label,
    amount,
    paid: 0,
    status: "Unpaid",
    due: billDueDate(billMonth),
    locked: false,
  };
}

/** Returns new bills to append, or null when every active customer already has one. */
export function generateBillsForMonth(activeCustomers, bills, billMonth) {
  const label = monthLabel(billMonth);
  const totalDaysInMonth = daysInMonth(billMonth);
  const existing = new Set(bills.map(b => `${b.custId}-${b.month}`));

  const newBills = activeCustomers
    .filter(c => !existing.has(`${c.id}-${label}`))
    .map(c => buildBillForCustomer(c, billMonth, label, totalDaysInMonth));

  if (newBills.length === 0) return null;
  return { label, newBills };
}

export function applyPayment(bill, payAmt) {
  const np = Math.min(bill.paid + payAmt, bill.amount);
  return { ...bill, paid: np, status: np >= bill.amount ? "Paid" : "Partial" };
}
