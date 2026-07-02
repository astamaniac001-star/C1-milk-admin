// src/components/Login.jsx
import { useState, useRef, useEffect } from "react";

const PIN_RE = /^\d{4}$/;

// fallow-ignore-next-line complexity
export function Login({ onLogin, loading, error }) {
  const [pin, setPin] = useState("");
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  // Track previous error to clear state during render (avoids setState in useEffect)
  const [prevError, setPrevError] = useState(error);
  if (error !== prevError) {
    setPrevError(error);
    if (error) {
      setPin("");
      setLocalError(null);
    }
  }

  // DOM side-effects (like focusing) stay in useEffect
  useEffect(() => {
    if (error) {
      inputRef.current?.focus();
    }
  }, [error]);

  const handleChange = (e) => {
    // Strip non-digits as the user types — defense in depth against paste
    // attacks, and prevents the user accidentally submitting letters.
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    if (localError) setLocalError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    if (!PIN_RE.test(pin)) {
      setLocalError("PIN must be exactly 4 digits");
      inputRef.current?.focus();
      return;
    }
    onLogin(pin);
  };

  const displayError = localError || error;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        fontFamily: "sans-serif",
        padding: 16,
      }}
    >
      <h2 style={{ margin: 0 }}>Milk Delivery Admin</h2>
      <p style={{ color: "#6b7280", margin: "8px 0 20px" }}>
        Enter your 4-digit PIN to continue.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "240px",
        }}
        noValidate
      >
        <label htmlFor="pin-input" style={{ fontSize: 12, color: "#6b7280" }}>
          PIN
        </label>
        <input
          id="pin-input"
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{4}"
          maxLength="4"
          value={pin}
          onChange={handleChange}
          placeholder="••••"
          aria-invalid={displayError ? "true" : "false"}
          aria-describedby={displayError ? "pin-error" : undefined}
          style={{
            padding: "10px",
            fontSize: "24px",
            textAlign: "center",
            letterSpacing: "10px",
            border: displayError ? "1px solid #ef4444" : "1px solid #d1d5db",
            borderRadius: 8,
          }}
          autoFocus
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !PIN_RE.test(pin)}
          style={{
            padding: "10px",
            fontSize: "16px",
            cursor: loading || !PIN_RE.test(pin) ? "not-allowed" : "pointer",
            opacity: loading || !PIN_RE.test(pin) ? 0.6 : 1,
          }}
        >
          {loading ? "Verifying…" : "Login"}
        </button>
        {displayError && (
          <p
            id="pin-error"
            role="alert"
            style={{ color: "#b91c1c", textAlign: "center", margin: 0 }}
          >
            {displayError}
          </p>
        )}
      </form>
    </div>
  );
}
