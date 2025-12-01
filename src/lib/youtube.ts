// Helper function to extract video ID from YouTube URL
const getYouTubeVideoId = (url: string) => {
  // Handle regular YouTube URLs
  const regularRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const regularMatch = url.match(regularRegex);

  // Handle YouTube live URLs (format: youtube.com/live/VIDEO_ID)
  const liveRegex = /youtube\.com\/live\/([^"&?/\s]{11})/;
  const liveMatch = url.match(liveRegex);

  // Return the first match found
  return regularMatch?.[1] || liveMatch?.[1] || null;
};

// Helper function to parse ISO 8601 duration to HH:MM:SS format
const parseIsoDurationToHHMMSS = (isoDuration: string): string => {
  // Remove PT prefix
  const duration = isoDuration.replace("PT", "");

  // Extract hours, minutes, seconds using regex
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);
  const secondsMatch = duration.match(/(\d+)S/);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

  // Format as HH:MM:SS with zero padding
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export const getYoutubeVideoDetails = async (url: string, apiKey: string) => {
  try {
    const videoId = getYouTubeVideoId(url);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails,snippet&key=${apiKey}`
    );
    const data = await response.json();

    if (data.items && data.items[0]) {
      // Parse duration from ISO 8601 format
      const isoDuration = data.items[0].contentDetails.duration;
      const duration = parseIsoDurationToHHMMSS(isoDuration);
      console.log(data.items[0]);
      const title = data.items[0].snippet.title;
      // Extract episode number after '#' (e.g., "#223 - ...")
      const episodeNumberMatch = title.match(/#(\d+)/) as number[];
      const episodeNumber = episodeNumberMatch ? episodeNumberMatch[1] : 0;
      // Get published date
      const publishedAt = new Date(data.items[0].snippet.publishedAt)
        .toISOString()
        .split("T")[0];

      return {
        duration,
        publishedAt,
        youtube: `https://www.youtube.com/watch?v=${videoId}`,
        episodeNumber,
      };
    }
  } catch (error) {
    console.error("Error fetching YouTube video details:", error);
    return null;
  }
};

export const timestampToSeconds = (timestamp: string) => {
  if (!timestamp || !/^\d{1,2}:\d{2}:\d{2}$/.test(timestamp)) {
    return null;
  }
  const [hours, minutes, seconds] = timestamp.split(":").map(Number);
  if (
    minutes >= 60 ||
    seconds >= 60 ||
    isNaN(hours) ||
    isNaN(minutes) ||
    isNaN(seconds)
  ) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
};

// Interface for transcript segments
export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
}

// Function to fetch YouTube subtitles from Supadata API
export const fetchYouTubeSubtitles = async (
  youtubeUrl: string,
  apiKey: string
): Promise<TranscriptSegment[]> => {
  // Validate YouTube URL
  const youtubeRegex =
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
  if (!youtubeRegex.test(youtubeUrl)) {
    throw new Error("Invalid YouTube URL provided");
  }

  // Make request to Supadata API
  const supadataUrl = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(youtubeUrl)}&language=ar`;
  const response = await fetch(supadataUrl, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `Supadata API error: ${response.status} ${response.statusText}. Details: ${errorData}`
    );
  }

  const transcriptData = await response.json();
  return transcriptData.content || transcriptData;
};

// Helper function to convert milliseconds to SRT timestamp format
export const formatSRTTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// Function to convert transcript data to SRT format
export const convertToSRT = (transcriptData: TranscriptSegment[]): string => {
  if (!Array.isArray(transcriptData)) {
    return "Error: Invalid transcript data format";
  }

  let srtContent = "";

  for (const segment of transcriptData) {
    if (!segment.text || typeof segment.offset !== "number") {
      continue; // Skip invalid segments
    }

    const startTime = formatSRTTime(segment.offset);
    const endTime = formatSRTTime(segment.offset + segment.duration);

    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${segment.text}\n\n`;
  }

  return srtContent.trim();
};

/**
 * Calculate total video duration from transcript segments
 * @param transcriptData Array of transcript segments
 * @returns Duration in seconds
 */
export const calculateVideoDuration = (
  transcriptData: TranscriptSegment[]
): number => {
  if (!transcriptData || transcriptData.length === 0) {
    return 0;
  }

  // Find the last segment and calculate total duration
  const lastSegment = transcriptData[transcriptData.length - 1];
  const totalMilliseconds = lastSegment.offset + lastSegment.duration;

  return Math.floor(totalMilliseconds / 1000); // Convert to seconds
};

/**
 * Format seconds to HH:MM:SS
 * @param seconds Total seconds
 * @returns Formatted time string
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Calculate recommended note count based on video duration
 * Target: 1 note every 6-8 minutes
 */
export const getRecommendedNoteCount = (
  durationSeconds: number
): {
  min: number;
  target: number;
  max: number;
} => {
  const durationMinutes = durationSeconds / 60;

  // Target: 1 note per ~7 minutes
  const target = Math.round(durationMinutes / 5);

  // Min: 1 note per 6 minutes, Max: 4 note per 4 minutes
  const min = Math.max(3, Math.floor(durationMinutes / 6));
  const max = Math.min(40, Math.ceil(durationMinutes / 4));

  return { min, target, max };
};
