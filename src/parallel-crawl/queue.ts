import Queue from 'bull';
import dotenv from 'dotenv';

// dotenv.config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || '6379';
const redisUrl = process.env.REDIS_URL || 'redis://'+redisHost+':'+redisPort;

console.log(`Connecting to Redis at: ${redisUrl}`);

const repoQueue = new Queue('repo-crawl-queue', redisUrl);

export default repoQueue;
