import Queue from "bull";
import { config } from "../config";

console.log(`Connecting to Redis at: ${config.redis.url}`);

const repoQueue = new Queue("repo-crawl-queue", config.redis.url);

export default repoQueue;
