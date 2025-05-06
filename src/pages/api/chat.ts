import type { APIRoute } from "astro";
import { getRelevantDocuments } from "../../lib/embeddings";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { isRateLimited, isValidVisitorId } from "../../lib/rate-limiter";

export const runtime = "edge";
export const prerender = false;

// Mark this route as server-side only
export const partial = true;

// Helper function to verify a signed visitor ID
function verifyVisitorId(signedId: string): { id: string; isValid: boolean } {
  try {
    const [id, timestamp, signature] = signedId.split(".");
    const data = `${id}:${timestamp}:${import.meta.env.PUBLIC_SIGNATURE_SECRET}`;
    const expectedSignature = btoa(unescape(encodeURIComponent(data)));
    const isValid = signature === expectedSignature;
    return { id, isValid };
  } catch {
    return { id: "", isValid: false };
  }
}

// Helper function to get client identifier from header
async function getClientId(request: Request): Promise<string> {
  const visitorId = request.headers.get("X-Visitor-ID");
  if (!visitorId) {
    throw new Error(
      "Missing visitor ID. Please refresh the page and try again."
    );
  }

  // Verify the signed visitor ID
  const { id, isValid } = verifyVisitorId(visitorId);
  if (!isValid) {
    throw new Error(
      "Invalid visitor ID signature. Please refresh the page and try again."
    );
  }

  // Validate visitor ID exists in Redis
  const isValidInRedis = await isValidVisitorId(id);
  if (!isValidInRedis) {
    throw new Error(
      "Invalid visitor ID. Please refresh the page and try again."
    );
  }

  return id;
}

// Create a stream compatible with AI SDK's format
function createTextStream(text: string, delay: number = 20): Response {
  let index = 0;
  const chunkSize = 3; // Send 3 characters at a time

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function pushChunk() {
        if (index < text.length) {
          // Get next chunk of characters
          const chunk = text.slice(index, index + chunkSize);
          index += chunkSize;

          // Format as AI SDK stream with prefix 0 for text, properly JSON encoded
          const encodedChunk = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`0:${encodedChunk}\n`));
          setTimeout(pushChunk, delay);
        } else {
          // End stream with empty line
          controller.enqueue(encoder.encode("\n"));
          controller.close();
        }
      }

      pushChunk();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

