import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import dotenv from 'dotenv';

dotenv.config();

const proxy = `http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
const agent = new HttpsProxyAgent(proxy);

const axiosWithProxy: AxiosInstance = axios.create({
  httpsAgent: agent,
  headers: {
    'User-Agent': 'axios/1.8.4',
    // Authorization: `token ${process.env.GITHUB_TOKEN}` 
  }
});

interface GitHubRepo {
  full_name: string;
}

interface GitHubRelease {
  tag_name: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
  };
}

/**
 * Fetch top repositories from GitHub
 * @param numRepos - Number of repositories to fetch
 * @returns Array of GitHub repositories
 */
async function fetchTopRepos(numRepos: number): Promise<GitHubRepo[]> {
  const res: AxiosResponse = await axiosWithProxy.get("https://api.github.com/search/repositories", {
    params: {
      q: "stars:>1",
      sort: "stars",
      order: "desc",
      per_page: numRepos,
      page: 1, // TODO: change to 100
    }
  });

  return res.data.items;
}

/**
 * Fetch the latest release for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @returns Latest release information or null if no releases found
 */
async function fetchReleases(repoFullName: string): Promise<GitHubRelease | null> {
  const [owner, repo] = repoFullName.split("/");

  try {
    const checkRes: AxiosResponse = await axiosWithProxy.get(`https://api.github.com/repos/${owner}/${repo}/releases`);
    const allReleases: GitHubRelease[] = checkRes.data;

    if (!allReleases || allReleases.length === 0) {
      console.log(`❌ Repo ${repoFullName} has no releases.`);
      return null;
    }

    const res: AxiosResponse = await axiosWithProxy.get(`https://api.github.com/repos/${repoFullName}/releases/latest`);
    return res.data;

  } catch (err: any) {
    console.error(`⚠️ Error when fetching release for ${repoFullName}:`, err.message);
    return null;
  }
}

/**
 * Get commits in the latest release for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @returns Array of commits or null if not enough releases found
 */
async function getCommitsInLatestRelease(repoFullName: string): Promise<{ hash: string, message: string }[] | null> {
  const [owner, repo] = repoFullName.split("/");

  try {
    const releasesRes: AxiosResponse = await axiosWithProxy.get(`https://api.github.com/repos/${owner}/${repo}/releases`);
    const releases: GitHubRelease[] = releasesRes.data;

    if (releases.length < 2) {
      console.log(`Not enough releases to compare for ${repoFullName}`);
      return null;
    }

    const latestTag = releases[0].tag_name;
    const previousTag = releases[1].tag_name;

    const compareRes: AxiosResponse = await axiosWithProxy.get(
      `https://api.github.com/repos/${owner}/${repo}/compare/${previousTag}...${latestTag}`
    );

    const commits: GitHubCommit[] = compareRes.data.commits;

    return commits.map(c => ({
      hash: c.sha,
      message: c.commit.message.split("\n")[0],
    }));
  } catch (err: any) {
    console.error(`⚠️ Error getting commits for ${repoFullName}:`, err.message);
    return null;
  }
}

/**
 * Crawl GitHub to fetch top repositories, their latest releases, and commits
 * @param numRepos - Number of repositories to fetch
 */
export async function crawl(numRepos: number): Promise<void> {
  const topRepos = await fetchTopRepos(numRepos);
  for (const repo of topRepos) {
    console.log(repo.full_name);
    const release = await fetchReleases(repo.full_name);
    if (release) {
      const commits = await getCommitsInLatestRelease(repo.full_name);
      if (commits) {
        console.log(commits);
      }
    }
  }
}

// crawl(11);
