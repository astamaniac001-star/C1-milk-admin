import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Load the real app.js file to test the actual global functions
import './app.js';

// Mock IndexedDB
const mockDB = {
  transaction: vi.fn(),
  close: vi.fn(),
};

const mockStore = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  createIndex: vi.fn(),
};

const mockRequest = {
  result: mockDB,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
};

global.indexedDB = {
  open: vi.fn(() => mockRequest),
};

global.sessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

// Ensure window object is properly mocked for the imported app.js
global.window = global.window || {};
global.window.showToast = vi.fn();
global.window.updateUnsavedIndicator = vi.fn();
global.window.pendingState = new Map();
global.window.apiCall = vi.fn();

describe("WriteQueueManager - retry delay calculation", () => {
  it("calculates retry delay based on retry count", () => {
    const w = {
      jitterSchedule: [10000, 30000, 60000, 120000, 300000]
    };
    
    expect(window.writeQueue._getRetryDelay({ ...w, retryCount: 0 })).toBe(10000);
    expect(window.writeQueue._getRetryDelay({ ...w, retryCount: 1 })).toBe(30000);
    expect(window.writeQueue._getRetryDelay({ ...w, retryCount: 2 })).toBe(60000);
    expect(window.writeQueue._getRetryDelay({ ...w, retryCount: 3 })).toBe(120000);
    expect(window.writeQueue._getRetryDelay({ ...w, retryCount: 4 })).toBe(300000);
    expect(window.writeQueue._getRetryDelay({ ...w, retryCount: 5 })).toBe(300000); // Capped at max
  });
});

describe("WriteQueueManager - write filtering", () => {
  it("filters pending writes correctly", () => {
    const writes = [
      { status: 'pending', lastAttempt: 0, retryCount: 0, jitterSchedule: [10000, 30000, 60000, 120000, 300000] },
      { status: 'failed', lastAttempt: Date.now() - 5000, retryCount: 0, jitterSchedule: [10000, 30000, 60000, 120000, 300000] },
      { status: 'failed', lastAttempt: Date.now() - 100000, retryCount: 0, jitterSchedule: [10000, 30000, 60000, 120000, 300000] },
      { status: 'dead', lastAttempt: 0, retryCount: 5, jitterSchedule: [10000, 30000, 60000, 120000, 300000] },
    ];

    const now = Date.now();
    const toProcess = writes.filter(w => window.writeQueue._shouldProcessWrite(w, now));
    expect(toProcess).toHaveLength(2); // pending + failed with enough delay
  });

  it("filters dead writes correctly", () => {
    const writes = [
      { status: 'pending' },
      { status: 'failed' },
      { status: 'dead' },
      { status: 'sending' },
    ];
    
    const dead = window.writeQueue._filterDeadWrites(writes);
    expect(dead).toHaveLength(1);
    expect(dead[0].status).toBe('dead');
  });
});

describe("WriteQueueManager - success response detection", () => {
  it("identifies successful responses", () => {
    const isSuccess = (res) => window.writeQueue._isSuccessResponse(res);
    
    expect(isSuccess({ success: true })).toBe(true);
    expect(isSuccess({ success: false, error: { code: 'DUPLICATE' } })).toBe(true);
    expect(isSuccess({ success: false, error: { code: 'CONFLICT' } })).toBe(true);
    expect(isSuccess({ success: false, error: { code: 'VERSION_CONFLICT' } })).toBe(true);
    expect(isSuccess({ success: false, error: { code: 'OTHER_ERROR' } })).toBe(false);
    expect(isSuccess({ success: false })).toBe(false);
  });
});

describe("WriteQueueManager - entity key resolution", () => {
  it("resolves entity keys for different actions", () => {
    expect(window.resolveEntityKey('recordPayment', { billId: 'B1' })).toBe('payment:B1');
    expect(window.resolveEntityKey('addAdjustment', { customerId: 'C1', date: '2025-01-15' })).toBe('adj:C1:2025-01-15');
    expect(window.resolveEntityKey('addCustomer', { deliveryAddress: '123 Main St' })).toBe('cust:123 Main St');
  });
});

describe("apiCall - session handling", () => {
  it("clears session on UNAUTHORIZED error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    });
    global.fetch = mockFetch;
    global.sessionStorage.getItem = vi.fn((key) => key === 'milkapp_token' ? 'test-token' : 'test-secret');
    global.sessionStorage.removeItem = vi.fn();
    global.window.location = { reload: vi.fn() };

    // Use the REAL window.apiCall
    await window.apiCall('testAction', {});

    expect(sessionStorage.removeItem).toHaveBeenCalledWith('milkapp_token');
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('milkapp_secret');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it("handles network errors gracefully", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;
    global.sessionStorage.getItem = vi.fn(() => 'test-token');

    const result = await window.apiCall('testAction', {});

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('NETWORK_ERROR');
  });
});

