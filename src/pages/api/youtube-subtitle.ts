import type { APIRoute } from "astro";
import { SUPADATA_API_KEY } from "astro:env/server";
import { fetchYouTubeSubtitles, convertToSRT } from "../../lib/youtube";

export const runtime = "edge";
export const prerender = false;

// Mark this route as server-side only
export const partial = true;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Validate environment variables
    if (!SUPADATA_API_KEY) {
      console.error("SUPADATA_API_KEY is not configured");
      return new Response(
        "Error: Configuration Error\nSUPADATA_API_KEY is not configured properly",
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    // Get the YouTube URL from query parameters
    const url = new URL(request.url);
    const youtubeUrl = url.searchParams.get("url");

    if (!youtubeUrl) {
      return new Response(
        "Error: Missing YouTube URL parameter\nPlease provide a YouTube URL using the 'url' query parameter",
        {
          status: 400,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    // Fetch transcript data using the shared function
    const transcriptData = await fetchYouTubeSubtitles(
      youtubeUrl,
      SUPADATA_API_KEY as string
    );

    // Convert transcript data to SRT format
    const srtContent = convertToSRT(transcriptData);

    // Return the transcript data as SRT text
    return new Response(srtContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="subtitle.srt"`,
      },
    });
  } catch (error) {
    console.error("Error fetching YouTube subtitle:", error);
    return new Response(
      `Error: Internal Server Error\nFailed to process the YouTube subtitle request\nDetails: ${error instanceof Error ? error.message : "Unknown error"}`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }
    );
  }
};
