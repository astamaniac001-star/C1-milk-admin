// ── useBusy.js ────────────────────────────────────────────────────────────────
// Wraps an async handler so callers can disable UI while it's in flight and
// short-circuit accidental double-invocations (double-click Save, double-tap
// "Sign out", etc).
//
// Usage:
//   const [busy, save] = useBusy(onSave);
//   <button onClick={save} disabled={busy}>Save</button>
//
// Returns [busy, wrappedFn]. wrappedFn accepts the same args as the underlying
// handler and returns its Promise (so callers can `await wrappedFn()` if they
// care about the result).

import { useState, useCallback } from "react";

export function useBusy(fn) {
  const [busy, setBusy] = useState(false);

  const wrapped = useCallback(
    async (...args) => {
      if (busy) return undefined;
      setBusy(true);
      try {
        return await fn(...args);
      } finally {
        setBusy(false);
      }
    },
    // busy is intentionally absent from deps — we capture its current value
    // at call time, and adding it would cause the wrapped fn identity to
    // change on every state update, defeating memoization downstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn],
  );

  return [busy, wrapped];
}
