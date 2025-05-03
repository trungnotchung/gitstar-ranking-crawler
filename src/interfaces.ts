export interface GitHubRelease {
  name: string;
  body: string;
  published_at: string;
  target_commitish: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface ReleaseInfo {
  title: string;
  description: string;
  published_at: string;
  target_commitish: string;
  commits: Commit[];
}