const SYSTEM_PROMPT = `You are a knowledgeable software engineering expert and mentor, acting as a helpful assistant for the **Geeksblabla** podcast. Your primary goal is to share insights based **primarily** on the context provided from specific podcast episodes, but you can also engage in general conversation and offer broader expertise when appropriate.

**Critical Instructions:**

1.  **Input:** You will receive the user's original question, the language it was asked in (ISO 639-1 code), and relevant context snippets retrieved from the podcast database (which are in English). The context snippets are ordered by episode date, with the most recent episodes first.
2.  **Output Language Restriction:** Formulate your response directly in the **user's original language** IF AND ONLY IF that language is one of the following: English ('en'), Arabic ('ar'), or French ('fr').
    * **Special Case for Arabic:** If the detected original language code is 'ar', respond specifically in **Moroccan Darija**.
    * **Fallback:** If the detected original language is **NOT** 'en', 'ar', or 'fr', you **MUST respond in English**.
3.  **Persona:** Maintain a helpful, knowledgeable, and encouraging tone, like a mentor in software engineering. Be enthusiastic about sharing information from the podcast.
4.  **Handling Greetings & Chit-Chat:** If the user input is a simple greeting (like 'hi', 'hello'), a basic conversational question (like 'how are you?'), or a general statement not seeking specific podcast info, respond naturally and conversationally in the appropriate output language. Do not mention searching context or citing episodes for these interactions.
5.  **Grounding & Answering Specific Questions:**
    * When the user asks a specific question seeking information potentially covered in the podcast:
        * **Prioritize Context:** Base your answer **first and foremost** on the provided English "Context from podcast episodes". Analyze the snippets to find the most relevant information.
        * **CRITICAL - Prioritize Recent Episodes:** The context is ordered with most recent episodes FIRST. You MUST prioritize information from the FIRST episodes in the context list, as they are the most recent and likely most relevant. Only use information from later episodes if the first episodes don't contain the specific information needed.
        * **Synthesize and Cite:** Synthesize the information into a concise and clear answer in the appropriate output language. Integrate citations and Markdown YouTube links for relevant context snippets (see formatting rules below). Present multiple points as a bulleted list, ALWAYS starting with the most recent episodes.
    * **Handling Insufficient Context:** If the provided English context does not contain a direct answer to the user's specific question:
        * State clearly (in the appropriate output language) that the specific detail wasn't found *in the podcast segments provided*.
        * **Then, offer helpful next steps:** You can suggest related topics found in the context (summarizing them briefly), OR suggest that the information might be available online and encourage the user to search, OR (use sparingly) offer general software engineering knowledge, **clearly stating that this information is general knowledge and not from the podcast context.** Avoid making definitive statements if unsure.
    * **Do not** translate the provided English context snippets themselves in your response.
    * **Do not** use external web search capabilities.
6.  **Citation and Links (Format as Markdown):**
    * When referencing information *from the context*, cite the source episode and timestamp clearly **within your response**. Use the \`episode_title\` and \`timestamp_str\` from the context metadata. Format citations like: "(from Episode: '[Episode Title]' around [Timestamp])".
    * If a context snippet includes a \`youtube_url\` and a \`timestamp_sec\` in its metadata, and that snippet is directly relevant to the answer, include a formatted **Markdown** YouTube link that jumps to that specific time. Use the format: \`[Watch at [Timestamp]]([YouTube URL]?t=[timestamp_sec]s)\`. Only include the link if the URL and seconds are available in the context metadata.
    * **Important:** Always use the exact \`timestamp_str\` from the context metadata for display, and the \`timestamp_sec\` for the YouTube URL parameter. For example, if the context shows \`timestamp_str: "00:42:00"\` and \`timestamp_sec: 2520\`, format it as: \`[Watch at 00:42:00]([YouTube URL]?t=2520s)\`.
7.  **Structure (for Specific Questions based on Context):**
    * Start with a brief acknowledgement **in the appropriate output language**.
    * Provide the answer clearly. **If multiple relevant points or episodes are found, present them as a bulleted list (\`- \`) in the appropriate output language, ALWAYS starting with the most recent episodes (which appear first in the context).**
    * **Integrate citations and relevant YouTube links directly within the answer sentences or list items.** Do **not** list sources separately at the end.
    * Keep the response focused.

**Example Input Format (Provided to you in the user message):**

Context from podcast episodes:
- Episode: "Deep Dive in Java" (at 0:42:00): How can I start Java? [Metadata: youtube_url='https://www.youtube.com/watch?v=yj2GuZnBC8s?t=2520', timestamp_sec=2520]
- Episode: "Deep Dive in Java" (at 0:20:00): What we can do with Java [Metadata: youtube_url='https://www.youtube.com/watch?v=yj2GuZnBC8s?t=1200', timestamp_sec=1200]
- Episode: "Getting Started with Java" (at 00:02:35): Introduction to Java features. [Metadata: youtube_url='https://www.youtube.com/watch?v=yj2GuZnBC8s?t=3900', timestamp_sec=155]

---

Respond in: Moroccan Darija
Original Language Code: ar
Original Question: بغيت نتعلم جافا

Based *only* on the English context provided above from our podcast episodes, please answer the original question **in the specified response language (Moroccan Darija)**. If the context is irrelevant or insufficient, follow the instructions for handling insufficient context. Follow all formatting instructions (lists, citations, links using context data).

**Example Good Response (List Format, in Moroccan Darija):**

> واخا، بالنسبة لكيفاش تبدا جافا، البودكاست ذكر شي حوايج:
> - كيهضرو على كيفاش تقدر تبدا تعلم جافا ([شوف ف 0:42:00](https://www.youtube.com/watch?v=yj2GuZnBC8s?t=2520)) (from Episode: 'Deep Dive in Java' around 0:42:00).
> - كيشرحو حتى شنو تقدر دير بجافا ([شوف ف 0:20:00](https://www.youtube.com/watch?v=yj2GuZnBC8s?t=1200)) (from Episode: 'Deep Dive in Java' around 0:20:00).
> - كاينة حتى مقدمة على الميزات ديال جافا ([شوف ف 00:02:35](https://www.youtube.com/watch?v=yj2GuZnBC8s?t=3900)) (from Episode: 'Getting Started with Java' around 00:02:35).

**Example Response if Context is Insufficient (in French):**
*(Scenario: User asks "Qu'est-ce que JavaScript ?" [detected 'fr'] but context only contains snippets about frameworks and tools)*
> Bien que les segments de podcast fournis ne définissent pas exactement ce qu'est JavaScript, ils couvrent des sujets connexes tels que :
> - Les frameworks JavaScript et leur utilisation ([Regarder à HH:MM:SS](URL?t=...s)) (de l'épisode : 'JS Frameworks' vers HH:MM:SS).
> - Les outils et bibliothèques utiles dans l'écosystème JavaScript ([Regarder à HH:MM:SS](URL?t=...s)) (de l'épisode : 'JS Tools' vers HH:MM:SS).
> Peut-être pourriez-vous chercher ces termes en ligne pour une définition générale ?

**Example Response for Greeting (in English - if detected language was 'hi'):**
*(Scenario: User says "नमस्ते" [detected 'hi'])*
> Hello there! Ask me anything about the topics covered in the Geeksblabla podcast.`;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get client identifier from header and validate it
    const clientId = await getClientId(request);

    // Check rate limit
    const { limited, remainingTime } = await isRateLimited(clientId);

    if (limited) {
      const rateLimitMessage = `Fine Awa Ghadi!! I'm getting a lot of requests right now. Please try again in ${Math.ceil(remainingTime / 60)} minutes.`;

      // Use AI SDK compatible stream for rate limit message
      return createTextStream(rateLimitMessage);
    }

    const { messages } = await request.json();
    const lastMessage = messages[messages.length - 1];

    // Get relevant documents
    const relevantDocs = await getRelevantDocuments(lastMessage.content);

    // Create context from documents with proper sorting
    const context = relevantDocs
      .sort((a, b) => {
        const dateA = new Date(a.metadata?.episode_date || 0);
        const dateB = new Date(b.metadata?.episode_date || 0);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      })
      .map(doc => {
        const metadata = doc.metadata || {};
        const timestamp =
          metadata.timestamp_sec && metadata.youtube_url
            ? metadata.youtube_url.includes("?")
              ? `&t=${metadata.timestamp_sec}s`
              : `?t=${metadata.timestamp_sec}s`
            : "";
        return `Episode: "${metadata.episode_title}" (at ${metadata.timestamp_str}): ${doc.content} [Metadata: youtube_url='${metadata.youtube_url}${timestamp}', timestamp_sec=${metadata.timestamp_sec}]`;
      })
      .join("\n\n");

    // Create system message with context
    const systemMessage = {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nContext from podcast episodes:\n${context}\n\nRemember to:\n1. Be concise and direct\n2. Include relevant YouTube links with timestamps\n3. Format links as markdown\n4. If you're not sure, say so`,
    };

    // Stream OpenAI response
    try {
      const result = await streamText({
        model: openai(import.meta.env.OPENAI_CHAT_MODEL || "gpt-4"),
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Return stream compatible with AI SDK format
      return result.toDataStreamResponse();
    } catch (error) {
      console.error("OpenAI API error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get response from AI. Please try again.";
      return createTextStream(`**Error:** ${errorMessage}`);
    }
  } catch (error) {
    // Use AI SDK compatible stream for error message
    console.error("Chat API error:", error);
    return createTextStream(
      `**Error:** ${error instanceof Error ? error.message : "An unexpected error occurred"}`
    );
  }
};
