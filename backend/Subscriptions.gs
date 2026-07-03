// ----------------------------------------------------------------------------
// SUBSCRIPTIONS ACTIONS
// ----------------------------------------------------------------------------

/**
 * logSubscriptionHistory — appends an audit trail entry for subscription changes.
 */
function logSubscriptionHistory(subId, action, details) {
  try {
    const sheet = getSheet("SubscriptionHistory"); // ✅ Updated to PascalCase
    const hdr = buildHeaderMap(sheet);
    const now = Utilities.formatDate(
      new Date(),
      "Asia/Kolkata",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
    const row = new Array(sheet.getLastColumn()).fill("");

    row[hdr["Id"]] = Utilities.getUuid();
    row[hdr["SubscriptionId"]] = subId;
    row[hdr["Action"]] = action;
    row[hdr["Details"]] = details;
    row[hdr["Timestamp"]] = now;

    safeAppend(sheet, row);
  } catch (e) {
    console.error("Failed to log subscription history", e);
  }
}

/**
 * getSubscriptions — fetches all subscriptions and joins customer names.
 */
function getSubscriptions(payload) {
  const sheet = getSheet("Subscriptions");
  const hdr = buildHeaderMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respond(true, { subscriptions: [] });

  const allValues = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  // Fetch customers to join names for the UI
  const custSheet = getSheet("Customers");
  const custHdr = buildHeaderMap(custSheet);
  const custLastRow = custSheet.getLastRow();
  const customers = {};
  if (custLastRow >= 2) {
    const custValues = custSheet
      .getRange(2, 1, custLastRow - 1, custSheet.getLastColumn())
      .getValues();
    custValues.forEach((row) => {
      customers[row[custHdr["CustomerId"]]] = row[custHdr["Name"]];
    });
  }

  const subscriptions = allValues.map((row) => ({
    id: row[hdr["Id"]],
    customerId: row[hdr["CustomerId"]],
    customerName: customers[row[hdr["CustomerId"]]] || "Unknown",
    milkType: row[hdr["MilkType"]],
    quantity: Number(row[hdr["Quantity"]]),
    deliveryDays: JSON.parse(row[hdr["DeliveryDays"]] || "[]"),
    isActive: row[hdr["IsActive"]] === true || row[hdr["IsActive"]] === "TRUE",
    version: Number(row[hdr["Version"]] || 1),
  }));

  return respond(true, { subscriptions });
}

/**
 * saveSubscription — creates or updates a subscription.
 * Required for create: customerId, milkType, quantity, deliveryDays
 * Required for update: id, expectedVersion
 */
function saveSubscription(payload) {
  if (
    !payload.customerId ||
    !payload.milkType ||
    !payload.quantity ||
    !Array.isArray(payload.deliveryDays)
  ) {
    return respond(false, null, {
      code: "VALIDATION_ERROR",
      message: "Missing required fields",
    });
  }

  return withLock(function () {
    const sheet = getSheet("Subscriptions");
    const hdr = buildHeaderMap(sheet);
    const now = Utilities.formatDate(
      new Date(),
      "Asia/Kolkata",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );

    if (payload.id) {
      // Update existing
      const found = findRowById(sheet, hdr["Id"], payload.id);
      if (!found)
        return respond(false, null, {
          code: "NOT_FOUND",
          message: "Subscription not found",
        });

      const currentVersion = Number(found.rowValues[hdr["Version"]] || 1);
      if (
        payload.expectedVersion !== undefined &&
        currentVersion !== Number(payload.expectedVersion)
      ) {
        return respond(false, null, {
          code: "VERSION_CONFLICT",
          message: "Subscription was modified by another user",
        });
      }

      const updated = found.rowValues.slice();
      updated[hdr["CustomerId"]] = payload.customerId;
      updated[hdr["MilkType"]] = payload.milkType;
      updated[hdr["Quantity"]] = Number(payload.quantity);
      updated[hdr["DeliveryDays"]] = JSON.stringify(payload.deliveryDays);
      updated[hdr["IsActive"]] =
        payload.isActive === true || payload.isActive === "TRUE"
          ? "TRUE"
          : "FALSE";
      updated[hdr["UpdatedAt"]] = now;
      updated[hdr["Version"]] = currentVersion + 1;

      // Log the change to the audit trail
      const oldDetails = `Qty: ${found.rowValues[hdr["Quantity"]]} | Type: ${found.rowValues[hdr["MilkType"]]}`;
      const newDetails = `Qty: ${payload.quantity} | Type: ${payload.milkType}`;
      if (oldDetails !== newDetails) {
        logSubscriptionHistory(
          payload.id,
          "UPDATED",
          `Changed from [${oldDetails}] to [${newDetails}]`,
        );
      }

      sheet.getRange(found.rowIndex, 1, 1, updated.length).setValues([updated]);
      return respond(true, { id: payload.id, newVersion: currentVersion + 1 });
    } else {
      // Create new
      if (payload.idempotencyKey) {
        const dup = findRowByColumnValue(
          sheet,
          hdr,
          "IdempotencyKey",
          payload.idempotencyKey,
        );
        if (dup)
          return respond(true, {
            id: dup.rowValues[hdr["Id"]],
            duplicate: true,
          });
      }

      const id = Utilities.getUuid();
      const newRow = new Array(sheet.getLastColumn()).fill("");
      newRow[hdr["Id"]] = id;
      newRow[hdr["CustomerId"]] = payload.customerId;
      newRow[hdr["MilkType"]] = payload.milkType;
      newRow[hdr["Quantity"]] = Number(payload.quantity);
      newRow[hdr["DeliveryDays"]] = JSON.stringify(payload.deliveryDays);
      newRow[hdr["IsActive"]] =
        payload.isActive === true || payload.isActive === "TRUE"
          ? "TRUE"
          : "FALSE";
      newRow[hdr["CreatedAt"]] = now;
      newRow[hdr["UpdatedAt"]] = now;
      newRow[hdr["Version"]] = 1;
      if (hdr["IdempotencyKey"] !== undefined)
        newRow[hdr["IdempotencyKey"]] = payload.idempotencyKey || "";

      safeAppend(sheet, newRow);

      // Log the creation to the audit trail
      logSubscriptionHistory(
        id,
        "CREATED",
        `Qty: ${payload.quantity} | Type: ${payload.milkType} | Days: ${JSON.stringify(payload.deliveryDays)}`,
      );

      return respond(true, { id: id, newVersion: 1 });
    }
  });
}

/**
 * getSubscriptionHistory — fetches the audit trail for a specific subscription.
 */
function getSubscriptionHistory(payload) {
  const sheet = getSheet("SubscriptionHistory"); // ✅ Updated to PascalCase
  const hdr = buildHeaderMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respond(true, { history: [] });

  const data = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  const history = data
    .filter((row) => row[hdr["SubscriptionId"]] === payload.subscriptionId)
    .map((row) => ({
      id: row[hdr["Id"]],
      action: row[hdr["Action"]],
      details: row[hdr["Details"]],
      timestamp: row[hdr["Timestamp"]],
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return respond(true, { history });
}

/**
 * addAdHocLog — creates a one-off delivery log (extra milk, guest delivery, etc.).
 */
function addAdHocLog(payload) {
  if (!payload.customerId || !payload.date || !payload.quantity) {
    return respond(false, null, {
      code: "VALIDATION_ERROR",
      message: "Missing required fields",
    });
  }

  return withLock(function () {
    const sheet = getSheet("DailyLogs");
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

    // Handle Quantity vs Qty column name gracefully
    const qtyCol = hdr["Quantity"] !== undefined ? "Quantity" : "Qty";
    if (hdr[qtyCol] !== undefined)
      newRow[hdr[qtyCol]] = Number(payload.quantity);

    newRow[hdr["Status"]] = "DELIVERED";
    if (hdr["Source"] !== undefined) newRow[hdr["Source"]] = "ADHOC";
    if (hdr["Reason"] !== undefined)
      newRow[hdr["Reason"]] = payload.reason || "";
    if (hdr["CreatedAt"] !== undefined) newRow[hdr["CreatedAt"]] = now;
    if (hdr["UpdatedAt"] !== undefined) newRow[hdr["UpdatedAt"]] = now;

    safeAppend(sheet, newRow);
    return respond(true, { id: newRow[hdr["LogId"]] });
  });
}

/**
 * addCreditNote — issues a credit note to offset a customer's bill.
 */
function addCreditNote(payload) {
  if (!payload.customerId || !payload.amount || !payload.reason) {
    return respond(false, null, {
      code: "VALIDATION_ERROR",
      message: "Missing required fields",
    });
  }

  return withLock(function () {
    const sheet = getSheet("CreditNotes"); // ✅ Updated to PascalCase
    const hdr = buildHeaderMap(sheet);
    const now = Utilities.formatDate(
      new Date(),
      "Asia/Kolkata",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
    const newRow = new Array(sheet.getLastColumn()).fill("");

    newRow[hdr["Id"]] = Utilities.getUuid();
    newRow[hdr["CustomerId"]] = payload.customerId;
    if (hdr["BillId"] !== undefined)
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

/**
 * getCreditNotes — fetches all issued credit notes.
 */
function getCreditNotes() {
  const sheet = getSheet("CreditNotes"); // ✅ Updated to PascalCase
  const hdr = buildHeaderMap(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return respond(true, { creditNotes: [] });

  const data = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  const creditNotes = data.map((row) => ({
    id: row[hdr["Id"]],
    customerId: row[hdr["CustomerId"]],
    billId: hdr["BillId"] !== undefined ? row[hdr["BillId"]] : "",
    amount: Number(row[hdr["Amount"]]),
    reason: row[hdr["Reason"]],
    createdAt: row[hdr["CreatedAt"]],
  }));

  return respond(true, { creditNotes });
}

/**
 * generateDailyLogsForDate — CRITICAL ACTION.
 * Automatically creates DailyLogs for active subscriptions on a given date.
 * Respects pause periods, active customer status, and prevents overwriting manual entries.
 */
function generateDailyLogsForDate(payload) {
  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return respond(false, null, {
      code: "VALIDATION_ERROR",
      message: "Invalid date format (YYYY-MM-DD)",
    });
  }

  return withLock(function () {
    // Idempotency check using ScriptProperties to prevent duplicate batch generation on network retries
    const props = PropertiesService.getScriptProperties();
    const idemKey = "IDEM_GEN_LOGS_" + (payload.idempotencyKey || "");
    if (payload.idempotencyKey && props.getProperty(idemKey)) {
      return respond(true, JSON.parse(props.getProperty(idemKey)));
    }

    const targetDate = payload.date;
    const dateParts = targetDate.split("-");
    // Parse as UTC to avoid timezone shifts when extracting day of week
    const dt = new Date(
      Date.UTC(
        Number(dateParts[0]),
        Number(dateParts[1]) - 1,
        Number(dateParts[2]),
      ),
    );
    const dayOfWeek = dt.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // 1. Fetch Subscriptions
    const subSheet = getSheet("Subscriptions");
    const subHdr = buildHeaderMap(subSheet);
    const subLastRow = subSheet.getLastRow();
    const subs =
      subLastRow >= 2
        ? subSheet
            .getRange(2, 1, subLastRow - 1, subSheet.getLastColumn())
            .getValues()
        : [];

    // 2. Fetch Active Customers
    const custSheet = getSheet("Customers");
    const custHdr = buildHeaderMap(custSheet);
    const custLastRow = custSheet.getLastRow();
    const custs =
      custLastRow >= 2
        ? custSheet
            .getRange(2, 1, custLastRow - 1, custSheet.getLastColumn())
            .getValues()
        : [];
    const activeCustIds = new Set();
    custs.forEach((row) => {
      const status = String(row[custHdr["Status"]] || "").toUpperCase();
      if (!status || status === "ACTIVE")
        activeCustIds.add(row[custHdr["CustomerId"]]);
    });

    // 3. Fetch Existing Logs for targetDate (to prevent overwriting manual admin entries)
    const logSheet = getSheet("DailyLogs");
    const logHdr = buildHeaderMap(logSheet);
    const logLastRow = logSheet.getLastRow();
    const logs =
      logLastRow >= 2
        ? logSheet
            .getRange(2, 1, logLastRow - 1, logSheet.getLastColumn())
            .getValues()
        : [];
    const existingLogKeys = new Set();
    logs.forEach((row) => {
      if (row[logHdr["Date"]] === targetDate) {
        existingLogKeys.add(row[logHdr["CustomerId"]]);
      }
    });

    // 4. Fetch Pauses (Ensure sheet name matches your actual spreadsheet tab exactly)
    const pauseSheet = getSheet("PausePeriods");
    const pauseHdr = buildHeaderMap(pauseSheet);
    const pauseLastRow = pauseSheet.getLastRow();
    const pauses =
      pauseLastRow >= 2
        ? pauseSheet
            .getRange(2, 1, pauseLastRow - 1, pauseSheet.getLastColumn())
            .getValues()
        : [];

    const pausedCustIds = new Set();
    pauses.forEach((row) => {
      const start = String(row[pauseHdr["StartDate"]] || "");
      const end = String(row[pauseHdr["EndDate"]] || "");
      const custId = row[pauseHdr["CustomerId"]];
      if (start <= targetDate && targetDate <= end) {
        pausedCustIds.add(custId);
      }
    });

    let created = 0,
      skippedExisting = 0,
      skippedPaused = 0,
      skippedWrongDay = 0,
      skippedInactiveCust = 0;
    const newLogs = [];
    const logColumns = Object.keys(logHdr).length;
    const now = Utilities.formatDate(
      new Date(),
      "Asia/Kolkata",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );

    subs.forEach((row) => {
      const isActive =
        row[subHdr["IsActive"]] === true || row[subHdr["IsActive"]] === "TRUE";
      if (!isActive) return;

      const custId = row[subHdr["CustomerId"]];

      if (!activeCustIds.has(custId)) {
        skippedInactiveCust++;
        return;
      }

      const deliveryDays = JSON.parse(row[subHdr["DeliveryDays"]] || "[]");
      if (!deliveryDays.includes(dayOfWeek)) {
        skippedWrongDay++;
        return;
      }

      if (pausedCustIds.has(custId)) {
        skippedPaused++;
        return;
      }

      if (existingLogKeys.has(custId)) {
        skippedExisting++;
        return;
      }

      // Create new log entry
      const logRow = new Array(logColumns).fill("");
      logRow[logHdr["LogId"]] = Utilities.getUuid();
      logRow[logHdr["CustomerId"]] = custId;
      logRow[logHdr["Date"]] = targetDate;
      logRow[logHdr["Quantity"]] = Number(row[subHdr["Quantity"]]);

      // Map MilkType/Product depending on your DailyLogs schema
      if (logHdr["MilkType"] !== undefined)
        logRow[logHdr["MilkType"]] = row[subHdr["MilkType"]];
      if (logHdr["Product"] !== undefined)
        logRow[logHdr["Product"]] = row[subHdr["MilkType"]];

      logRow[logHdr["Status"]] = "PENDING";
      logRow[logHdr["CreatedAt"]] = now;
      logRow[logHdr["UpdatedAt"]] = now;

      newLogs.push(logRow);
      existingLogKeys.add(custId); // Prevent duplicate if multiple subs exist for same customer
      created++;
    });

    if (newLogs.length > 0) {
      logSheet
        .getRange(logSheet.getLastRow() + 1, 1, newLogs.length, logColumns)
        .setValues(newLogs);
    }

    const summary = {
      created,
      skippedExisting,
      skippedPaused,
      skippedWrongDay,
      skippedInactiveCust,
    };

    // Cache result for idempotency
    if (payload.idempotencyKey) {
      props.setProperty(idemKey, JSON.stringify(summary));
    }

    return respond(true, summary);
  });
}
