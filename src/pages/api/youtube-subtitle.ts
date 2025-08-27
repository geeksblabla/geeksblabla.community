import type { APIRoute } from "astro";

export const runtime = "edge";
export const prerender = false;

// Mark this route as server-side only
export const partial = true;

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}

// Helper function to convert milliseconds to SRT timestamp format
function formatSRTTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Function to convert transcript data to SRT format
function convertToSRT(transcriptData: TranscriptSegment[]): string {
  if (!Array.isArray(transcriptData)) {
    return "Error: Invalid transcript data format";
  }

  let srtContent = "";
  //   let sequenceNumber = 1;

  for (const segment of transcriptData) {
    if (!segment.text || typeof segment.offset !== "number") {
      continue; // Skip invalid segments
    }

    const startTime = formatSRTTime(segment.offset);
    const endTime = formatSRTTime(segment.offset + segment.duration);

    // srtContent += `${sequenceNumber}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${segment.text}\n\n`;

    // sequenceNumber++;
  }

  return srtContent.trim();
}

export const GET: APIRoute = async ({ request }) => {
  try {
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

    // Validate that it's a YouTube URL
    const youtubeRegex =
      /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
    if (!youtubeRegex.test(youtubeUrl)) {
      return new Response(
        "Error: Invalid YouTube URL\nPlease provide a valid YouTube URL",
        {
          status: 400,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    // Make request to Supadata API
    const supadataUrl = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(youtubeUrl)}&language=ar`;
    const supadataResponse = await fetch(supadataUrl, {
      method: "GET",
      headers: {
        "x-api-key": import.meta.env.SUPADATA_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!supadataResponse.ok) {
      const errorData = await supadataResponse.text();
      console.error("Supadata API error:", errorData);

      return new Response(
        `Error: Failed to fetch transcript\nSupadata API returned ${supadataResponse.status}: ${supadataResponse.statusText}\nDetails: ${errorData}`,
        {
          status: supadataResponse.status,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    // Get the transcript data from Supadata
    const transcriptData = await supadataResponse.json();

    // Convert transcript data to SRT format
    const srtContent = convertToSRT(transcriptData.content || transcriptData);

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
