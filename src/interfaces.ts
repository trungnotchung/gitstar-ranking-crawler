export interface GitHubRepo {
    full_name: string;
}

export interface GitHubRelease {
    tag_name: string;
    body: string;
}

export interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
    };
}

export interface GitHubReleaseCommit {
    release: GitHubRelease;
    commits: GitHubCommit[];
}
