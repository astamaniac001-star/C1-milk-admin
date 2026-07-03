function addAdHocLog(payload) {
  if (!payload.customerId || !payload.date || !payload.quantity) {
    return respond(false, null, {
      code: "VALIDATION_ERROR",
      message: "Missing required fields",
    });
  }
  return withLock(function () {
    const sheet = getSheet(SHEET_NAMES.DAILY_LOGS);
    const hdr = buildHeaderMap(sheet);
    const now = Utilities.formatDate(
      new Date(),
      "Asia/Kolkata",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
    const newRow = new Array(sheet.getLastColumn()).fill("");

    newRow[hdr["LogId"]] = Utilities.getUuid();
    newRow[hdr["CustomerId"]] = payload.customerId;
    newRow[hdr["Date"]] = payload.date;
    newRow[hdr["Quantity"]] = Number(payload.quantity);
    newRow[hdr["Status"]] = "DELIVERED";
    newRow[hdr["Source"]] = "ADHOC";
    if (hdr["Reason"] !== undefined)
      newRow[hdr["Reason"]] = payload.reason || "";
    if (hdr["CreatedAt"] !== undefined) newRow[hdr["CreatedAt"]] = now;

    safeAppend(sheet, newRow);
    return respond(true, { id: newRow[hdr["LogId"]] });
  });
}

function addCreditNote(payload) {
  if (!payload.customerId || !payload.amount || !payload.reason) {
    return respond(false, null, {
      code: "VALIDATION_ERROR",
      message: "Missing required fields",
    });
  }
  return withLock(function () {
    const sheet = getSheet("CREDIT_NOTES");
    const hdr = buildHeaderMap(sheet);
    const now = Utilities.formatDate(
      new Date(),
      "Asia/Kolkata",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
    const newRow = new Array(sheet.getLastColumn()).fill("");

    newRow[hdr["Id"]] = Utilities.getUuid();
    newRow[hdr["CustomerId"]] = payload.customerId;
    newRow[hdr["BillId"]] = payload.billId || "";
    newRow[hdr["Amount"]] = Number(payload.amount);
    newRow[hdr["Reason"]] = payload.reason;
    newRow[hdr["CreatedAt"]] = now;
    if (hdr["IdempotencyKey"] !== undefined)
      newRow[hdr["IdempotencyKey"]] =
        `cn-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    safeAppend(sheet, newRow);
    return respond(true, { id: newRow[hdr["Id"]] });
  });
}

function getCreditNotes() {
  const sheet = getSheet("CREDIT_NOTES");
  const hdr = buildHeaderMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respond(true, { creditNotes: [] });

  const data = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();
  const creditNotes = data.map((row) => ({
    id: row[hdr["Id"]],
    customerId: row[hdr["CustomerId"]],
    billId: row[hdr["BillId"]],
    amount: Number(row[hdr["Amount"]]),
    reason: row[hdr["Reason"]],
    createdAt: row[hdr["CreatedAt"]],
  }));
  return respond(true, { creditNotes });
}
