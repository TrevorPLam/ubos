import { eventDispatcher } from "../../services/event-dispatcher";
import { logger } from "../../logger";

/**
 * Workflow Engine
 * 
 * Automates business processes by listening to events from the Event Bus.
 * 
 * Architecture:
 * - Subscribes to events via EventDispatcher
 * - Executes business logic (handlers)
 * - Can emit new events (chaining)
 */
export class WorkflowEngine {
  
  public initialize() {
    logger.info("Initializing Workflow Engine...", { source: "WORKFLOW" });
    this.registerHandlers();
  }

  private registerHandlers() {
    // Workflow: Log significant deal changes
    eventDispatcher.register("deal.updated", async (payload: any, metadata: any) => {
      const deal = payload;
      logger.info(`[Workflow] Processing deal update for ${deal.id}`, { 
          source: "WORKFLOW",
          stage: deal.stage
      });

      if (deal.stage === "won") {
        logger.info(`[Workflow] Deal Won! Triggering post-sales automation...`, {
             source: "WORKFLOW",
             dealId: deal.id
        });
        // Future: Create Contract, Create Engagement, Notify Team
      }
    });

    // Workflow: Audit Trail for new Deals
    eventDispatcher.register("deal.created", async (payload: any, metadata: any) => {
        logger.info(`[Workflow] New Deal Created: ${payload.name}`, {
            source: "WORKFLOW",
            dealId: payload.id
        });
    });
  }
}

export const workflowEngine = new WorkflowEngine();
