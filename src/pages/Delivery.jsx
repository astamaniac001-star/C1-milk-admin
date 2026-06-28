// ── Delivery.jsx ──────────────────────────────────────────────────────────────
// Daily Delivery tab: pick a date, see scheduled + done counts, toggle each
// entry's delivered/skipped state.

import { Card, Field, IS, Section, StatGrid, Empty, Badge } from "../components/ui.jsx";

function calculateDeliveryStats(todayLogs) {
  const delivered = todayLogs.filter(l => l.delivered);
  return {
    scheduled: todayLogs.length,
    deliveredCount: delivered.length,
    skippedCount: todayLogs.filter(l => !l.delivered).length,
    totalLiters: delivered.reduce((s, l) => s + l.qty, 0).toFixed(1) + " L",
  };
}

function getToggleButtonStyle(delivered) {
  return {
    background: delivered ? "#dcfce7" : "#fee2e2",
    border: "none",
    borderRadius: 8,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    color: delivered ? "#166534" : "#991b1b",
  };
}

function getToggleButtonText(delivered) {
  return delivered ? "✓ Done" : "✗ Skip";
}

export default function Delivery({ logDate, onLogDateChange, todayLogs, onToggleLog }) {
  const stats = calculateDeliveryStats(todayLogs);

  return (
    <div>
      <Section title="Daily Delivery Log" />
      <Field label="Select Date">
        <input type="date" value={logDate} onChange={e => onLogDateChange(e.target.value)} style={IS()} />
      </Field>
      <StatGrid items={[
        { label:"Scheduled", value:stats.scheduled,   icon:"📋" },
        { label:"Delivered", value:stats.deliveredCount, icon:"✅", bg:"#dcfce7", tx:"#166534" },
        { label:"Skipped",   value:stats.skippedCount,     icon:"⏭️", bg:"#fee2e2", tx:"#991b1b" },
        { label:"Qty (L)",   value:stats.totalLiters,      icon:"🥛" },
      ]} />
      {todayLogs.length === 0 ? <Empty msg="No deliveries scheduled for this date" /> : todayLogs.map(l => (
        <Card key={l.id}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:600, fontSize:13, color:"#111" }}>{l.customer}</div>
              <div style={{ fontSize:12, color:"#6b7280" }}>{l.product} · {l.qty}L</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Badge label={l.delivered ? "Delivered" : "Skipped"} />
              <button
                onClick={() => onToggleLog(l.id)}
                style={getToggleButtonStyle(l.delivered)}
              >
                {getToggleButtonText(l.delivered)}
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}