import Bull from 'bull';

const repoQueue = new Bull('repo-crawl-queue', {
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
});

export default repoQueue;
