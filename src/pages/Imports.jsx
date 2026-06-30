// ── Imports.jsx ───────────────────────────────────────────────────────────────
// Milk Imports tab: filter (month/brand/status) + KPI tiles + import cards +
// brand list.

import { fmt } from "../lib/utils.js";
import {
  Card,
  Btn,
  IS,
  Section,
  StatGrid,
  Empty,
  Badge,
  ActiveBrandOptions,
} from "../components/ui.jsx";

const STATUS_FILTERS = ["Draft", "Confirmed", "Reconciled"];

export default function Imports({
  filtered,
  brands,
  impFilter,
  onImpFilterChange,
  onOpenModal,
  onConfirm,
  onDelete,
}) {
  const totalQty = filtered
    .filter((i) => i.status === "Confirmed")
    .reduce((s, i) => s + i.qty, 0);
  const totalCost = filtered
    .filter((i) => i.status === "Confirmed")
    .reduce((s, i) => s + i.total, 0);
  const avgRate = totalQty > 0 ? totalCost / totalQty : 0;

  return (
    <div>
      <Section
        title="Milk Imports"
        action={
          <div style={{ display: "flex", gap: 6 }}>
            <Btn
              small
              variant="secondary"
              onClick={() => onOpenModal("addBrand")}
            >
              + Brand
            </Btn>
            <Btn small onClick={() => onOpenModal("addImport")}>
              + Import
            </Btn>
          </div>
        }
      />
      <div
        style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}
      >
        <input
          type="month"
          value={impFilter.month}
          onChange={(e) =>
            onImpFilterChange({ ...impFilter, month: e.target.value })
          }
          style={{ ...IS(), flex: 1 }}
        />
        <select
          value={impFilter.brand}
          onChange={(e) =>
            onImpFilterChange({ ...impFilter, brand: e.target.value })
          }
          style={{ ...IS(), flex: 1 }}
        >
          <option value="">All Brands</option>
          <ActiveBrandOptions brands={brands} />
        </select>
        <select
          value={impFilter.status}
          onChange={(e) =>
            onImpFilterChange({ ...impFilter, status: e.target.value })
          }
          style={{ ...IS(), flex: 1 }}
        >
          <option value="">All Status</option>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <StatGrid
        items={[
          { label: "Total Qty", value: totalQty + " L", icon: "🥛" },
          {
            label: "Total Cost",
            value: fmt(totalCost),
            icon: "💰",
            bg: "#dcfce7",
            tx: "#166534",
          },
          {
            label: "Avg Rate",
            value: "₹" + avgRate.toFixed(2) + "/L",
            icon: "📊",
          },
          { label: "Imports", value: filtered.length, icon: "📦" },
        ]}
      />
      {filtered.length === 0 ? (
        <Empty msg="No imports match filters" />
      ) : (
        filtered.map((imp) => (
          <Card key={imp.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>
                  {imp.brand}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {imp.date} · {imp.type}
                </div>
                <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
                  {imp.qty} L @ {fmt(imp.rate)}/L ={" "}
                  <strong>{fmt(imp.total)}</strong>
                </div>
                {imp.invoice && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    {imp.invoice}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  v{imp.version}
                </div>
              </div>
              <Badge label={imp.status} />
            </div>
            {imp.status === "Draft" && (
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <Btn
                  small
                  variant="secondary"
                  onClick={() => onOpenModal("addImport", imp)}
                >
                  Edit
                </Btn>
                <Btn small variant="success" onClick={() => onConfirm(imp.id)}>
                  Confirm
                </Btn>
                <Btn small variant="danger" onClick={() => onDelete(imp.id)}>
                  Delete
                </Btn>
              </div>
            )}
          </Card>
        ))
      )}
      <Card style={{ background: "#f8fafc" }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "#374151",
            marginBottom: 8,
          }}
        >
          Brands
        </div>
        {brands.map((b) => (
          <div
            key={b.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 0",
              borderBottom: "0.5px solid #f3f4f6",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>
                {b.name}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                {b.supplier} · {b.phone}
                {b.defaultMilkType ? " · " + b.defaultMilkType : ""}
                {b.rate ? " · ₹" + b.rate + "/L" : ""}
              </div>
            </div>
            <Badge label={b.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}
