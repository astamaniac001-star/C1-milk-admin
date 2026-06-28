
// src/lib/api.js

// Map backend customer shape to frontend shape
export function mapCustomerFromApi(c) {
  return {
    id: c.customerId,
    name: c.name,
    address: c.deliveryAddress,
    phone: c.phone,
    status: c.status,
    product: c.product,
    qty: c.dailyQty,
    deliveryDays: c.deliveryDays,
    balance: c.balance,
    version: c.version, // Keep version for optimistic concurrency control
  };
}

// Map frontend customer shape to backend payload
export function mapCustomerToApi(form) {
  return {
    customerId: form.id || undefined, 
    expectedVersion: form.version, 
    name: form.name,
    deliveryAddress: form.address,
    phone: form.phone,
    product: form.product,
    dailyQty: form.qty,
    deliveryDays: form.deliveryDays,
    status: form.status,
    // Generate a unique key to prevent duplicate submissions if the user clicks Save twice
    idempotencyKey: form.id ? undefined : `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

export async function callApi(action, payload = {}) {
  const token = localStorage.getItem("token");
  const sessionSecret = localStorage.getItem("sessionSecret");

  const body = { action, payload };
  if (token) body.token = token;
  if (sessionSecret) body.sessionSecret = sessionSecret;

  try {
    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      console.error(`API Error [${action}]:`, result.error);
      throw new Error(result.error?.message || "Unknown API error");
    }
    
    return result.data;
  } catch (err) {
    console.error(`Network Error [${action}]:`, err);
    throw err;
  }
}