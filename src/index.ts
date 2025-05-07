import { BenchmarkService } from "./benchmarkService";
import { setupDailyJob } from "./parallel-crawl/add-jobs";
import { ServiceFactory } from "./serviceFactory";

async function main() {
  try {
    // Reset benchmark stats before starting
    BenchmarkService.getInstance().reset();
    await setupDailyJob();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await ServiceFactory.shutdown();
  }
}

main();
