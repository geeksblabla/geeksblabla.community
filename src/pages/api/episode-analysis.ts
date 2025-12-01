// import type { APIRoute } from "astro";
// import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { OPEN_ROUTER_API_KEY, SUPADATA_API_KEY } from "astro:env/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import {
  fetchYouTubeSubtitles,
  convertToSRT,
  calculateVideoDuration,
  formatDuration,
  getRecommendedNoteCount,
} from "../../lib/youtube";

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
          .describe(
            "Timestamp in HH:MM:SS format (e.g., 00:05:30 for 5 minutes 30 seconds)"
          ),
        content: z.string().describe("Clear and engaging chapter title"),
      })
    )
    .describe(
      "List of chapters with accurate timestamps covering all major discussion points in english"
    ),
});

// Helper function to create dynamic analysis prompt based on video duration
const createAnalysisPrompt = (
  durationSeconds: number,
  recommendedNotes: { min: number; target: number; max: number }
) => {
  const durationFormatted = formatDuration(durationSeconds);
  const durationMinutes = Math.floor(durationSeconds / 60);

  return `You are given an automated subtitle file (SRT format) of a podcast episode with precise timestamps.
The video duration is ${durationFormatted} (${durationMinutes} minutes).

Your task:
1. Generate a concise YouTube video description (max 400 characters) that summarizes the episode clearly and attracts viewers
2. Create ${recommendedNotes.target} chapter notes (between ${recommendedNotes.min}-${recommendedNotes.max} notes) with accurate timestamps

CRITICAL COVERAGE REQUIREMENTS:
- MUST cover the ENTIRE video from start (00:00:00) to end (${durationFormatted})
- First note MUST start at 00:00:00
- Last note should be within the final 15% of the video (after ${formatDuration(Math.floor(durationSeconds * 0.85))})

DISTRIBUTION REQUIREMENTS:
- Divide the video into roughly equal segments
- For a ${durationMinutes}-minute video with ${recommendedNotes.target} notes:
  * Target spacing: 1 note every ~${Math.round(durationMinutes / recommendedNotes.target)} minutes
  * Maximum gap allowed: ${Math.round((durationMinutes / recommendedNotes.target) * 1.8)} minutes between any two consecutive notes
- Pay EXTRA attention to the middle and final sections of the video
- Common mistake to avoid: DO NOT generate 80% of notes in the first half of the video
- Ensure roughly equal distribution: If video is 2 hours and you need 20 notes, don't put 15 notes in the first hour

CRITICAL TIMESTAMP RULES:
1. Use the EXACT timestamps from the SRT subtitle file - DO NOT make up or estimate timestamps
2. Each timestamp MUST correspond to where that topic actually begins in the subtitle file
3. Timestamps MUST be in strictly chronological order (each timestamp must be later than the previous one)
4. Format MUST be HH:MM:SS (e.g., 00:05:30 for 5 minutes 30 seconds, NOT 05:30:00)
5. Double-check each timestamp against the subtitle timing before including it

The chapters should be in english and cover all major discussion points throughout the entire video.`;
};

