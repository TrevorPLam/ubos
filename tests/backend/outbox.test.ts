import { expect, test, describe, beforeAll, afterAll, vi } from "vitest";
import { eventDispatcher } from "../../server/services/event-dispatcher";

// Mock storage
vi.mock("../../server/storage", () => ({
  storage: {
    getUnprocessedEvents: vi.fn(),
    markEventProcessed: vi.fn(),
    updateEventRetry: vi.fn(),
    createOutboxEvent: vi.fn(),
  }
}));

import { storage } from "../../server/storage";

describe("Event Dispatcher", () => {
  test("should dispatch and process events", async () => {
    const eventType = "TEST_EVENT";
    const payload = { foo: "bar" };
    const event = {
      id: "event-123",
      eventType,
      payload,
      processedAt: null,
      retryCount: 0,
      metadata: {},
    };

    // Mock storage response
    vi.mocked(storage.getUnprocessedEvents).mockResolvedValue([event] as any);
    vi.mocked(storage.markEventProcessed).mockResolvedValue(undefined);

    const handler = vi.fn().mockResolvedValue(undefined);

    // 1. Register handler
    eventDispatcher.register(eventType, handler);

    // 2. Process events manually
    await eventDispatcher.processEvents();

    // 3. Verify handler called
    expect(handler).toHaveBeenCalledWith(payload, {});

    // 4. Verify storage marked processed
    expect(storage.markEventProcessed).toHaveBeenCalledWith(event.id);
  });

  test("should handle failed events with retry count", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const eventType = "FAIL_EVENT";
    const event = {
      id: "event-fail",
      eventType,
      payload: {},
      processedAt: null,
      retryCount: 0,
    };

    vi.mocked(storage.getUnprocessedEvents).mockResolvedValue([event] as any);
    vi.mocked(storage.updateEventRetry).mockResolvedValue(undefined);

    const handler = vi.fn().mockRejectedValue(new Error("Boom!"));
    eventDispatcher.register(eventType, handler);

    // Run processor
    await eventDispatcher.processEvents();

    // Verify handler called
    expect(handler).toHaveBeenCalled();

    // Verify updateEventRetry called
    expect(storage.updateEventRetry).toHaveBeenCalledWith(event.id, expect.stringContaining("Boom!"));
    
    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[EventDispatcher] Error processing event"),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
