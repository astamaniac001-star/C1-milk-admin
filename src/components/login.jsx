// src/components/Login.jsx
import { useState } from "react";

export function Login({ onLogin, loading, error }) {
  const [pin, setPin] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length === 4) {
      onLogin(pin);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        fontFamily: "sans-serif",
      }}
    >
      <h2>Milk Delivery Admin</h2>
      <p>Please enter your 4-digit PIN to continue.</p>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "200px",
        }}
      >
        <input
          type="password"
          maxLength="4"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="****"
          style={{
            padding: "10px",
            fontSize: "24px",
            textAlign: "center",
            letterSpacing: "10px",
          }}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || pin.length !== 4}
          style={{ padding: "10px", fontSize: "16px", cursor: "pointer" }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      </form>
    </div>
  );
}
