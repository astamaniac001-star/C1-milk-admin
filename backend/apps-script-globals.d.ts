/// <reference types="google-apps-script" />

// Declarations to help VS Code's JS/TS language server understand
// Apps Script globals and project-level symbols defined across .gs files.

declare const SHEET_NAMES: { [key: string]: string };
declare function respond(success: any, data?: any, error?: any): GoogleAppsScript.Content.TextOutput;
declare function getSheet(name: string): GoogleAppsScript.Spreadsheet.Sheet;
declare function buildHeaderMap(sheet: GoogleAppsScript.Spreadsheet.Sheet): { [key: string]: number };
declare function getSettingValue(key: string): string;
declare function writeActivityLog(action: string, payload?: any, result?: any): void;
declare function nowISTTimestamp(): string;
declare function withLock<T>(fn: () => T): T;
declare function findRowByColumnValue(sheet: GoogleAppsScript.Spreadsheet.Sheet, hdr: any, colName: string, value: any): any;
declare function safeAppend(sheet: GoogleAppsScript.Spreadsheet.Sheet, rowArray: any[]): void;
declare const ALLOWED_ACTIONS: Set<string>;
declare const TESTED_ACTIONS: Set<string>;
declare const SETTINGS_CACHE_KEY_PREFIX: string;
