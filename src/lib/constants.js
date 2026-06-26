// ── constants.js ──────────────────────────────────────────────────────────────
// Brand + palette constants shared across UI primitives and pages.

// Primary palette
export const BLUE   = "#1e40af";
export const BLUE_L = "#dbeafe";

// Status → badge colors. Used by <Badge label={status}/> to pick background/text.
export const SC = {
  Active:    { bg:"#dcfce7", tx:"#166534" },
  Paused:    { bg:"#fef9c3", tx:"#854d0e" },
  Inactive:  { bg:"#fee2e2", tx:"#991b1b" },
  Confirmed: { bg:"#dcfce7", tx:"#166534" },
  Reconciled:{ bg:"#e0f2fe", tx:"#075985" },
  Draft:     { bg:"#dbeafe", tx:"#1e40af" },
  Paid:      { bg:"#dcfce7", tx:"#166534" },
  Partial:   { bg:"#fef9c3", tx:"#854d0e" },
  Unpaid:    { bg:"#fee2e2", tx:"#991b1b" },
  pending:   { bg:"#dbeafe", tx:"#1e40af" },
  failed:    { bg:"#fef9c3", tx:"#854d0e" },
  dead:      { bg:"#fee2e2", tx:"#991b1b" },
  Applied:   { bg:"#dcfce7", tx:"#166534" },
  Pending:   { bg:"#fef9c3", tx:"#854d0e" },
  Delivered: { bg:"#dcfce7", tx:"#166534" },
  Skipped:   { bg:"#fee2e2", tx:"#991b1b" },
};

// Day-of-week labels (en-IN). Month names live inline in utils.js#monthLabel.
export const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Domain enumerations
export const MILK_TYPES = ["Full Cream","Toned","Double Toned","Skimmed","Standardised"];
export const PRODUCTS   = ["Full Cream","Toned","Double Toned","Skimmed","Standardised"];
export const PAY_MODES  = ["Cash","UPI","PhonePe","GPay","Paytm","Bank Transfer","Cheque"];

// Per-product rate (₹/L). Used when generating monthly bills.
export const RATE_BY_PRODUCT = {
  "Full Cream":    36,
  "Toned":         32,
  "Double Toned":  30,
  "Skimmed":       28,
  "Standardised":  34,
};