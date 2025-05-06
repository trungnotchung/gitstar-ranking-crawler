import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { HttpsProxyAgent } from "https-proxy-agent";
import { config } from "./config";
import { GitHubCommit, GitHubReleaseCommit, GitHubRepo } from "./interfaces";

// Keep track of the current token index
let currentTokenIndex = 0;
let currentProxyIndex = 0;

const GITHUB_STAR_RANKING_URL = 'https://gitstar-ranking.com/repositories/?page={page}';  

/**
 * Get the next GitHub token from the array, rotating through them
 * @returns The next token to use
 */
function getNextToken(): string {
  if (config.github.tokens.length === 0) {
    throw new Error("No GitHub tokens available");
  }
  const token = config.github.tokens[currentTokenIndex];
  currentTokenIndex = (currentTokenIndex + 1) % config.github.tokens.length;
  return token;
}

/**
 * Get the next proxy URL from the array, rotating through them
 * @returns The next proxy URL to use, or undefined if no proxies are configured
 */
function getNextProxy(): string | undefined {
  if (config.proxyUrls.length === 0) {
    return undefined;
  }
  const proxy = config.proxyUrls[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % config.proxyUrls.length;
  return proxy;
}

/**
 * Create an axios instance with GitHub token authentication and optional proxy
 * @returns Configured axios instance
 */
function createAxiosInstance(): AxiosInstance {
  const token = getNextToken();
  const proxyUrl = getNextProxy();
  const config: any = {
    headers: {
      "User-Agent": "axios/1.8.4",
      Authorization: `Bearer ${token}`,
    },
  };

  if (proxyUrl) {
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
  }

  return axios.create(config);
}

/**
 * Make a request with exponential backoff retry
 * @param requestFn - The function that makes the request
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in milliseconds
 * @returns The response from the request
 */
async function makeRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(
          `Request failed (attempt ${attempt + 1}/${maxRetries}):`,
          axiosError.response?.status,
          axiosError.response?.statusText,
          axiosError.response?.data
        );

        // Check if we should retry based on the error
        if (axiosError.response?.status === 403) {
          const resetTime = axiosError.response.headers["x-ratelimit-reset"];
          if (resetTime) {
            const waitTime = Math.max(
              0,
              parseInt(resetTime) * 1000 - Date.now()
            );
            console.log(`Rate limit hit, waiting ${waitTime}ms`);

            // Return a promise that will be resolved after the wait time
            return new Promise((resolve, reject) => {
              setTimeout(async () => {
                try {
                  const result = await makeRequestWithRetry(
                    requestFn,
                    maxRetries - attempt,
                    delay
                  );
                  resolve(result);
                } catch (err) {
                  reject(err);
                }
              }, waitTime);
            });
          }
        }
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for next retry
      }
    }
  }

  throw lastError || new Error("Request failed after all retries");
}

/**
 * Fetch top repositories from GitHub with retry
 * @param numRepos - Number of repositories to fetch
 * @returns Array of GitHub repositories
 */
