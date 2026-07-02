// ── Dashboard.jsx ─────────────────────────────────────────────────────────────
// Home tab: KPI tiles + today's delivery snapshot + quick actions + queue
// status + recent bills.

import { fmt } from "../lib/utils.js";
import { BLUE, BLUE_L } from "../lib/constants.js";
import { Card, StatGrid, Btn, Badge } from "../components/ui.jsx";

const QUICK_ACTIONS = [
  { label: "Add Customer", icon: "👤", type: "addCustomer" },
  { label: "Add Import", icon: "📦", type: "addImport" },
  { label: "Generate Bills", icon: "🧾", action: "generate" },
  { label: "Add Adjustment", icon: "⚖️", type: "addAdj" },
  { label: "Add Pause", icon: "⏸️", type: "addPause" },
  { label: "Add Brand", icon: "🏷️", type: "addBrand" },
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// fallow-ignore-next-line complexity
function monthLabel(YYYYMM) {
  if (!YYYYMM || typeof YYYYMM !== "string" || YYYYMM.length < 7) return YYYYMM;
  const monthIdx = Number(YYYYMM.substring(5, 7)) - 1;
  if (Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return YYYYMM;
  return MONTH_NAMES[monthIdx];
}

export default function Dashboard({
  today,
  activeC,
  pendingDues,
  confirmedStock,
  todayLogs = [],
  bills = [],
  customers = [],
  onSetTab,
  onOpenModal,
  onGenerateBill,
}) {
  // The previous version of this tile said "Revenue Jan" while summing paid
  // bills across ALL months — label was a lie. Now scoped to the calendar
  // month of `today` so the number and label always agree.
  const currentMonth = (today || "").substring(0, 7);
  const monthRevenue = bills
    .filter((b) => b.month === currentMonth && b.status === "Paid")
    .reduce((s, b) => s + (b.paid || 0), 0);

  // bill.custId → customer.name lookup so Recent Bills can show who paid.
  const customerName = (() => {
    const m = new Map();
    for (const c of customers) m.set(c.id, c.name);
    return (id) => m.get(id) || "Unknown Customer";
  })();

  return (
    <div>
      <StatGrid
        items={[
          { label: "Active Customers", value: activeC.length, icon: "👥" },
          {
            label: "Stock Confirmed",
            value: confirmedStock + " L",
            icon: "🥛",
          },
          {
            label: `Revenue ${monthLabel(currentMonth)}`,
            value: fmt(monthRevenue),
            icon: "💰",
            bg: "#dcfce7",
            tx: "#166534",
          },
          {
            label: "Pending Dues",
            value: fmt(pendingDues),
            icon: "⏳",
            bg: "#fee2e2",
            tx: "#991b1b",
          },
        ]}
      />

      <Card>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "#111",
            marginBottom: 10,
          }}
        >
          Today's Delivery — {today}
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {[
            { label: "Scheduled", value: todayLogs.length },
            {
              label: "Delivered",
              value: todayLogs.filter((l) => l.delivered).length,
            },
            {
              label: "Skipped",
              value: todayLogs.filter((l) => !l.delivered).length,
            },
            {
              label: "Total (L)",
              value:
                todayLogs
                  .filter((l) => l.delivered)
                  .reduce((s, l) => s + l.qty, 0)
                  .toFixed(1) + " L",
            },
          ].map((x) => (
            <div
              key={x.label}
              style={{ textAlign: "center", padding: "8px 0" }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>
                {x.value}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{x.label}</div>
            </div>
          ))}
        </div>
        <Btn
          full
          onClick={() => onSetTab("delivery")}
          variant="secondary"
          style={{ marginTop: 8 }}
        >
          View Delivery Log →
        </Btn>
      </Card>

      <Card>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "#111",
            marginBottom: 10,
          }}
        >
          Quick Actions
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q.label}
              onClick={() =>
                q.action === "generate" ? onGenerateBill() : onOpenModal(q.type)
              }
              style={{
                background: BLUE_L,
                color: BLUE,
                border: "none",
                borderRadius: 10,
                padding: "10px 8px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 16 }}>{q.icon}</span>
              <br />
              {q.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "#111",
            marginBottom: 8,
          }}
        >
          Recent Bills
        </div>
        {bills.slice(0, 3).map((b) => (
          <div
            key={b.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 0",
              borderBottom: "0.5px solid #f3f4f6",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>
                {customerName(b.custId)}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{b.month}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                {fmt(b.amount)}
              </div>
              <Badge label={b.status} />
            </div>
          </div>
        ))}
        <button
          onClick={() => onSetTab("billing")}
          style={{
            background: "none",
            border: "none",
            color: BLUE,
            fontSize: 12,
            cursor: "pointer",
            marginTop: 8,
            padding: 0,
          }}
        >
          View all bills →
        </button>
      </Card>
    </div>
  );
}
