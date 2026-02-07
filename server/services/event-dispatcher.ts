import { storage } from "../storage";

type EventHandler = (payload: any, metadata: any) => Promise<void>;

export class EventDispatcher {
  private handlers: Map<string, EventHandler[]> = new Map();
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  register(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  start(pollIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log("[EventDispatcher] Starting event loop...");
    this.intervalId = setInterval(() => this.processEvents(), pollIntervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log("[EventDispatcher] Stopped event loop.");
  }

  async processEvents() {
    try {
      const events = await storage.getUnprocessedEvents(10);
      
      if (events.length > 0) {
        // console.log(`[EventDispatcher] Processing ${events.length} events...`);
      }

      for (const event of events) {
        await this.handleEvent(event);
      }
    } catch (error) {
      console.error("[EventDispatcher] Error in event loop:", error);
    }
  }

  private async handleEvent(event: any) {
    const handlers = this.handlers.get(event.eventType) || [];
    
    if (handlers.length === 0) {
      // No handlers registered? Mark as processed so we don't loop forever.
      // Alternatively, we could leave it if we expect handlers to be added later.
      // For now, let's mark it processed but log a warning.
      // console.warn(`[EventDispatcher] No handlers for event type: ${event.eventType}`);
      await storage.markEventProcessed(event.id);
      return;
    }

    try {
      // Run all handlers in parallel (or sequential? sequential is safer for now)
      for (const handler of handlers) {
        await handler(event.payload, event.metadata);
      }
      
      await storage.markEventProcessed(event.id);
    } catch (error: any) {
      console.error(`[EventDispatcher] Error processing event ${event.id}:`, error);
      await storage.updateEventRetry(event.id, error.message || String(error));
    }
  }
}

export const eventDispatcher = new EventDispatcher();