export async function fetchTopRepos(numRepos: number): Promise<GitHubRepo[]> {
  return makeRequestWithRetry(async () => {
    const axiosInstance = createAxiosInstance();
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
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function paginatedFetchTopRepos(
  numRepos: number
): Promise<GitHubRepo[]> {
  const PER_PAGE = 100;
  const totalPages = Math.ceil(numRepos / PER_PAGE);
  const allRepos: GitHubRepo[] = [];

  for (let page = 1; page <= totalPages; page++) {
    try {
      const pageRepos = await makeRequestWithRetry(async () => {
        const axiosInstance = createAxiosInstance();
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

        return res.data.items.map((r: any) => ({
          full_name: r.full_name,
        }));
      });

      allRepos.push(...pageRepos);
      console.log(`✅ Fetched page ${page}/${totalPages}`);
    } catch (error) {
      console.error(`❌ Failed to fetch page ${page}:`, error);
      break;
    }

    // Delay 1 second to avoid hitting rate limit
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return allRepos;
}

/**
 * Crawl a single page and return all repositories
 * @param page - The page number to crawl
 * @returns Array of repositories or undefined if there's an error
 */
export async function crawlPage(page: number): Promise<GitHubRepo[] | void> {
  const url = GITHUB_STAR_RANKING_URL.replace('{page}', page.toString());
  console.log(`[Thread] Crawling page ${page}...`);

  let response;
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };
    response = await axios.get(url, { headers });
  } catch (error: any) {
    console.error(`Error accessing ${url}: ${error.message}`);
    return;
  }

  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(response.data);
  } catch (error: any) {
    console.error(`Error parsing HTML for page ${page}: ${error.message}`);
    return;
  }

  const repoItems = $('.list-group-item.paginated_item');
  if (repoItems.length === 0) {
    console.log('No repositories found, might have reached the last page!');
    return;
  }

  const pageRepos: GitHubRepo[] = [];

  repoItems.each((_, element) => {
    try {
      const repoLink = $(element).attr('href');
      if (!repoLink || !repoLink.startsWith('/')) return;

      const parts = repoLink.replace(/^\/+/, '').split('/');
      if (parts.length !== 2) return;
      const [repoUser, repoName] = parts;

      const repoStarsText = $(element).find('.stargazers_count').text().trim().replace(/,/g, '') || '0';
      const repoStars = parseInt(repoStarsText, 10);

      pageRepos.push({
        full_name: `${repoUser}/${repoName}`,
      });
    } catch (error: any) {
      console.error(`Skipping a repository due to error: ${error.message}`);
    }
  });

  return pageRepos;
}

/**
 * Crawl top repositories and return all repositories
 * @param numRepos - The number of repositories to crawl
 * @returns Array of all repositories
 */
export async function crawlTopRepos(numRepos: number) { 
  const allRepos: GitHubRepo[] = [];
  const totalPages = Math.ceil(numRepos / 100);
  for (let page = 1; page <= totalPages; page++) {
    const pageRepos = await crawlPage(page);
    if (pageRepos && pageRepos.length > 0) {
      allRepos.push(...pageRepos);
    }
  }
  return allRepos;
}

/**
 * Get commits between two tags for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @param baseTag - The base tag to compare from
 * @param headTag - The head tag to compare to
 * @returns Array of commits between the tags
 */
async function getCommitsBetweenTags(
  repoFullName: string,
  baseTag: string,
  headTag: string
): Promise<GitHubCommit[]> {
  const [owner, repo] = repoFullName.split("/");

  try {
    const commits = await makeRequestWithRetry(async () => {
      const axiosInstance = createAxiosInstance();
      const compareRes: AxiosResponse = await axiosInstance.get(
        `https://api.github.com/repos/${owner}/${repo}/compare/${baseTag}...${headTag}`
      );

      return compareRes.data.commits.map((c: any) => ({
        sha: c.sha,
        commit: {
          message: c.commit.message,
        },
      }));
    });

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
 * @returns Array of releases with their commits
 */
export async function getAllReleasesAndCommits(
  repoFullName: string
): Promise<GitHubReleaseCommit[]> {
  const [owner, repo] = repoFullName.split("/");

  try {
    const releases = await makeRequestWithRetry(async () => {
      const axiosInstance = createAxiosInstance();
      const releasesRes: AxiosResponse = await axiosInstance.get(
        `https://api.github.com/repos/${owner}/${repo}/releases`
      );
      return releasesRes.data;
    });

    if (!releases || releases.length === 0) {
      console.log(`Repo ${repoFullName} has no releases.`);
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
        currentRelease.tag_name
      );

      result.push({
        release: {
          tag_name: currentRelease.tag_name,
          body: currentRelease.body,
        },
        commits,
      });
    }

    return result;
  } catch (err: any) {
    console.error(
      `⚠️ Error getting releases and commits for ${repoFullName}:`,
      err.message
    );
    return [];
  }
}
