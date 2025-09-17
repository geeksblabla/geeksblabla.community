import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import metascraper from "metascraper";
import metascraperTitle from "metascraper-title";
import metascraperDescription from "metascraper-description";
import metascraperUrl from "metascraper-url";

// Initialize metascraper with rules
const scraper = metascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperUrl(),
]);

export const getPageTitles = defineAction({
  accept: "json",
  input: z.object({
    urls: z.union([z.string(), z.array(z.string())]),
  }),
  handler: async ({ urls }) => {
    try {
      const urlList = Array.isArray(urls) ? urls : [urls];

      const results = await Promise.all(
        urlList.map(async url => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.warn(
                `Failed to fetch ${url}: ${response.status} ${response.statusText}`
              );
              return { url, title: "Not found", description: null };
            }

            const html = await response.text();
            const metadata = await scraper({ html, url });

            return {
              url,
              title: metadata.title || "No title found",
              description: metadata.description || null,
              canonicalUrl: metadata.url || url,
            };
          } catch (error) {
            console.warn(`Error fetching ${url}:`, error);
            return { url, title: "Not found", description: null };
          }
        })
      );

      // Filter out any null results (failed fetches)
      return results.filter(result => result !== null);
    } catch (error) {
      console.error("Unexpected error:", error);
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while fetching page titles.",
      });
    }
  },
});
