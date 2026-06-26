// ── More.jsx ──────────────────────────────────────────────────────────────────
// "More" tab: Adjustments / Pause Periods / Write Queue / Diagnostics V17 /
// System Health. A grab-bag of admin tools that don't deserve their own tab.

import { fmt } from "../lib/utils.js";
import { MILK_TYPES } from "../lib/constants.js";
import { Card, Btn, Section, Empty, Badge, CardHeader } from "../components/ui.jsx";

const DIAGNOSTICS = [
  ["✅","Missing sheets","OK"],
  ["✅","ShortCode duplicates","OK"],
  ["✅","Duplicate addresses","OK"],
  ["✅","DailyLogsIndex","OK"],
  ["⚠️","Stale bill flags","2 found"],
  ["✅","Unapplied adjustments >60d","OK"],
  ["✅","Untested actions","71/71"],
  ["✅","AmountPaid drift","OK"],
  ["✅","Schema version","V17"],
  ["✅","PINSalt configured","OK"],
  ["⚠️","SystemState rows","512 — high"],
  ["✅","PINRate_ key count","<50"],
  ["✅","Daily execution count","<150"],
  ["✅","Failed batch flags","None"],
  ["✅","Products price history","OK"],
  ["✅","sessionSecret active","Yes"],
  ["✅","Milk import sheets","Present"],
  ["✅","MilkTypes seeded", ""],   // resolved at render time
  ["✅","MilkBrands seeded", ""],  // resolved at render time
];

const HEALTH = [
  { label:"Schema Version", value:"V17", ok:true },
  { label:"API Version",    value:"17",  ok:true },
  { label:"Migration",      value:"Not needed", ok:true },
  { label:"Mode",           value:"Frontend demo (no backend connected)", ok:true },
];

export default function More({
  adjustments, pauses, queue, brands, diagRan, activeBrandsCount,
  onOpenModal, onApplyAdj, onRetry, onDismiss, onRunDiag, onHealthCheck,
}) {
  const diagnostics = DIAGNOSTICS.map(([icon, label, val]) => {
    if (label === "MilkTypes seeded") return [icon, label, MILK_TYPES.length + " total"];
    if (label === "MilkBrands seeded") return [icon, label, activeBrandsCount + " active / " + brands.length + " total"];
    return [icon, label, val];
  });

  return (
    <div>
      <Section title="More" />

      <Card>
        <CardHeader title="Adjustments" action={<Btn small onClick={() => onOpenModal("addAdj")}>+ Add</Btn>} />
        {adjustments.length === 0 ? <Empty msg="No adjustments" /> : adjustments.map(a => (
          <div key={a.id} style={{ padding:"8px 0", borderBottom:"0.5px solid #f3f4f6" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:"#111" }}>{a.customer}</div>
                <div style={{ fontSize:12, color:"#6b7280" }}>{a.date} · {a.reason}</div>
                <div style={{ fontSize:13, color: a.amount < 0 ? "#991b1b" : "#166534", fontWeight:600 }}>
                  {a.amount > 0 ? "+" : ""}{fmt(a.amount)}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                <Badge label={a.applied ? "Applied" : "Pending"} />
                {!a.applied && <Btn small variant="success" onClick={() => onApplyAdj(a.id)}>Apply</Btn>}
              </div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <CardHeader title="Pause Periods" action={<Btn small onClick={() => onOpenModal("addPause")}>+ Add</Btn>} />
        {pauses.length === 0 ? <Empty msg="No pause periods" /> : pauses.map(p => (
          <div key={p.id} style={{ padding:"8px 0", borderBottom:"0.5px solid #f3f4f6" }}>
            <div style={{ fontSize:13, fontWeight:500, color:"#111" }}>{p.customer}</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>{p.startDate} → {p.endDate}</div>
            {p.reason && <div style={{ fontSize:12, color:"#9ca3af" }}>{p.reason}</div>}
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontWeight:600, fontSize:13, color:"#111", marginBottom:4 }}>Write Queue</div>
        <div style={{ fontSize:11, color:"#9ca3af", marginBottom:10 }}>In-memory only in this demo — no IndexedDB, no auto-flush. Retry/Dismiss are simulated.</div>
        {queue.length === 0
          ? <div style={{ textAlign:"center", padding:"16px 0", color:"#6b7280", fontSize:13 }}>✅ All writes synced</div>
          : queue.map(q => (
            <div key={q.key} style={{ padding:"10px 0", borderBottom:"0.5px solid #f3f4f6" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:"#111" }}>{q.action}</div>
                  <div style={{ fontSize:11, color:"#9ca3af", fontFamily:"monospace" }}>{q.key}</div>
                  <div style={{ fontSize:11, color:"#6b7280" }}>Retries: {q.retries}</div>
                </div>
                <Badge label={q.status} />
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                <Btn small onClick={() => onRetry(q.key)}>Retry</Btn>
                <Btn small variant="danger" onClick={() => onDismiss(q.key)}>Dismiss</Btn>
              </div>
            </div>
          ))
        }
      </Card>

      <Card>
        <CardHeader title="Diagnostics V17" action={<Btn small onClick={onRunDiag}>Run</Btn>} />
        {!diagRan
          ? <div style={{ fontSize:12, color:"#9ca3af", textAlign:"center", padding:"12px 0" }}>Tap Run to check diagnostic items</div>
          : diagnostics.map(([icon, label, val]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"0.5px solid #f3f4f6", fontSize:12 }}>
              <span>{icon} {label}</span>
              <span style={{ color: icon === "✅" ? "#166534" : "#854d0e", fontWeight:500 }}>{val}</span>
            </div>
          ))
        }
      </Card>

      <Card>
        <div style={{ fontWeight:600, fontSize:13, color:"#111", marginBottom:8 }}>System Health</div>
        {HEALTH.map(x => (
          <div key={x.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"0.5px solid #f3f4f6", fontSize:12 }}>
            <span style={{ color:"#6b7280" }}>{x.label}</span>
            <span style={{ color: x.ok ? "#166534" : "#991b1b", fontWeight:500 }}>{x.value}</span>
          </div>
        ))}
        <Btn full variant="secondary" style={{ marginTop:10 }} onClick={onHealthCheck}>Run Health Check</Btn>
      </Card>
    </div>
  );
}