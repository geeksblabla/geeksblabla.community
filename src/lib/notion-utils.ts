/**
 * Extracts the Notion page ID from a Notion URL
 * @param url - The Notion page URL
 * @returns The page ID or null if not found
 */
export function extractNotionPageId(url: string): string | null {
  try {
    // Remove any query parameters and fragments
    const cleanUrl = url.split("?")[0].split("#")[0];

    // Extract the last part of the URL - this is the Notion page ID
    const urlParts = cleanUrl.split("/");
    const lastPart = urlParts[urlParts.length - 1];

    // Return the last part if it's not empty, otherwise null
    return lastPart.trim() || null;
  } catch (error) {
    console.error("Error extracting Notion page ID:", error);
    return null;
  }
}

/**
 * Validates if a string is a valid Notion page ID
 * @param id - The ID to validate (can include title, e.g., "The-people-behind-LOOP-210b7a4e158780f39090c0d691dbf1ff")
 * @returns True if valid, false otherwise
 */
export function isValidNotionPageId(id: string): boolean {
  // Check if it's a valid Notion page ID format
  // Can be just the 32-char ID or title-ID format
  return (
    /^[a-f0-9]{32}$/i.test(id) || // Pure 32-char hex ID
    /^.+-[a-f0-9]{32}$/i.test(id) || // Title-32charID format
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id) // UUID format
  );
}
