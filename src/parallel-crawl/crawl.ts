import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { PROXY_CONFIG, getProxyUrl } from '../config';
import { GitHubRepo, GitHubRelease, GitHubCommit, GitHubReleaseCommit } from './interfaces';
import fs from 'fs';

const proxy = getProxyUrl();
const agent = new HttpsProxyAgent(proxy);

const axiosWithProxy: AxiosInstance = axios.create({
  httpsAgent: agent,
  headers: {
    'User-Agent': 'axios/1.8.4',
    // Authorization: `token ${process.env.GITHUB_TOKEN}` 
  }
});

/**
 * Fetch top repositories from GitHub
 * @param numRepos - Number of repositories to fetch
 * @returns Array of GitHub repositories
 */
export async function fetchTopRepos(numRepos: number): Promise<GitHubRepo[]> {
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
    const latestRelease: GitHubRelease = {
      tag_name: res.data.tag_name,
      body: res.data.body,
    }
    return latestRelease;
  } catch (err: any) {
    console.error(`⚠️ Error when fetching release for ${repoFullName}:`, err.message);
    return null;
  }
}

/**
 * Get commits between two tags for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @param baseTag - The base tag to compare from
 * @param headTag - The head tag to compare to
 * @returns Array of commits between the tags
 */
async function getCommitsBetweenTags(repoFullName: string, baseTag: string, headTag: string): Promise<GitHubCommit[]> {
  const [owner, repo] = repoFullName.split("/");

  try {
    const compareRes: AxiosResponse = await axiosWithProxy.get(
      `https://api.github.com/repos/${owner}/${repo}/compare/${baseTag}...${headTag}`
    );

    const commits: GitHubCommit[] = compareRes.data.commits.map((c: any) => ({
      sha: c.sha,
      commit: {
        message: c.commit.message
      }
    }));

    return commits;
  } catch (err: any) {
    console.error(`⚠️ Error getting commits between ${baseTag} and ${headTag} for ${repoFullName}:`, err.message);
    return [];
  }
}

/**
 * Get all releases and their commits for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @returns Array of releases with their commits
 */
export async function getAllReleasesAndCommits(repoFullName: string): Promise<GitHubReleaseCommit[]> {
  const [owner, repo] = repoFullName.split("/");

  try {
    const releasesRes: AxiosResponse = await axiosWithProxy.get(`https://api.github.com/repos/${owner}/${repo}/releases`);
    const releases: GitHubRelease[] = releasesRes.data;

    if (!releases || releases.length === 0) {
      console.log(`❌ Repo ${repoFullName} has no releases.`);
      return [];
    }

    const result: GitHubReleaseCommit[] = [];
    
    // Get commits for each release
    for (let i = 0; i < releases.length; i++) {
      const currentRelease = releases[i];
      const nextRelease = releases[i + 1];

      // console.log("currentRelease: ", currentRelease.tag_name);
      // console.log("nextRelease: ", nextRelease?.tag_name);
      // if nextRelease is null we continue
      if (!nextRelease) {
        continue;
      }

      const commits = await getCommitsBetweenTags(repoFullName, nextRelease.tag_name, currentRelease.tag_name);

      result.push({
        release: {
          tag_name: currentRelease.tag_name,
          body: currentRelease.body,
        },
        commits
      });
    }
    // write result to file
    fs.writeFileSync(`${repoFullName.replace('/', '-')}.json`, JSON.stringify(result, null, 2));
    return result;
  } catch (err: any) {
    console.error(`⚠️ Error getting releases and commits for ${repoFullName}:`, err.message);
    return [];
  }
}

// getAllReleasesAndCommits("facebook/react"); 
