import { PROXY_URL_1 } from "./config";
import { paginatedFetchTopRepos } from "./crawlService";
import { PrismaClient } from "./generated/prisma";
import { GitHubRepo } from "./interfaces"; // interface { full_name: string }

const prisma = new PrismaClient();

(async () => {
  try {
    const repos: GitHubRepo[] = await paginatedFetchTopRepos(5000, PROXY_URL_1);

    for (const repo of repos) {
      const [owner, name] = repo.full_name.split("/");
      await prisma.repo.upsert({
        where: { name_owner: { name, owner } },
        update: {},
        create: { name, owner },
      });
    }

    console.log("✅ Data inserted successfully!");
  } catch (error) {
    console.error("❌ Error inserting data:", error);
  } finally {
    await prisma.$disconnect();
  }
})();
