/*
  Warnings:

  - You are about to drop the column `author` on the `Commit` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Commit` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Release` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `Release` table. All the data in the column will be lost.
  - You are about to drop the column `targetCommitish` on the `Release` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Release` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tagName,repoId]` on the table `Release` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `body` to the `Release` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tagName` to the `Release` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Release_title_repoId_key";

-- AlterTable
ALTER TABLE "Commit" DROP COLUMN "author",
DROP COLUMN "date";

-- AlterTable
ALTER TABLE "Release" DROP COLUMN "description",
DROP COLUMN "publishedAt",
DROP COLUMN "targetCommitish",
DROP COLUMN "title",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "tagName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Release_tagName_repoId_key" ON "Release"("tagName", "repoId");