// Helper function to parse HH:MM:SS to seconds
const parseTimestamp = (timestamp: string): number => {
  const [hours, minutes, seconds] = timestamp.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

// Validation interface
interface ValidationResult {
  isValid: boolean;
  warnings: string[];
}

/**
 * Check for uneven distribution by detecting large gaps between consecutive notes
 */
const detectGaps = (
  notes: Array<{ timestamp: string; content: string }>,
  durationSeconds: number,
  targetNotesCount: number
): { maxGap: number; maxGapLocation: string; hasProblematicGaps: boolean } => {
  if (notes.length < 2) {
    return { maxGap: 0, maxGapLocation: "", hasProblematicGaps: false };
  }

  const targetSpacing = durationSeconds / targetNotesCount; // Expected average spacing
  const maxAllowedGap = targetSpacing * 2; // Flag gaps that are 2x the target

  let maxGap = 0;
  let maxGapStart = "";
  let maxGapEnd = "";

  for (let i = 1; i < notes.length; i++) {
    const prevSeconds = parseTimestamp(notes[i - 1].timestamp);
    const currSeconds = parseTimestamp(notes[i].timestamp);
    const gap = currSeconds - prevSeconds;

    if (gap > maxGap) {
      maxGap = gap;
      maxGapStart = notes[i - 1].timestamp;
      maxGapEnd = notes[i].timestamp;
    }
  }

  return {
    maxGap,
    maxGapLocation: `${maxGapStart} → ${maxGapEnd}`,
    hasProblematicGaps: maxGap > maxAllowedGap,
  };
};

// Validation function to check coverage and note quality
const validateNotes = (
  notes: Array<{ timestamp: string; content: string }>,
  durationSeconds: number,
  recommendedCount: { min: number; target: number; max: number }
): ValidationResult => {
  const warnings: string[] = [];

  // Check if first note starts at 00:00:00
  if (notes.length > 0 && notes[0].timestamp !== "00:00:00") {
    warnings.push(
      `First note should start at 00:00:00 but starts at ${notes[0].timestamp}`
    );
  }

  // Check if last note is within final 15% of video
  if (notes.length > 0) {
    const lastNote = notes[notes.length - 1];
    const lastNoteSeconds = parseTimestamp(lastNote.timestamp);
    const minLastNoteTime = durationSeconds * 0.85;

    if (lastNoteSeconds < minLastNoteTime) {
      warnings.push(
        `Last note at ${lastNote.timestamp} ends too early. Video duration is ${formatDuration(durationSeconds)}, but coverage ends at ${((lastNoteSeconds / durationSeconds) * 100).toFixed(0)}% of the video.`
      );
    }
  }

  // Check note count
  if (notes.length < recommendedCount.min) {
    warnings.push(
      `Only ${notes.length} notes generated. Recommended: ${recommendedCount.min}-${recommendedCount.max} notes for better coverage.`
    );
  } else if (notes.length > recommendedCount.max) {
    warnings.push(
      `${notes.length} notes generated. This might be too many. Recommended: ${recommendedCount.min}-${recommendedCount.max} notes.`
    );
  }

  // Check for large gaps between consecutive notes
  const gapAnalysis = detectGaps(
    notes,
    durationSeconds,
    recommendedCount.target
  );

  if (gapAnalysis.hasProblematicGaps) {
    const maxGapMinutes = Math.round(gapAnalysis.maxGap / 60);
    warnings.push(
      `Large gap detected: ${maxGapMinutes} minutes between notes at ${gapAnalysis.maxGapLocation}. This section may be under-covered.`
    );
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
};

// GET endpoint that takes YouTube URL as query parameter and returns JSON
export const GET = async ({ request }: { request: Request }) => {
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
    console.log("Transcript segments count:", transcriptData.length);

    // Validate transcript content before sending to LLM
    if (!content || content.length < 100) {
      return new Response(
        JSON.stringify({
          error: "Insufficient Content",
          message:
            "The transcript content is too short or empty. Please ensure the video has subtitles available.",
          details: `Content length: ${content.length} characters`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if transcript contains meaningful content (not just error messages)
    if (
      content.includes("Error: Invalid transcript data format") ||
      content.trim() === "" ||
      !transcriptData ||
      transcriptData.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid Transcript",
          message:
            "Unable to retrieve valid transcript data. The video may not have subtitles available or may be private.",
          details: "No valid transcript segments found",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Additional validation: Check if content has minimum word count for meaningful analysis
    const wordCount = content
      .split(/\s+/)
      .filter(word => word.length > 0).length;
    console.log("Transcript word count:", wordCount);

    if (wordCount < 50) {
      return new Response(
        JSON.stringify({
          error: "Insufficient Content",
          message:
            "The transcript content is too short for meaningful analysis. Please provide a longer video with more content.",
          details: `Word count: ${wordCount} words (minimum: 50 words required)`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Transcript validation passed - proceeding with LLM analysis");

    // Calculate video duration and get recommendations
    const durationSeconds = calculateVideoDuration(transcriptData);
    const recommendedCount = getRecommendedNoteCount(durationSeconds);
    console.log("Video duration:", formatDuration(durationSeconds));
    console.log("Recommended note count:", recommendedCount);

    const openrouter = createOpenRouter({
      apiKey: OPEN_ROUTER_API_KEY as string,
    });

    // Create dynamic prompt with duration context
    const analysisPrompt = createAnalysisPrompt(
      durationSeconds,
      recommendedCount
    );
    const prompt = `${analysisPrompt}\n\nSubtitle content: <subtitle>\n${content}\n</subtitle>`;
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

      // Validate the generated notes
      const validation = validateNotes(
        result.object.notes,
        durationSeconds,
        recommendedCount
      );
      console.log("Validation result:", validation);

      // Return response with metadata
      return new Response(
        JSON.stringify({
          ...result.object,
          metadata: {
            videoDuration: formatDuration(durationSeconds),
            videoDurationSeconds: durationSeconds,
            notesGenerated: result.object.notes.length,
            notesRecommended: recommendedCount,
            validation: {
              isValid: validation.isValid,
              warnings: validation.warnings,
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
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
