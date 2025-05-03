import axios from "axios";
import { GitHubCommit, GitHubRelease, ReleaseInfo, Commit } from "./interfaces";

const GITHUB_API = "https://api.github.com";

export async function fetchReleasesWithCommits(
  owner: string,
  repo: string,
  token?: string
): Promise<ReleaseInfo[]> {
  const headers = token ? { Authorization: `token ${token}` } : {};

  const releasesRes = await axios.get<GitHubRelease[]>(
    `${GITHUB_API}/repos/${owner}/${repo}/releases`,
    { headers }
  );
  const releases = releasesRes.data;

  const result: ReleaseInfo[] = [];

  for (const release of releases) {
    const { name, body, published_at, target_commitish } = release;

    const commitsRes = await axios.get<GitHubCommit[]>(
      `${GITHUB_API}/repos/${owner}/${repo}/commits`,
      {
        headers,
        params: {
          sha: target_commitish,
          per_page: 10,
        },
      }
    );

    const commits: Commit[] = commitsRes.data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
    }));

    result.push({
      title: name,
      description: body,
      published_at,
      target_commitish,
      commits,
    });
  }

  return result;
}
