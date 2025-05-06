import { Prisma } from "@prisma/client";
import { GitHubReleaseCommit } from "./interfaces";
import { ServiceFactory } from "./serviceFactory";

const prisma = ServiceFactory.getPrisma();

// Configuration for batch sizes
const BATCH_SIZE = 100;

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
  throw new Error("Transaction failed after maximum retries");
}

function shouldRetry(error: any): boolean {
  // Customize based on the errors you want to retry on
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError
  );
}

export async function upsertRepoWithReleasesAndCommits(
  owner: string,
  repoName: string,
  releasesWithCommits: GitHubReleaseCommit[]
) {
  return await executeWithRetry(async () => {
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Upsert Repo
        const repo = await tx.repo.upsert({
          where: { name_owner: { name: repoName, owner } },
          update: {},
          create: {
            name: repoName,
            owner,
          },
        });

        if (releasesWithCommits.length === 0) {
          return { success: true };
        }

        // Prepare data for batch operations
        const releasesData = releasesWithCommits.map((rc) => ({
          tagName: rc.release.tag_name,
          body: rc.release.body,
          repoId: repo.id,
        }));

        // Batch upsert releases
        await Promise.all(
          releasesData.map((release) =>
            tx.release.upsert({
              where: {
                tagname_repoId: {
                  tagName: release.tagName,
                  repoId: release.repoId,
                },
              },
              create: release,
              update: release,
            })
          )
        );

        // Get all releases for this repo to map commits
        const releases = await tx.release.findMany({
          where: { repoId: repo.id },
          select: { id: true, tagName: true },
        });

        // Create a map of tagName to releaseId for faster lookups
        const releaseMap = new Map(releases.map((r) => [r.tagName, r.id]));

        // Prepare commits data for batch operation
        const allCommits = releasesWithCommits.flatMap((rc) =>
          rc.commits.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            releaseId: releaseMap.get(rc.release.tag_name)!,
          }))
        );

        // Process commits in batches
        for (let i = 0; i < allCommits.length; i += BATCH_SIZE) {
          const batchCommits = allCommits.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batchCommits.map((commit) =>
              tx.commit.upsert({
                where: { sha: commit.sha },
                create: commit,
                update: commit,
              })
            )
          );
        }

        return { success: true };
      },
      {
        maxWait: 5000,
        timeout: 120000, // Increased timeout for large batches
      }
    );
  });
}
