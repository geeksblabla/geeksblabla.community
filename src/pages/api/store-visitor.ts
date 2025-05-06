import type { APIRoute } from "astro";
import { storeVisitorId } from "../../lib/rate-limiter";

export const runtime = "edge";
export const prerender = false;
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const { visitorId } = await request.json();

    if (!visitorId) {
      return new Response(JSON.stringify({ error: "Missing visitor ID" }), {
        status: 400,
      });
    }

    // Verify the signed visitor ID
    const { id, isValid } = verifyVisitorId(visitorId);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid visitor ID signature" }),
        { status: 400 }
      );
    }

    // Validate visitor ID format before storing
    const isValidFingerprintId = id.match(/^[a-zA-Z0-9-_]{20,}$/);
    const isValidFallbackId = id.match(/^client-[a-zA-Z0-9]{7}$/);

    if (!isValidFingerprintId && !isValidFallbackId) {
      return new Response(
        JSON.stringify({ error: "Invalid visitor ID format" }),
        { status: 400 }
      );
    }

    console.log("Storing visitor ID:", id);

    // Store the visitor ID in Redis
    await storeVisitorId(id);
    console.log("Successfully stored visitor ID:", id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error storing visitor ID:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to store visitor ID",
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
