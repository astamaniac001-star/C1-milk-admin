import { cleanPhone, uuid } from "../utils.js";

export function validateCustomerForm(form) {
  if (!form.name?.trim()) return "Name is required";
  if (!form.address?.trim()) return "Address is required";
  if (form.phone && !/^\d{10}$/.test(cleanPhone(form.phone))) return "Enter valid 10-digit phone";
  return null;
}

export function buildNewCustomer(form) {
  return {
    ...form,
    id: "C" + uuid(),
    status: "Active",
    balance: 0,
    deliveryDays: [1, 2, 3, 4, 5, 6, 0],
    qty: parseFloat(form.qty) || 1,
    product: form.product || "Full Cream",
  };
}
