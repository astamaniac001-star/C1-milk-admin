// ── Dashboard.jsx ─────────────────────────────────────────────────────────────
// Home tab: KPI tiles + today's delivery snapshot + quick actions + queue
// status + recent bills.

import { fmt } from "../lib/utils.js";
import { BLUE, BLUE_L } from "../lib/constants.js";
import { Card, StatGrid, Btn, Badge } from "../components/ui.jsx";

const QUICK_ACTIONS = [
  { label:"Add Customer",   icon:"👤",  type:"addCustomer" },
  { label:"Add Import",     icon:"📦",  type:"addImport"   },
  { label:"Generate Bills", icon:"🧾",  action:"generate"   },
  { label:"Add Adjustment", icon:"⚖️",  type:"addAdj"      },
  { label:"Add Pause",      icon:"⏸️",  type:"addPause"    },
  { label:"Add Brand",      icon:"🏷️", type:"addBrand"    },
];

const QUEUE_STATS = [
  { label:"Pending", st:"pending", bg:"#dbeafe", tx:"#1e40af" },
  { label:"Failed",  st:"failed",  bg:"#fef9c3", tx:"#854d0e" },
  { label:"Dead",    st:"dead",    bg:"#fee2e2", tx:"#991b1b" },
];

export default function Dashboard({
  today, activeC, totalRevenue, pendingDues, confirmedStock, todayLogs,
  queue, bills, onSetTab, onOpenModal, onGenerateBill,
}) {
  const deadCount = queue.filter(q => q.status === "dead").length;

  return (
    <div>
      <StatGrid items={[
        { label:"Active Customers", value:activeC.length,      icon:"👥" },
        { label:"Stock Confirmed",  value:confirmedStock+" L", icon:"🥛" },
        { label:"Revenue Jan",      value:fmt(totalRevenue),   icon:"💰", bg:"#dcfce7", tx:"#166534" },
        { label:"Pending Dues",     value:fmt(pendingDues),    icon:"⏳", bg:"#fee2e2", tx:"#991b1b" },
      ]} />

      <Card>
        <div style={{ fontWeight:600, fontSize:13, color:"#111", marginBottom:10 }}>Today's Delivery — {today}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[
            { label:"Scheduled", value: todayLogs.length },
            { label:"Delivered", value: todayLogs.filter(l => l.delivered).length },
            { label:"Skipped",   value: todayLogs.filter(l => !l.delivered).length },
            { label:"Total (L)", value: todayLogs.filter(l => l.delivered).reduce((s,l) => s+l.qty, 0).toFixed(1) + " L" },
          ].map(x => (
            <div key={x.label} style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:20, fontWeight:700, color:"#111" }}>{x.value}</div>
              <div style={{ fontSize:11, color:"#6b7280" }}>{x.label}</div>
            </div>
          ))}
        </div>
        <Btn full onClick={() => onSetTab("delivery")} variant="secondary" style={{ marginTop:8 }}>View Delivery Log →</Btn>
      </Card>

      <Card>
        <div style={{ fontWeight:600, fontSize:13, color:"#111", marginBottom:10 }}>Quick Actions</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {QUICK_ACTIONS.map(q => (
            <button
              key={q.label}
              onClick={() => q.action === "generate" ? onGenerateBill() : onOpenModal(q.type)}
              style={{ background:BLUE_L, color:BLUE, border:"none", borderRadius:10, padding:"10px 8px", fontSize:12, fontWeight:500, cursor:"pointer", textAlign:"left" }}
            >
              <span style={{ fontSize:16 }}>{q.icon}</span><br />{q.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight:600, fontSize:13, color:"#111", marginBottom:10 }}>Write Queue (demo only)</div>
        <div style={{ display:"flex", gap:8, marginBottom: deadCount > 0 ? 10 : 0 }}>
          {QUEUE_STATS.map(s => (
            <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:8, padding:"8px 0", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color:s.tx }}>{queue.filter(q => q.status === s.st).length}</div>
              <div style={{ fontSize:11, color:s.tx }}>{s.label}</div>
            </div>
          ))}
        </div>
        {deadCount > 0 && (
          <div style={{ background:"#fee2e2", borderRadius:8, padding:"8px 10px", fontSize:12, color:"#991b1b", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>⚠ {deadCount} dead write(s)</span>
            <button onClick={() => onSetTab("more")} style={{ background:"none", border:"none", color:"#991b1b", fontWeight:600, cursor:"pointer", fontSize:12 }}>View →</button>
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontWeight:600, fontSize:13, color:"#111", marginBottom:8 }}>Recent Bills</div>
        {bills.slice(0, 3).map(b => (
          <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"0.5px solid #f3f4f6" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:"#111" }}>{b.customer}</div>
              <div style={{ fontSize:11, color:"#6b7280" }}>{b.month}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#111" }}>{fmt(b.amount)}</div>
              <Badge label={b.status} />
            </div>
          </div>
        ))}
        <button onClick={() => onSetTab("billing")} style={{ background:"none", border:"none", color:BLUE, fontSize:12, cursor:"pointer", marginTop:8, padding:0 }}>View all bills →</button>
      </Card>
    </div>
  );
}