describe("WriteQueueManager - channel message handling", () => {
  it("handles flush_needed message type", () => {
    let debounceTimer = null;
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    // Use the REAL method
    window.writeQueue._handleFlushNeeded(debounceTimer, (timer) => { debounceTimer = timer; });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 200);
    
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it("handles entry_deleted message type", () => {
    window.pendingState.set('test-key', { data: 'test' });
    window.writeQueue._snapshot = [{ entityKey: 'test-key' }];
    window.writeQueue._size = 1;

    // Use the REAL method
    window.writeQueue._handleEntryDeleted('test-key');

    expect(window.pendingState.has('test-key')).toBe(false);
    expect(window.writeQueue._size).toBe(0);
  });

  it("handles state_update message type", () => {
    window.writeQueue._size = 0;
    window.writeQueue._snapshot = [];

    // Use the REAL method
    window.writeQueue._handleStateUpdate({ size: 5, snapshot: [{ id: 1 }] });

    expect(window.writeQueue._size).toBe(5);
    expect(window.writeQueue._snapshot).toEqual([{ id: 1 }]);
  });
});

describe("WriteQueueManager - should process write logic", () => {
  it("processes pending writes immediately", () => {
    const write = { status: 'pending', retryCount: 0, lastAttempt: 0, jitterSchedule: [] };
    const now = Date.now();
    expect(window.writeQueue._shouldProcessWrite(write, now)).toBe(true);
  });

  it("does not process dead writes", () => {
    const write = { status: 'dead', retryCount: 5, lastAttempt: 0, jitterSchedule: [] };
    const now = Date.now();
    expect(window.writeQueue._shouldProcessWrite(write, now)).toBe(false);
  });

  it("processes failed writes after retry delay", () => {
    const write = { status: 'failed', retryCount: 0, lastAttempt: Date.now() - 15000, jitterSchedule: [10000] };
    const now = Date.now();
    expect(window.writeQueue._shouldProcessWrite(write, now)).toBe(true);
  });

  it("does not process failed writes before retry delay", () => {
    const write = { status: 'failed', retryCount: 0, lastAttempt: Date.now() - 5000, jitterSchedule: [10000] };
    const now = Date.now();
    expect(window.writeQueue._shouldProcessWrite(write, now)).toBe(false);
  });
});

describe("WriteQueueManager - flush orchestration", () => {
  it("skips flush when already flushing", async () => {
    // Mock internal methods to simulate slow flush
    window.writeQueue._getPendingWrites = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));
    window.writeQueue._processBatch = vi.fn();
    window.writeQueue._postFlushActions = vi.fn();
    
    window.writeQueue._flushing = false;

    const flush1 = window.writeQueue.flush();
    const flush2 = window.writeQueue.flush(); // Should be skipped

    await Promise.all([flush1, flush2]);
    
    expect(window.writeQueue._getPendingWrites).toHaveBeenCalledTimes(1);
  });

  it("processes writes in batch", async () => {
    const writes = [
      { entityKey: 'key1', status: 'pending' },
      { entityKey: 'key2', status: 'pending' },
    ];
    
    window.writeQueue._processWrite = vi.fn();
    await window.writeQueue._processBatch(writes, Date.now());
    
    expect(window.writeQueue._processWrite).toHaveBeenCalledTimes(2);
  });

  it("filters writes before processing", async () => {
    const allWrites = [
      { status: 'pending', lastAttempt: 0, retryCount: 0, jitterSchedule: [] },
      { status: 'failed', lastAttempt: Date.now() - 5000, retryCount: 0, jitterSchedule: [] },
      { status: 'dead', lastAttempt: 0, retryCount: 5, jitterSchedule: [] },
    ];

    const now = Date.now();
    const toProcess = window.writeQueue._filterWritesToProcess(allWrites, now);
    const dead = window.writeQueue._filterDeadWrites(allWrites);

    expect(toProcess).toHaveLength(1); // Only pending
    expect(dead).toHaveLength(1); // Only dead
  });

  it("updates unsaved indicator after flush", async () => {
    window.updateUnsavedIndicator = vi.fn();
    window.writeQueue._getPendingWrites = vi.fn().mockResolvedValue([]);
    window.writeQueue.scheduleFlush = vi.fn();
    window.writeQueue._postFlushActions = window.writeQueue._postFlushActions.bind(window.writeQueue);
    
    await window.writeQueue.flush();
    
    expect(window.updateUnsavedIndicator).toHaveBeenCalled();
  });

  it("schedules next flush after completion", async () => {
    window.writeQueue.scheduleFlush = vi.fn();
    window.writeQueue._getPendingWrites = vi.fn().mockResolvedValue([]);
    window.updateUnsavedIndicator = vi.fn();
    window.writeQueue._postFlushActions = window.writeQueue._postFlushActions.bind(window.writeQueue);
    
    await window.writeQueue.flush();
    
    expect(window.writeQueue.scheduleFlush).toHaveBeenCalled();
  });
});