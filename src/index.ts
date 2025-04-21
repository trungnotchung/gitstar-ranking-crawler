import { fetchReleasesWithCommits } from './githubReleases';
import { upsertRepoWithReleasesAndCommits } from './dbService';
import { ENV } from './config/environment';

const owner = 'vercel';
const repo = 'next.js';

(async () => {
  try {
    const data = await fetchReleasesWithCommits(owner, repo, ENV.GITHUB_TOKEN);
    await upsertRepoWithReleasesAndCommits(owner, repo, data);
    console.log('Data inserted successfully!');
  } catch (error) {
    console.error('❌ Error inserting data:', error);
  }
})();