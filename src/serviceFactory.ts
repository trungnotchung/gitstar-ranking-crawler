import Bull from "bull";
import { config } from "./config";
import { PrismaClient } from "./generated/prisma";

export class ServiceFactory {
  private static prismaClient: PrismaClient | null = null;
  private static repoQueue: Bull.Queue | null = null;

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

  public static async shutdown(): Promise<void> {
    if (this.prismaClient) {
      console.log("Disconnecting Prisma...");
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
    }

    if (this.repoQueue) {
      console.log("Closing Bull queue...");
      await this.repoQueue.close();
      this.repoQueue = null;
    }
  }
}