import Queue from "bull";
import { config } from "../config";

console.log(`Connecting to Redis at: ${config.redisConfig.url}`);

const repoQueue = new Queue("repo-crawl-queue", config.redisConfig.url);

export default repoQueue;
