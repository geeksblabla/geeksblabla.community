function getLinkFromYtEndpoint(href) {
  try {
    const url = new URL(href);
    // Check if this is a YouTube redirect link
    if (url.pathname === "/redirect") {
      // Get the actual URL from the 'q' parameter
      const actualUrl = url.searchParams.get("q");
      if (actualUrl) {
        return decodeURIComponent(actualUrl);
      }
    } else {
      // If it's not a redirect, use the original URL
      return href;
    }
  } catch {
    // If URL parsing fails, use the original href
    return href;
  }
}

function extractLinksFromMessages() {
  const links = [];
  // get all  <a class="yt-simple-endpoint style-scope yt-live-chat-text-message-renderer" href="https://www.youtube.com/redirect?event=live_chat&amp;redir_token=QUFFLUhqa3B5RDdxb3JYQ0JfUTd6LW5GMHUwblg0MDdBd3xBQ3Jtc0tsb0kzQjgtbWczUGMyekJHckJ0M3R3UTNvX0ZiUk1VT3Q0V2syX0lfR1g3cC01VzRUN1lJOEloeG1HODhxcGJubm1MZGJ6OHZKZFRzaDhET3pOVHp6YWowb3kwS05WVGpFbmw3c1MzX3FxcmlKREJ6Zw&amp;q=https%3A%2F%2Fmorocco.ai%2Fwp-content%2Fuploads%2F2020%2F03%2FMoroccoAI-Recommendations-Towards-a-National-AI-Strategy-For-Morocco.pdf" rel="nofollow" target="_blank">https://morocco.ai/wp-content/uploads...</a>
  // Get all links with yt-simple-endpoint class

  const ytEndpointLinks = document
    .querySelector("#chatframe")
    .contentDocument.querySelectorAll("#message > a");

  ytEndpointLinks.forEach(link => {
    links.push(getLinkFromYtEndpoint(link.href));
  });

  return links;
}

function copyLinksToClipboard(links) {
  // Copy links to clipboard
  const linksText = links.join(",");
  console.log(
    "Please right-click on the link below and select 'Copy Link Address', then paste the links into the form"
  );
  console.log("Links:", linksText);
}

// Execute the function

async function main() {
  const links = [];
  const video = document.querySelector("video");
  if (!video) {
    console.error("No video element found");
    return;
  }
  const videoDuration = video.duration;
  // Seek through video in 15-minute intervals and extract links
  const intervalInSeconds = 15 * 60;

  const stops = Array.from(
    { length: Math.floor(videoDuration / intervalInSeconds) },
    (_, i) => i * intervalInSeconds
  ).concat(videoDuration - 30);

  for (const stop of stops) {
    // Seek to current timestamp
    video.currentTime = stop;

    // Wait for video to seek and DOM to update
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract links at current timestamp
    const timestampLinks = extractLinksFromMessages();
    links.push(...timestampLinks);
    console.log("Seeking to", stop, ". found ", timestampLinks.length, "links");
  }

  // Deduplicate links
  const uniqueLinks = [...new Set(links)];
  console.log("Done: Found", uniqueLinks.length, "unique links");
  copyLinksToClipboard(uniqueLinks);
}

main();
