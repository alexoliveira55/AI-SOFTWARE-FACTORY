import { run } from "./orchestrator/orchestrator";
import { logger } from "./utils/logger";

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Fatal error: ${message}`);
  process.exit(1);
});