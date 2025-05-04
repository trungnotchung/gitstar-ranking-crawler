import { Prisma } from '@prisma/client';
import {
  GitHubReleaseCommit,
} from './interfaces';
import { ServiceFactory } from './serviceFactory';

const prisma = ServiceFactory.getPrisma();

export async function upsertRepoWithReleasesAndCommits(
  owner: string,
  repoName: string,
  releasesWithCommits: GitHubReleaseCommit[]
) {
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
  });
}
