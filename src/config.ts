import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

function loadConfig() {
  const githubTokens = process.env.GITHUB_TOKENS
    ? process.env.GITHUB_TOKENS.split(",")
        .map((token: string) => token.trim())
        .filter(Boolean)
    : [];

  if (githubTokens.length === 0) {
    throw new Error(
      "No GitHub tokens provided. Please set GITHUB_TOKENS environment variable with comma-separated tokens."
    );
  }

  return {
    redis: {
      host: process.env.REDIS_HOST || "redis",
      port: process.env.REDIS_PORT || "6379",
      url:
        process.env.REDIS_URL ||
        "redis://" +
          (process.env.REDIS_HOST || "redis") +
          ":" +
          (process.env.REDIS_PORT || "6379"),
    },
    postreg: {
      database_url: process.env.DATABASE_URL || "",
    },
    github: {
      tokens: githubTokens,
    },
  };
}

export const config = loadConfig();
