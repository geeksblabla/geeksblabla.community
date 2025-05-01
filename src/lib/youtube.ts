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

const YOUTUBE_API_KEY = import.meta.env.YOUTUBE_API_KEY;

export const getYoutubeVideoDetails = async (url: string) => {
  try {
    const videoId = getYouTubeVideoId(url);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails,snippet&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();

    if (data.items && data.items[0]) {
      // Parse duration from ISO 8601 format
      const isoDuration = data.items[0].contentDetails.duration;
      const duration = isoDuration
        .replace("PT", "")
        .replace("H", ":")
        .replace("M", ":")
        .replace("S", "");

      // Get published date
      const publishedAt = new Date(data.items[0].snippet.publishedAt)
        .toISOString()
        .split("T")[0];

      return {
        duration,
        publishedAt,
        youtube: `https://www.youtube.com/watch?v=${videoId}`,
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
