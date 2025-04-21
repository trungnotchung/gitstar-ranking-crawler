import { fetchReleasesWithCommits } from './githubReleases';
import { upsertRepoWithReleasesAndCommits } from './dbService';
import { GITHUB_CONFIG } from './config';

const owner = 'vercel';
const repo = 'next.js';

(async () => {
  try {
    const data = await fetchReleasesWithCommits(owner, repo, GITHUB_CONFIG.github_token);
    await upsertRepoWithReleasesAndCommits(owner, repo, data);
    console.log('Data inserted successfully!');
  } catch (error) {
    console.error('❌ Error inserting data:', error);
  }
})();