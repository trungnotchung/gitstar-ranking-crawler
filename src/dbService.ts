import { Prisma } from '@prisma/client';
import { PrismaClient } from './generated/prisma';
import {
  GitHubReleaseCommit,
  GitHubRepo,
  GitHubCommit,
  GitHubRelease
} from './interfaces'; // Cập nhật đúng đường dẫn

const prisma = new PrismaClient();

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
        where: { title_repoId: { title: release.tag_name, repoId: repo.id } },
        update: {},
        create: {
          title: release.tag_name,
          description: release.body,
          publishedAt: new Date(),
          targetCommitish: '',
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
            author: 'unknown',
            date: new Date(),
            releaseId: releaseRecord.id,
          },
        });
      }
    }

    return { success: true };
  });
}
