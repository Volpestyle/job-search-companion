/**
 * LinkedIn job search implementation using Stagehand
 */

// Note: We can't export runtime here because this is a "use server" file
// The runtime configuration is in route.ts

import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { Job, JobSearchParams, JobStatus } from "@/app/types/general-types";

// Schema for job listing extraction
const jobListingsSchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string().describe("The job title/position"),
      company: z.string().describe("The company name"),
      location: z.string().describe("Job location"),
      salary: z.string().optional().describe("Salary information if available"),
      url: z.string().describe("URL of the job posting"),
    })
  ),
});

/**
 * Main function that performs the LinkedIn job search
 */
export async function searchLinkedInJobs({
  page,
  stagehand,
  params,
}: {
  page: Page;
  context: BrowserContext;
  stagehand: Stagehand;
  params: JobSearchParams;
}): Promise<Job[]> {
  console.log("Starting LinkedIn job search with parameters:", params);

  try {
    // Navigate to LinkedIn Jobs
    await page.goto("https://www.linkedin.com/jobs/", {
      waitUntil: "networkidle",
    });
    console.log("Navigated to LinkedIn Jobs");

    // Use observe to identify form fields
    const formElements = await page.observe(
      "Find the job title search field and location search field"
    );
    console.log("Found form elements:", formElements.length);

    // Fill job title/keywords field
    if (params.keywords) {
      const keywordField = formElements.find(
        (el) =>
          el.description.toLowerCase().includes("job title") ||
          el.description.toLowerCase().includes("keyword")
      );

      if (keywordField) {
        console.log("Found keyword field:", keywordField.description);
        await page.act(keywordField);
        await page.act(`type "${params.keywords}"`);
      } else {
        console.log("Using natural language to fill keyword field");
        await page.act(`type "${params.keywords}" in the job title field`);
      }
    }

    // Fill location field
    if (params.location) {
      const locationField = formElements.find((el) =>
        el.description.toLowerCase().includes("location")
      );

      if (locationField) {
        console.log("Found location field:", locationField.description);
        await page.act(locationField);
        await page.act(`type "${params.location}"`);
      } else {
        console.log("Using natural language to fill location field");
        await page.act(`type "${params.location}" in the location field`);
      }
    }

    // Click search button
    console.log("Clicking search button");
    await page.act("click the search button");

    // Wait for search results to load
    console.log("Waiting for search results...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Extract job data using Zod schema
    console.log("Extracting job listings...");
    const jobListings = await page.extract({
      instruction:
        "Extract all visible job listings from the search results page. Include the job title, company name, location, salary if available, and the URL of the job posting.",
      schema: jobListingsSchema,
    });

    console.log(`Found ${jobListings.jobs.length} job listings`);

    // Transform the extracted data to our Job type
    const results = jobListings.jobs.map((job: any, index: number) => ({
      id: `linkedin-${Date.now()}-${index}`,
      position: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || "Not specified",
      status: "pending" as JobStatus,
      lastUpdated: new Date().toISOString(),
      previewUrl: job.url,
    }));

    return results;
  } catch (error) {
    console.error("Error in LinkedIn job search:", error);
    throw error;
  }
}