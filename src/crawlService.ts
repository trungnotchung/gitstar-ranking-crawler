import axios, { AxiosInstance, AxiosResponse } from "axios";
import fs from "fs";
import {
  GitHubCommit,
  GitHubRelease,
  GitHubReleaseCommit,
  GitHubRepo,
} from "./interfaces";
/**
 * Create an axios instance with GitHub token authentication
 * @param githubToken - The GitHub token to use for authentication
 * @returns Configured axios instance
 */
function createAxiosInstance(githubToken: string): AxiosInstance {
  return axios.create({
    headers: {
      "User-Agent": "axios/1.8.4",
      Authorization: `Bearer ${githubToken}`,
    },
  });
}

/**
 * Fetch top repositories from GitHub
 * @param numRepos - Number of repositories to fetch
 * @param githubToken - The GitHub token to use for authentication
 * @returns Array of GitHub repositories
 */
export async function fetchTopRepos(
  numRepos: number,
  githubToken: string
): Promise<GitHubRepo[]> {
  const axiosInstance = createAxiosInstance(githubToken);
  const res: AxiosResponse = await axiosInstance.get(
    "https://api.github.com/search/repositories",
    {
      params: {
        q: "stars:>1",
        sort: "stars",
        order: "desc",
        per_page: numRepos,
        page: 1,
      },
    }
  );

  return res.data.items;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function paginatedFetchTopRepos(
  numRepos: number,
  githubToken: string
): Promise<GitHubRepo[]> {
  const PER_PAGE = 100;
  const totalPages = Math.ceil(numRepos / PER_PAGE);
  const allRepos: GitHubRepo[] = [];

  for (let page = 1; page <= totalPages; page++) {
    const axiosInstance = createAxiosInstance(githubToken);
    try {
      const res = await axiosInstance.get(
        "https://api.github.com/search/repositories",
        {
          params: {
            q: "stars:>1",
            sort: "stars",
            order: "desc",
            per_page: PER_PAGE,
            page,
          },
        }
      );

      const pageRepos = res.data.items.map((r: any) => ({
        full_name: r.full_name,
      }));

      allRepos.push(...pageRepos);

      console.log(`✅ Fetched page ${page}/${totalPages}`);
    } catch (error) {
      console.error(`❌ Failed to fetch page ${page}:`, error);
      break;
    }

    // Delay 1 second to avoid hitting rate limit
    await delay(1000);
  }

  return allRepos;
}

/**
 * Get commits between two tags for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @param baseTag - The base tag to compare from
 * @param headTag - The head tag to compare to
 * @param githubToken - The GitHub token to use for authentication
 * @returns Array of commits between the tags
 */
async function getCommitsBetweenTags(
  repoFullName: string,
  baseTag: string,
  headTag: string,
  githubToken: string
): Promise<GitHubCommit[]> {
  const [owner, repo] = repoFullName.split("/");
  const axiosInstance = createAxiosInstance(githubToken);

  try {
    const compareRes: AxiosResponse = await axiosInstance.get(
      `https://api.github.com/repos/${owner}/${repo}/compare/${baseTag}...${headTag}`
    );

    const commits: GitHubCommit[] = compareRes.data.commits.map((c: any) => ({
      sha: c.sha,
      commit: {
        message: c.commit.message,
      },
    }));

    return commits;
  } catch (err: any) {
    console.error(
      `⚠️ Error getting commits between ${baseTag} and ${headTag} for ${repoFullName}:`,
      err.message
    );
    return [];
  }
}

/**
 * Get all releases and their commits for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @param githubToken - The GitHub token to use for authentication
 * @returns Array of releases with their commits
 */
export async function getAllReleasesAndCommits(
  repoFullName: string,
  githubToken: string
): Promise<GitHubReleaseCommit[]> {
  const [owner, repo] = repoFullName.split("/");
  const axiosInstance = createAxiosInstance(githubToken);

  try {
    const releasesRes: AxiosResponse = await axiosInstance.get(
      `https://api.github.com/repos/${owner}/${repo}/releases`
    );
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

      // For the last release, we can't compare with next release
      if (!nextRelease) {
        console.log(`ℹ️ Last release reached: ${currentRelease.tag_name}`);
        continue;
      }

      const commits = await getCommitsBetweenTags(
        repoFullName,
        nextRelease.tag_name,
        currentRelease.tag_name,
        githubToken
      );

      result.push({
        release: {
          tag_name: currentRelease.tag_name,
          body: currentRelease.body,
        },
        commits,
      });
    }

    // Read existing cache
    const cacheFile = "cache.json";
    let cache: Record<string, GitHubReleaseCommit[]> = {};
    if (fs.existsSync(cacheFile)) {
      cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    }

    // Update cache with new data
    cache[repoFullName] = result;
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

    return result;
  } catch (err: any) {
    console.error(
      `⚠️ Error getting releases and commits for ${repoFullName}:`,
      err.message
    );
    return [];
  }
}
