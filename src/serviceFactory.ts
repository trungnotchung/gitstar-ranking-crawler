import Bull from "bull";
import { config } from "./config";
import { PrismaClient } from "./generated/prisma";

export class ServiceFactory {
  private static prismaClient: PrismaClient;
  private static repoQueue: Bull.Queue;

  static getPrisma(): PrismaClient {
    if (!this.prismaClient) {
      this.prismaClient = new PrismaClient();
    }
    return this.prismaClient;
  }

  static getRepoQueue(): Bull.Queue {
    if (!this.repoQueue) {
      console.log(`Connecting to Redis at: ${config.redisConfig.url}`);
      this.repoQueue = new Bull("repo-crawl-queue", config.redisConfig.url);
    }
    return this.repoQueue
  }
}