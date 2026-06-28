

// ── forms.jsx ─────────────────────────────────────────────────────────────────
import { fmt } from "../lib/utils.js";
import { BLUE_L, BLUE } from "../lib/constants.js";
import {
  Modal, Field, Btn, IS,
  ActiveBrandOptions, ActiveCustomerOptions,
} from "./ui.jsx";

function getCustomerModalTitle(isEdit) {
  return isEdit ? "Edit Customer" : "Add Customer";
}

function getCustomerModalButtonText(isEdit) {
  return isEdit ? "Update" : "Save";
}

export function CustomerModal({ data, isEdit, onChange, onSave, onClose, products }) {
  return (
    <Modal title={getCustomerModalTitle(isEdit)} onClose={onClose}>
      <Field label="Full Name *"><input style={IS()} defaultValue={data.name}    onChange={onChange("name")}    placeholder="Ramesh Sharma" /></Field>
      <Field label="Delivery Address *"><input style={IS()} defaultValue={data.address} onChange={onChange("address")} placeholder="14, Shivaji Nagar" /></Field>
      <Field label="Phone (10 digits)"><input style={IS()} defaultValue={data.phone}    onChange={onChange("phone")}    placeholder="9876543210" /></Field>
      <Field label="Product">
        <select style={IS()} defaultValue={data.product || "Full Cream"} onChange={onChange("product")}>
          {products.map(p => <option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Daily Qty (L)"><input type="number" step="0.5" style={IS()} defaultValue={data.qty || 1} onChange={onChange("qty")} /></Field>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <Btn onClick={onSave}>{getCustomerModalButtonText(isEdit)}</Btn>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// REFACTORED: Extracted value resolution to avoid chained ?? operators which spike complexity
function getFieldValue(form, data, key) {
  return form[key] !== undefined ? form[key] : data[key];
}

function calculateImportTotal(form, data) {
  const qty = parseFloat(getFieldValue(form, data, 'qty')) || 0;
  const rate = parseFloat(getFieldValue(form, data, 'rate')) || 0;
  return Math.round(qty * rate * 100) / 100;
}

function ImportDateField({ data, today, onChange }) {
  return (
    <Field label="Date *">
      <input type="date" style={IS()} defaultValue={data.date || today} onChange={onChange("date")} />
    </Field>
  );
}

function ImportBrandField({ data, brands, onChange }) {
  return (
    <Field label="Brand *">
      <select style={IS()} defaultValue={data.brand || ""} onChange={onChange("brand")}>
        <option value="">Select Brand</option>
        <ActiveBrandOptions brands={brands} />
      </select>
    </Field>
  );
}

function ImportTypeField({ data, milkTypes, onChange }) {
  return (
    <Field label="Milk Type *">
      <select style={IS()} defaultValue={data.type || ""} onChange={onChange("type")}>
        <option value="">Select Type</option>
        {milkTypes.map(t => <option key={t}>{t}</option>)}
      </select>
    </Field>
  );
}

function ImportQtyRateField({ data, onChange }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
      <Field label="Qty (L) *">
        <input type="number" style={IS()} defaultValue={data.qty} onChange={onChange("qty")} placeholder="100" />
      </Field>
      <Field label="Rate (₹/L) *">
        <input type="number" step="0.5" style={IS()} defaultValue={data.rate} onChange={onChange("rate")} placeholder="36" />
      </Field>
    </div>
  );
}

function ImportMetaFields({ data, onChange }) {
  return (
    <>
      <Field label="Invoice No.">
        <input style={IS()} defaultValue={data.invoice} onChange={onChange("invoice")} placeholder="INV-2025-001" />
      </Field>
      <Field label="Supplier">
        <input style={IS()} defaultValue={data.supplier} onChange={onChange("supplier")} />
      </Field>
      <Field label="Notes">
        <input style={IS()} defaultValue={data.notes} onChange={onChange("notes")} />
      </Field>
    </>
  );
}

function ImportTotalDisplay({ total }) {
  return (
    <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#166534", marginBottom:12 }}>
      Total: {fmt(total)}
    </div>
  );
}

export function ImportModal({ data, form, onChange, onSave, onClose, today, brands, milkTypes }) {
  const total = calculateImportTotal(form, data);
  return (
    <Modal title={data.id ? "Edit Import" : "Add Milk Import"} onClose={onClose}>
      <ImportDateField data={data} today={today} onChange={onChange} />
      <ImportBrandField data={data} brands={brands} onChange={onChange} />
      <ImportTypeField data={data} milkTypes={milkTypes} onChange={onChange} />
      <ImportQtyRateField data={data} onChange={onChange} />
      <ImportMetaFields data={data} onChange={onChange} />
      <ImportTotalDisplay total={total} />
      <div style={{ display:"flex", gap:8 }}>
        <Btn onClick={onSave}>{data.id ? "Update" : "Save Draft"}</Btn>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

export function PaymentModal({ data, form, onChange, onSave, onClose, today, payModes }) {
  return (
    <Modal title={"Record Payment — " + data.customer} onClose={onClose}>
      <div style={{ background:BLUE_L, borderRadius:8, padding:"10px 12px", fontSize:13, color:BLUE, marginBottom:14 }}>
        Bill: {fmt(data.amount)} · Paid: {fmt(data.paid)} · <strong>Pending: {fmt(data.amount - data.paid)}</strong>
      </div>
      <Field label="Amount (₹) *"><input type="number" style={IS()} defaultValue={data.amount - data.paid} onChange={onChange("payAmt")} /></Field>
      <Field label="Payment Mode">
        <select style={IS()} onChange={onChange("payMode")} defaultValue="Cash">
          {payModes.map(m => <option key={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Date"><input type="date" style={IS()} defaultValue={today} onChange={onChange("payDate")} /></Field>
      <Field label="Notes (optional)"><input style={IS()} onChange={onChange("payNote")} placeholder="Ref no., remarks…" /></Field>
      <div style={{ display:"flex", gap:8 }}>
        <Btn onClick={onSave}>Record {form.payAmt ? fmt(form.payAmt) : ""}</Btn>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

export function BillDetailModal({ data, onClose }) {
  return (
    <Modal title={"Bill — " + data.customer} onClose={onClose}>
      {[
        ["Bill ID",   data.id],
        ["Customer",  data.customer],
        ["Month",     data.month],
        ["Amount",    fmt(data.amount)],
        ["Paid",      fmt(data.paid)],
        ["Pending",   fmt(data.amount - data.paid)],
        ["Status",    data.status],
        ["Due Date",  data.due],
        ["Locked",    data.locked ? "Yes" : "No"],
      ].map(([k, v]) => (
        <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"0.5px solid #f3f4f6", fontSize:13 }}>
          <span style={{ color:"#6b7280" }}>{k}</span>
          <span style={{ fontWeight:500, color:"#111" }}>{v}</span>
        </div>
      ))}
      <div style={{ marginTop:14 }}>
        <Btn full variant="secondary" onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
}

export function AdjustmentModal({ data, onChange, onSave, onClose, today, customers }) {
  return (
    <Modal title="Add Adjustment" onClose={onClose}>
      <Field label="Customer *">
        <select style={IS()} onChange={onChange("custId")} defaultValue={data.custId || ""}>
          <option value="">Select Customer</option>
          <ActiveCustomerOptions customers={customers} />
        </select>
      </Field>
      <Field label="Date *"><input type="date" style={IS()} defaultValue={today} onChange={onChange("date")} /></Field>
      <Field label="Amount (₹, use – for deduction) *"><input type="number" style={IS()} onChange={onChange("amount")} placeholder="-50 or 100" /></Field>
      <Field label="Reason *"><input style={IS()} onChange={onChange("reason")} placeholder="Half delivery, Quality issue…" /></Field>
      <div style={{ display:"flex", gap:8 }}>
        <Btn onClick={onSave}>Save</Btn>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

export function PauseModal({ data, onChange, onSave, onClose, today, customers }) {
  return (
    <Modal title="Add Pause Period" onClose={onClose}>
      <Field label="Customer *">
        <select style={IS()} defaultValue={data.custId || ""} onChange={onChange("custId")}>
          <option value="">Select Customer</option>
          <ActiveCustomerOptions customers={customers} />
        </select>
      </Field>
      <Field label="Start Date *"><input type="date" style={IS()} defaultValue={today} onChange={onChange("startDate")} /></Field>
      <Field label="End Date *"><input type="date" style={IS()} onChange={onChange("endDate")} /></Field>
      <Field label="Reason"><input style={IS()} onChange={onChange("reason")} placeholder="Out of town, Travel…" /></Field>
      <div style={{ display:"flex", gap:8 }}>
        <Btn onClick={onSave}>Save</Btn>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

export function BrandModal({ onChange, onSave, onClose, milkTypes }) {
  return (
    <Modal title="Add Milk Brand" onClose={onClose}>
      <Field label="Brand Name *"><input style={IS()} onChange={onChange("name")} placeholder="Amul" /></Field>
      <Field label="Supplier Name"><input style={IS()} onChange={onChange("supplier")} placeholder="Amul Dairy Ltd." /></Field>
      <Field label="Supplier Phone"><input style={IS()} onChange={onChange("phone")} placeholder="9000000001" /></Field>
      <Field label="Default Milk Type">
        <select style={IS()} defaultValue="" onChange={onChange("defaultType")}>
          <option value="">Select Type</option>
          {milkTypes.map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Rate per Litre (₹)"><input type="number" step="0.5" style={IS()} onChange={onChange("rate")} placeholder="36" /></Field>
      <div style={{ display:"flex", gap:8 }}>
        <Btn onClick={onSave}>Save</Btn>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}