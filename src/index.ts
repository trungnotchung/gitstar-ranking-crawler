import {
  getAllReleasesAndCommits,
  paginatedFetchTopRepos,
} from "./crawlService";
import { upsertRepoWithReleasesAndCommits } from "./dbService";
import { GitHubRepo } from "./interfaces";
import { ServiceFactory } from "./serviceFactory";

(async () => {
  try {
    const repos: GitHubRepo[] = await paginatedFetchTopRepos(5000);

    for (const repo of repos) {
      const releasesWithCommits = await getAllReleasesAndCommits(
        repo.full_name
      );
      const [owner, name] = repo.full_name.split("/");
      await upsertRepoWithReleasesAndCommits(owner, name, releasesWithCommits);
    }

    console.log("✅ Data inserted successfully!");
  } catch (error) {
    console.error("❌ Error inserting data:", error);
  } finally {
    await ServiceFactory.shutdown();
  }
})();
