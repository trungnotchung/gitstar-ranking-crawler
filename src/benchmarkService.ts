export class BenchmarkService {
  private startTime: number;
  private projectsProcessed: number = 0;
  private totalReleases: number = 0;
  private totalCommits: number = 0;
  private static instance: BenchmarkService;

  private constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): BenchmarkService {
    if (!BenchmarkService.instance) {
      BenchmarkService.instance = new BenchmarkService();
    }
    return BenchmarkService.instance;
  }

  addStats(releases: number, commits: number) {
    this.projectsProcessed++;
    this.totalReleases += releases;
    this.totalCommits += commits;

    console.log("--------------------------------");
    console.log("[Benchmark] Projects processed:", this.projectsProcessed);
    console.log("[Benchmark] Total releases:", this.totalReleases);
    console.log("[Benchmark] Total commits:", this.totalCommits);
    console.log("--------------------------------");
    // Print stats every 200 projects
    if (this.projectsProcessed % 1000 === 0) {
      this.printStats();
    }
  }

  private printStats() {
    const timeElapsed = (Date.now() - this.startTime) / 1000; // Convert to seconds
    console.log("\n=== Benchmark Stats ===");
    console.log(`Time elapsed: ${timeElapsed.toFixed(2)} seconds`);
    console.log(`Projects processed: ${this.projectsProcessed}`);
    console.log(`Total releases crawled: ${this.totalReleases}`);
    console.log(`Total commits crawled: ${this.totalCommits}`);
    console.log(
      `Average releases per project: ${(
        this.totalReleases / this.projectsProcessed
      ).toFixed(2)}`
    );
    console.log(
      `Average commits per project: ${(
        this.totalCommits / this.projectsProcessed
      ).toFixed(2)}`
    );
    console.log(
      `Processing rate: ${(this.projectsProcessed / timeElapsed).toFixed(
        2
      )} projects/second`
    );
    console.log("=====================\n");
  }

  reset() {
    this.startTime = Date.now();
    this.projectsProcessed = 0;
    this.totalReleases = 0;
    this.totalCommits = 0;
  }
}
