// Pure list filters — no React, easy to test in isolation.

export function filterCustomers(customers, search, statusFilter) {
  const q = search.toLowerCase();
  return customers.filter((c) => {
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.phone.includes(q);
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}

export function filterImports(imports, { month, brand, status }) {
  return imports.filter(
    (i) =>
      (!brand || i.brand === brand) &&
      (!status || i.status === status) &&
      (!month || i.date.startsWith(month)),
  );
}

export function filterBills(bills, billFilter) {
  return billFilter === "All"
    ? bills
    : bills.filter((b) => b.status === billFilter);
}
