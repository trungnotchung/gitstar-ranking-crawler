import { Prisma } from '@prisma/client';
import {
  GitHubReleaseCommit,
} from './interfaces';
import { ServiceFactory } from './serviceFactory';

const prisma = ServiceFactory.getPrisma();

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Transaction failed after maximum retries');
}

function shouldRetry(error: any): boolean {
  // Customize based on the errors you want to retry on
  return error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError;
}

export async function upsertRepoWithReleasesAndCommits(
  owner: string,
  repoName: string,
  releasesWithCommits: GitHubReleaseCommit[]
) {
  return await executeWithRetry(async () => {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Upsert Repo
      const repo = await tx.repo.upsert({
        where: { name_owner: { name: repoName, owner } },
        update: {},
        create: {
          name: repoName,
          owner,
        },
      });

      for (const relCommit of releasesWithCommits) {
        const { release, commits } = relCommit;

        // Upsert Release
        const releaseRecord = await tx.release.upsert({
          where: { tagname_repoId: { tagName: release.tag_name, repoId: repo.id } },
          update: {},
          create: {
            tagName: release.tag_name,
            body: release.body,
            repoId: repo.id,
          },
        });

        for (const commit of commits) {
          await tx.commit.upsert({
            where: { sha: commit.sha },
            update: {},
            create: {
              sha: commit.sha,
              message: commit.commit.message,
              releaseId: releaseRecord.id,
            },
          });
        }
      }

      return { success: true };
    }, {
      maxWait: 5000,
      timeout: 90000
    });
  });
}
