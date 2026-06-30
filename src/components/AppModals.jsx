import { MILK_TYPES, PRODUCTS, PAY_MODES } from "../lib/constants.js";
import {
  CustomerModal,
  ImportModal,
  PaymentModal,
  BillDetailModal,
  AdjustmentModal,
  PauseModal,
  BrandModal,
} from "./forms.jsx";

function renderCustomerModal(ctx, isEdit) {
  return (
    <CustomerModal
      data={ctx.modal.data}
      isEdit={isEdit}
      onChange={ctx.setF}
      onSave={ctx.handlers.saveCustomer}
      onClose={ctx.closeModal}
      products={PRODUCTS}
    />
  );
}

function renderImportModal(ctx) {
  return (
    <ImportModal
      data={ctx.modal.data}
      form={ctx.form}
      onChange={ctx.setF}
      onSave={ctx.handlers.saveImport}
      onClose={ctx.closeModal}
      today={ctx.today}
      brands={ctx.brands}
      milkTypes={MILK_TYPES}
    />
  );
}

function renderPaymentModal(ctx) {
  return (
    <PaymentModal
      data={ctx.modal.data}
      form={ctx.form}
      onChange={ctx.setF}
      onSave={ctx.handlers.recordPayment}
      onClose={ctx.closeModal}
      today={ctx.today}
      payModes={PAY_MODES}
    />
  );
}

function renderAdjustmentModal(ctx) {
  return (
    <AdjustmentModal
      data={ctx.modal.data}
      onChange={ctx.setF}
      onSave={ctx.handlers.saveAdjustment}
      onClose={ctx.closeModal}
      today={ctx.today}
      customers={ctx.customers}
    />
  );
}

function renderPauseModal(ctx) {
  return (
    <PauseModal
      data={ctx.modal.data}
      onChange={ctx.setF}
      onSave={ctx.handlers.savePause}
      onClose={ctx.closeModal}
      today={ctx.today}
      customers={ctx.customers}
    />
  );
}

const MODAL_RENDERERS = {
  addCustomer: (ctx) => renderCustomerModal(ctx, false),
  editCustomer: (ctx) => renderCustomerModal(ctx, true),
  addImport: renderImportModal,
  payment: renderPaymentModal,
  billDetail: (ctx) => (
    <BillDetailModal data={ctx.modal.data} onClose={ctx.closeModal} />
  ),
  addAdj: renderAdjustmentModal,
  addPause: renderPauseModal,
  addBrand: (ctx) => (
    <BrandModal
      onChange={ctx.setF}
      onSave={ctx.handlers.saveBrand}
      onClose={ctx.closeModal}
      milkTypes={MILK_TYPES}
    />
  ),
};

export function AppModals(props) {
  if (!props.modal) return null;
  const render = MODAL_RENDERERS[props.modal.type];
  return render ? render(props) : null;
}
