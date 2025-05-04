import { setupDailyJob } from "./parallel-crawl/add-jobs";
import { ServiceFactory } from "./serviceFactory";

async function main() {
  try {
    await setupDailyJob();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await ServiceFactory.shutdown();
  }
}

main();
