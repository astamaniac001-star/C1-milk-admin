// ── ui.jsx ───────────────────────────────────────────────────────────────────
// Tiny stateless UI primitives. All inline-styled (matches the existing app).
// No state, no side effects — props in, JSX out.

import { BLUE, BLUE_L, SC } from "../lib/constants.js";

// Default inline input style. Spread `style` after the result if you need
// per-input overrides: <input style={{...IS(), ...override}} />
export const IS = (extra = {}) => ({
  width:"100%", padding:"8px 10px", border:"1px solid #d1d5db", borderRadius:8,
  fontSize:13, boxSizing:"border-box", color:"#111", background:"#fff", ...extra,
});

// Status pill. Looks up color in SC; falls back to neutral gray.
export function Badge({ label }) {
  const c = SC[label] || { bg:"#f3f4f6", tx:"#374151" };
  return (
    <span style={{ background:c.bg, color:c.tx, fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

// Bottom-fixed auto-dismissing notice. Caller drives lifecycle via `onClose`.
export function Toast({ msg, type, onClose }) {
  const bg = type==="success" ? "#166534" : type==="error" ? "#991b1b" : type==="warning" ? "#854d0e" : "#1e40af";
  return (
    <div style={{ position:"fixed", bottom:72, left:"50%", transform:"translateX(-50%)", background:bg, color:"#fff", padding:"10px 18px", borderRadius:10, fontSize:13, zIndex:9999, maxWidth:320, textAlign:"center" }}>
      {msg}
      <button onClick={onClose} style={{ marginLeft:8, background:"none", border:"none", color:"#fff", cursor:"pointer" }}>✕</button>
    </div>
  );
}

// Bottom-sheet modal shell. Title bar + scrollable body. `wide` bumps maxWidth.
export function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:800, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#fff", width:"100%", maxWidth: wide ? 460 : 420, maxHeight:"88vh", overflowY:"auto", borderRadius:"16px 16px 0 0", padding:20, boxSizing:"border-box" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontWeight:600, fontSize:15, color:"#111" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#6b7280" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Themed button. `variant` selects the palette; small/full tweak size & width.
export function Btn({ onClick, children, variant="primary", small, full, disabled, style }) {
  const base = {
    primary:   { background:BLUE, color:"#fff", border:"none" },
    secondary: { background:"#f3f4f6", color:"#374151", border:"1px solid #d1d5db" },
    danger:    { background:"#fee2e2", color:"#991b1b", border:"1px solid #fca5a5" },
    success:   { background:"#dcfce7", color:"#166534", border:"1px solid #86efac" },
    ghost:     { background:"none", color:BLUE, border:"none" },
  }[variant];
  const disabledStyle = disabled ? { opacity:0.55, filter:"grayscale(20%)" } : {};
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        ...base, ...disabledStyle,
        padding: small ? "4px 10px" : "8px 14px",
        borderRadius: 8,
        fontSize: small ? 11 : 13,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        width: full ? "100%" : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Label + child wrapper for form rows.
export function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:12, color:"#6b7280", display:"block", marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}

// Plain bordered card. Override `style` for tinted variants.
export function Card({ children, style }) {
  return <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, padding:"12px 14px", marginBottom:10, ...style }}>{children}</div>;
}

// Section title bar with an optional right-aligned action node.
export function Section({ title, action }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
      <span style={{ fontWeight:600, fontSize:15, color:"#111" }}>{title}</span>
      {action || null}
    </div>
  );
}

// 2-column grid of stat tiles. Each tile: optional tinted bg, icon, label, value.
export function StatGrid({ items }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
      {items.map(i => (
        <div key={i.label} style={{ background:i.bg||BLUE_L, borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:i.tx||BLUE }}>{i.icon} {i.label}</div>
          <div style={{ fontSize:20, fontWeight:700, color:i.tx||BLUE, marginTop:2 }}>{i.value}</div>
        </div>
      ))}
    </div>
  );
}

// Empty-state placeholder.
export function Empty({ msg }) {
  return <div style={{ textAlign:"center", padding:"32px 0", color:"#9ca3af", fontSize:13 }}>{msg}</div>;
}

// Section header used inside a Card. Optional right-aligned action node.
export function CardHeader({ title, action }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
      <span style={{ fontWeight:600, fontSize:13, color:"#111" }}>{title}</span>
      {action}
    </div>
  );
}

// <option> list of active brands. Shared by the imports filter and addImport modal.
export function ActiveBrandOptions({ brands }) {
  return brands.filter(b => b.status === "Active").map(b => <option key={b.id}>{b.name}</option>);
}

// <option> list of active customers. Shared by the adjustment and pause modals.
export function ActiveCustomerOptions({ customers }) {
  return customers.filter(c => c.status === "Active").map(c => <option key={c.id} value={c.id}>{c.name}</option>);
}