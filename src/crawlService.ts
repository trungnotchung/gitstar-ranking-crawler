import axios, { AxiosInstance, AxiosResponse } from "axios";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import {
  GitHubCommit,
  GitHubRelease,
  GitHubReleaseCommit,
  GitHubRepo,
} from "./interfaces";
import { PROXY_URL_1, PROXY_URL_2, PROXY_URL_3, PROXY_URL_4 } from "./config";
/**
 * Create an axios instance with the specified proxy
 * @param proxyUrl - The proxy URL to use
 * @returns Configured axios instance
 */
function createAxiosInstance(proxyUrl: string): AxiosInstance {
  const agent = new HttpsProxyAgent(proxyUrl);
  return axios.create({
    httpsAgent: agent,
    headers: {
      "User-Agent": "axios/1.8.4",
    },
  });
}

/**
 * Fetch top repositories from GitHub
 * @param numRepos - Number of repositories to fetch
 * @param proxyUrl - The proxy URL to use
 * @returns Array of GitHub repositories
 */
export async function fetchTopRepos(
  numRepos: number,
  proxyUrl: string
): Promise<GitHubRepo[]> {
  const axiosWithProxy = createAxiosInstance(proxyUrl);
  const res: AxiosResponse = await axiosWithProxy.get(
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
  proxyUrl: string
): Promise<GitHubRepo[]> {

  const PER_PAGE = 100;
  const totalPages = Math.ceil(numRepos / PER_PAGE);
  const allRepos: GitHubRepo[] = [];

  for (let page = 1; page <= totalPages; page++) {
    let myProxyUrl = proxyUrl;
    if (page % 4 == 0) {
      myProxyUrl = PROXY_URL_1;
    } else if (page % 4 == 1) {
      myProxyUrl = PROXY_URL_2;
    } else if (page % 4 == 2) {
      myProxyUrl = PROXY_URL_3;
    } else if (page % 4 == 3) {
      myProxyUrl = PROXY_URL_4;
    }
    const axiosWithProxy = createAxiosInstance(proxyUrl);
    try {
      const res = await axiosWithProxy.get("https://api.github.com/search/repositories", {
        params: {
          q: "stars:>1",
          sort: "stars",
          order: "desc",
          per_page: PER_PAGE,
          page,
        },
      });

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
 * @param proxyUrl - The proxy URL to use
 * @returns Array of commits between the tags
 */
async function getCommitsBetweenTags(
  repoFullName: string,
  baseTag: string,
  headTag: string,
  proxyUrl: string
): Promise<GitHubCommit[]> {
  const [owner, repo] = repoFullName.split("/");
  const axiosWithProxy = createAxiosInstance(proxyUrl);

  try {
    const compareRes: AxiosResponse = await axiosWithProxy.get(
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
 * @param proxyUrl - The proxy URL to use
 * @returns Array of releases with their commits
 */
export async function getAllReleasesAndCommits(
  repoFullName: string,
  proxyUrl: string
): Promise<GitHubReleaseCommit[]> {
  const [owner, repo] = repoFullName.split("/");
  const axiosWithProxy = createAxiosInstance(proxyUrl);

  try {
    const releasesRes: AxiosResponse = await axiosWithProxy.get(
      `https://api.github.com/repos/${owner}/${repo}/releases`
    );
    const releases: GitHubRelease[] = releasesRes.data;

    if (!releases || releases.length === 0) {
      console.log(`❌ Repo ${repoFullName} has no releases.`);
      return [];
    }

    const result: GitHubReleaseCommit[] = [];

    // log releases length
    // console.log(`releases length: ${releases.length}`);

    // Get commits for each release
    for (let i = 0; i < releases.length; i++) {
      const currentRelease = releases[i];
      const nextRelease = releases[i + 1];

      // For the last release, we can't compare with next release
      if (!nextRelease) {
        console.log(`ℹ️ Last release reached: ${currentRelease.tag_name}`);
        continue;
      }

      // console.log(`currentRelease: ${currentRelease.tag_name}`);
      // console.log(`nextRelease: ${nextRelease.tag_name}`);

      const commits = await getCommitsBetweenTags(
        repoFullName,
        nextRelease.tag_name,
        currentRelease.tag_name,
        proxyUrl
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

// getAllReleasesAndCommits("mrdoob/three.js", PROXY_URL_3);
