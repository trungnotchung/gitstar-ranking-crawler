import Queue from 'bull';
import { REDIS_CONFIG } from '../config';

console.log(`Connecting to Redis at: ${REDIS_CONFIG.url}`);

const repoQueue = new Queue('repo-crawl-queue', REDIS_CONFIG.url);

export default repoQueue;
