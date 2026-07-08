import { useState, useRef, useCallback } from "react";

export function useBusy(asyncFn) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // Synchronous guard

  const wrapped = useCallback(async (...args) => {
    if (busyRef.current) return; // Prevents double-tap
    busyRef.current = true;
    setBusy(true);
    try {
      await asyncFn(...args);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [asyncFn]);

  return [busy, wrapped];
}