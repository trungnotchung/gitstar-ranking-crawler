import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

function loadConfig() {
  const DEFAULT_PROXY_URL = "http://kmkydmkb:zu4v5jde2wij@216.10.27.159:6837";
  const proxyUrls = process.env.PROXY_URLS
    ? process.env.PROXY_URLS.split(",")
        .map((url: string) => url.trim())
        .filter(Boolean)
    : [DEFAULT_PROXY_URL];

  return {
    proxyUrls: proxyUrls,
    redisConfig: {
      host: process.env.REDIS_HOST || "redis",
      port: process.env.REDIS_PORT || "6379",
      url:
        process.env.REDIS_URL ||
        "redis://" +
          (process.env.REDIS_HOST || "redis") +
          ":" +
          (process.env.REDIS_PORT || "6379"),
    },
    dbConfig: {
      database_url: process.env.DATABASE_URL || "",
    },
    githubConfig: {
      github_token: process.env.GITHUB_TOKEN || "",
    },
  };
}

export const config = loadConfig();
