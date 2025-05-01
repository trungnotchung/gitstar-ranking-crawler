/*
  Warnings:

  - The primary key for the `Commit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Release` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `date` on the `Release` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `Release` table. All the data in the column will be lost.
  - The primary key for the `Repo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `full_name` on the `Repo` table. All the data in the column will be lost.
  - You are about to drop the column `rank` on the `Repo` table. All the data in the column will be lost.
  - You are about to drop the column `stars` on the `Repo` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[title,repoId]` on the table `Release` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,owner]` on the table `Repo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `author` to the `Commit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Release` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publishedAt` to the `Release` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetCommitish` to the `Release` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Release` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Repo` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Commit" DROP CONSTRAINT "Commit_releaseId_fkey";

-- DropForeignKey
ALTER TABLE "Release" DROP CONSTRAINT "Release_repoId_fkey";

-- AlterTable
ALTER TABLE "Commit" DROP CONSTRAINT "Commit_pkey",
ADD COLUMN     "author" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "releaseId" DROP NOT NULL,
ALTER COLUMN "releaseId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Commit_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Commit_id_seq";

-- AlterTable
ALTER TABLE "Release" DROP CONSTRAINT "Release_pkey",
DROP COLUMN "date",
DROP COLUMN "version",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "publishedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "targetCommitish" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "repoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Release_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Release_id_seq";

-- AlterTable
ALTER TABLE "Repo" DROP CONSTRAINT "Repo_pkey",
DROP COLUMN "full_name",
DROP COLUMN "rank",
DROP COLUMN "stars",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Repo_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Repo_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "Release_title_repoId_key" ON "Release"("title", "repoId");

-- CreateIndex
CREATE UNIQUE INDEX "Repo_name_owner_key" ON "Repo"("name", "owner");

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;
