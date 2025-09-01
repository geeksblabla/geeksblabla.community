import type { APIRoute } from "astro";
// import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { OPEN_ROUTER_API_KEY, SUPADATA_API_KEY } from "astro:env/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { fetchYouTubeSubtitles, convertToSRT } from "../../lib/youtube";

export const runtime = "edge";
export const prerender = false;

// Mark this route as server-side only
export const partial = true;

// Define the schema for the analysis result
const AnalysisResultSchema = z.object({
  description: z
    .string()
    .max(400)
    .describe(
      "A concise YouTube video description that summarizes the episode clearly and attracts viewers in english"
    ),
  notes: z
    .array(
      z.object({
        timestamp: z
          .string()
          .regex(/^\d{2}:\d{2}:\d{2}$/)
          .describe("Timestamp in HH:MM:SS format"),
        content: z.string().describe("Clear and engaging chapter title"),
      })
    )
    .describe(
      "List of chapters with accurate timestamps covering all major discussion points in english"
    ),
});

const ANALYSIS_PROMPT = `You are given an automated subtitle file of a podcast episode.
Carefully analyze the content to identify the key topics and transitions.
Generate a concise YouTube video description (max 400 characters) and a list of chapters with accurate timestamps (HH:MM:SS format).
Ensure timestamps align with the actual start of each topic and cover all major discussion points.
The chapters should be in english.
ALWAYS start the first note at 00:00:00 and make sure to not exceed 20 notes.`;

// GET endpoint that takes YouTube URL as query parameter and returns JSON
export const GET: APIRoute = async ({ request }) => {
  try {
    // Validate environment variables
    if (!OPEN_ROUTER_API_KEY) {
      console.error("OPEN_ROUTER_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: "Configuration Error",
          message: "OPEN_ROUTER_API_KEY not configured properly",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!SUPADATA_API_KEY) {
      console.error("SUPADATA_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: "Configuration Error",
          message: "SUPADATA_API_KEY not configured properly",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const url = new URL(request.url);
    const youtubeUrl = url.searchParams.get("url");

    if (!youtubeUrl) {
      return new Response(
        JSON.stringify({
          error: "Missing URL parameter",
          message:
            "Please provide a YouTube URL using the 'url' query parameter",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch subtitle data directly using the shared function
    console.log("Fetching subtitle for:", youtubeUrl);
    const transcriptData = await fetchYouTubeSubtitles(
      youtubeUrl,
      SUPADATA_API_KEY as string
    );

    // Convert transcript data to SRT format for AI processing
    const content = convertToSRT(transcriptData);
    console.log("Subtitle content length:", content.length);

    const openrouter = createOpenRouter({
      apiKey: OPEN_ROUTER_API_KEY as string,
    });

    const prompt = `${ANALYSIS_PROMPT}\n\nSubtitle content: <subtitle>\n${content}\n</subtitle>`;
    console.log("Prompt length:", prompt.length);

    // Generate analysis using OpenRouter with structured output
    try {
      const result = await generateObject({
        model: openrouter("google/gemini-2.5-pro"),
        schema: AnalysisResultSchema,
        schemaName: "EpisodeAnalysis",
        schemaDescription:
          "Analysis of podcast episode with description and chapter timestamps",
        prompt,
        temperature: 0.3, // Lower temperature for more consistent results
      });
      console.log("Analysis result:", result.object);

      return new Response(JSON.stringify(result.object), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
      });
    } catch (aiError) {
      console.error("AI generation error:", aiError);
      throw new Error(
        `AI analysis failed: ${aiError instanceof Error ? aiError.message : "Unknown AI error"}`
      );
    }
  } catch (error) {
    console.error("Error in GET method:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to analyze the episode content",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
