// src/dbService.ts
import { Prisma } from "@prisma/client";
import { PrismaClient } from "./generated/prisma";
import { GitHubReleaseCommit } from "./interfaces";
const prisma = new PrismaClient();

export async function upsertRepoWithReleasesAndCommits(
  owner: string,
  repoName: string,
  releases: GitHubReleaseCommit[]
) {
  // return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  //   // Upsert Repo
  //   const repo = await tx.repo.upsert({
  //     where: { name_owner: { name: repoName, owner } },
  //     update: {},
  //     create: {
  //       name: repoName,
  //       owner,
  //     },
  //   });
  //   for (const rel of releases) {
  //     // Upsert Release
  //     const release = await tx.release.upsert({
  //       where: { title_repoId: { title: rel.title, repoId: repo.id } },
  //       update: {},
  //       create: {
  //         title: rel.title,
  //         description: rel.description,
  //         publishedAt: new Date(rel.published_at),
  //         targetCommitish: rel.target_commitish,
  //         repoId: repo.id,
  //       },
  //     });
  //     for (const c of rel.commits) {
  //       // Upsert Commit
  //       await tx.commit.upsert({
  //         where: { sha: c.sha },
  //         update: {},
  //         create: {
  //           sha: c.sha,
  //           message: c.message,
  //           author: c.author,
  //           date: new Date(c.date),
  //           releaseId: release.id,
  //         },
  //       });
  //     }
  //   }
  //   return { success: true };
  // });
}
