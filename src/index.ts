import { upsertRepoWithReleasesAndCommits } from "./dbService";


(async () => {
  try {
    // fetch top 5000 repositories and their releases and commits
    // add them to the database
    console.log("Data inserted successfully!");
  } catch (error) {
    console.error("❌ Error inserting data:", error);
  }
})();
