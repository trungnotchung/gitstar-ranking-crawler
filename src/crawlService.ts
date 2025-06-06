import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { config } from "./config";
import { GitHubCommit, GitHubReleaseCommit, GitHubRepo } from "./interfaces";

// Keep track of the current token index
let currentTokenIndex = 0;

const GITHUB_STAR_RANKING_URL =
  "https://gitstar-ranking.com/repositories/?page={page}";

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
 * Create an axios instance with GitHub token authentication
 * @returns Configured axios instance
 */
function createAxiosInstance(): AxiosInstance {
  const token = getNextToken();
  const config: any = {
    headers: {
      "User-Agent": "axios/1.8.4",
      Authorization: `Bearer ${token}`,
    },
  };

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
  initialDelay: number = 500
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
        // Skip retries for 422 and 404 errors
        if (
          axiosError.response?.status === 422 ||
          axiosError.response?.status === 404
        ) {
          // console.log(
          //   `ℹ️ Skipping retry for ${axiosError.response?.status} error`
          // );
          throw error;
        }

        // console.error(
        //   // `Request failed (attempt ${attempt + 1}/${maxRetries}):`,
        //   axiosError.response?.status,
        //   axiosError.response?.statusText,
        //   axiosError.response?.data
        // );

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
        // console.log(`Retrying in ${delay}ms...`);
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
  const url = GITHUB_STAR_RANKING_URL.replace("{page}", page.toString());
  console.log(`[Thread] Crawling page ${page}...`);

  let response;
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
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

  const repoItems = $(".list-group-item.paginated_item");
  if (repoItems.length === 0) {
    console.log("No repositories found, might have reached the last page!");
    return;
  }

  const pageRepos: GitHubRepo[] = [];

  repoItems.each((_, element) => {
    try {
      const repoLink = $(element).attr("href");
      if (!repoLink || !repoLink.startsWith("/")) return;

      const parts = repoLink.replace(/^\/+/, "").split("/");
      if (parts.length !== 2) return;
      const [repoUser, repoName] = parts;

      const repoStarsText =
        $(element).find(".stargazers_count").text().trim().replace(/,/g, "") ||
        "0";
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
    if (err.response?.status === 422) {
      console.log(
        // `ℹ️ Skipping comparison between ${baseTag} and ${headTag} for ${repoFullName} due to diff generation timeout`
      );
      return [];
    }
    if (err.response?.status === 404) {
      console.log(
        // `ℹ️ Skipping comparison between ${baseTag} and ${headTag} for ${repoFullName} due to no common ancestor`
      );
      return [];
    }
    console.error(
      // `⚠️ Error getting commits between ${baseTag} and ${headTag} for ${repoFullName}:`,
      err.message
    );
    return [];
  }
}

/**
 * Get all tags for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @returns Array of tags
 */
async function getAllTags(repoFullName: string): Promise<any[]> {
  const [owner, repo] = repoFullName.split("/");

  try {
    const tags = await makeRequestWithRetry(async () => {
      const axiosInstance = createAxiosInstance();
      const tagsRes: AxiosResponse = await axiosInstance.get(
        `https://api.github.com/repos/${owner}/${repo}/tags`
      );
      return tagsRes.data;
    });

    return tags;
  } catch (err: any) {
    console.error(
      `⚠️ Error getting tags for ${repoFullName}:`,
      err.message
    );
    return [];
  }
}

/**
 * Get all commits for a given repository
 * @param repoFullName - Full name of the repository (e.g. "owner/repo")
 * @returns Array of commits
 */
async function getAllCommits(repoFullName: string): Promise<GitHubCommit[]> {
  const [owner, repo] = repoFullName.split("/");

  try {
    const commits = await makeRequestWithRetry(async () => {
      const axiosInstance = createAxiosInstance();
      const commitsRes: AxiosResponse = await axiosInstance.get(
        `https://api.github.com/repos/${owner}/${repo}/commits`
      );
      return commitsRes.data.map((c: any) => ({
        sha: c.sha,
        commit: {
          message: c.commit.message,
        },
      }));
    });

    return commits;
  } catch (err: any) {
    console.error(
      `⚠️ Error getting commits for ${repoFullName}:`,
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
    // First try to get releases
    const releases = await makeRequestWithRetry(async () => {
      const axiosInstance = createAxiosInstance();
      const releasesRes: AxiosResponse = await axiosInstance.get(
        `https://api.github.com/repos/${owner}/${repo}/releases`
      );
      return releasesRes.data;
    });

    // If we have releases, process them as before
    if (releases && releases.length > 0) {
      const result: GitHubReleaseCommit[] = [];

      for (let i = 0; i < releases.length; i++) {
        const currentRelease = releases[i];
        const nextRelease = releases[i + 1];

        if (!nextRelease) {
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
    }

    // If no releases, try to get tags
    // console.log(`No releases found for ${repoFullName}, trying tags...`);
    const tags = await getAllTags(repoFullName);

    if (tags && tags.length > 0) {
      const result: GitHubReleaseCommit[] = [];

      for (let i = 0; i < tags.length; i++) {
        const currentTag = tags[i];
        const nextTag = tags[i + 1];

        if (!nextTag) {
          continue;
        }
        
        const commits = await getCommitsBetweenTags(
          repoFullName,
          nextTag.name,
          currentTag.name
        );

        result.push({
          release: {
            tag_name: currentTag.name,
            body: "", // Tags don't have release notes
          },
          commits,
        });
      }
      console.log(`[Thread] Found ${result.length} tags for ${repoFullName}`);
      return result;
    }

    // If no tags either, get all commits
    // console.log(`No tags found for ${repoFullName}, getting all commits...`);
    const commits = await getAllCommits(repoFullName);
    console.log(`[Thread] Found ${commits.length} commits for ${repoFullName}`);

    return [{
      release: {
        tag_name: "all",
        body: "All commits in repository",
      },
      commits,
    }];

  } catch (err: any) {
    console.error(
      `⚠️ Error getting releases and commits for ${repoFullName}:`,
      err.message
    );
    return [];
  }
}
