// ── Billing.jsx ───────────────────────────────────────────────────────────────
// Billing tab: month picker + generate + filter chips + KPI tiles + bill cards.

import { fmt } from "../lib/utils.js";
import { BLUE } from "../lib/constants.js";
import { Card, Btn, Field, IS, Section, StatGrid, Empty, Badge } from "../components/ui.jsx";

const STATUS_FILTERS = ["All","Unpaid","Partial","Paid"];

export default function Billing({
  bills, filtered, billFilter, billMonth, pendingDues, customers,
  onBillFilterChange, onBillMonthChange,
  onGenerateBill, onOpenModal, onLock, onUnlock, onWhatsapp,
}) {
  return (
    <div>
      <Section title="Billing" action={
        <div style={{ display:"flex", gap:6 }}>
          <Btn small variant="secondary" onClick={onGenerateBill}>Generate</Btn>
        </div>
      } />
      <Field label="Bill Month (for Generate)">
        <input type="month" value={billMonth} onChange={e => onBillMonthChange(e.target.value)} style={IS()} />
      </Field>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => onBillFilterChange(s)}
            style={{
              flex:1, padding:"6px 0", fontSize:11, fontWeight:500,
              border:"0.5px solid #e5e7eb", borderRadius:8, cursor:"pointer",
              background: billFilter === s ? BLUE : "#fff",
              color: billFilter === s ? "#fff" : "#374151",
            }}
          >{s}</button>
        ))}
      </div>
      <StatGrid items={[
        { label:"Total Billed", value:fmt(bills.reduce((s,b) => s+b.amount, 0)), icon:"🧾" },
        { label:"Collected",    value:fmt(bills.reduce((s,b) => s+b.paid,   0)), icon:"✅", bg:"#dcfce7", tx:"#166534" },
        { label:"Pending",      value:fmt(pendingDues),                          icon:"⏳", bg:"#fee2e2", tx:"#991b1b" },
        { label:"Bills",        value:bills.length,                              icon:"📄" },
      ]} />
      {filtered.length === 0 ? <Empty msg="No bills match filter" /> : filtered.map(b => (
        <Card key={b.id}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:"#111" }}>{b.customer}</div>
              <div style={{ fontSize:12, color:"#6b7280" }}>{b.month} · Due {b.due}</div>
              <div style={{ fontSize:13, color:"#374151", marginTop:4 }}>
                {fmt(b.paid)} / {fmt(b.amount)}
              </div>
              {b.status !== "Paid" && <div style={{ fontSize:12, color:"#991b1b" }}>Pending: {fmt(b.amount - b.paid)}</div>}
              {b.locked && <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>🔒 Locked</div>}
            </div>
            <Badge label={b.status} />
          </div>
          <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
            {!b.locked && b.status !== "Paid" && <Btn small onClick={() => onOpenModal("payment", b)}>Record Payment</Btn>}
            {!b.locked && b.status === "Paid" && <Btn small variant="secondary" onClick={() => onLock(b.id)}>🔒 Lock</Btn>}
            {b.locked && <Btn small variant="secondary" onClick={() => onUnlock(b.id)}>🔓 Unlock</Btn>}
            <Btn
              small variant="secondary"
              onClick={() => {
                const c = customers.find(x => x.id === b.custId);
                if (c) onWhatsapp(c.phone, b.id);
              }}
            >WhatsApp</Btn>
            <Btn small variant="secondary" onClick={() => onOpenModal("billDetail", b)}>View</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}