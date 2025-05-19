import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const components: Components = {
  a: ({ ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800"
    />
  ),
  p: ({ ...props }) => <p {...props} className="mb-2" />,
  ul: ({ ...props }) => (
    <ul {...props} className="mb-2 list-inside list-disc" />
  ),
  ol: ({ ...props }) => (
    <ol {...props} className="mb-2 list-inside list-decimal" />
  ),
  li: ({ ...props }) => <li {...props} className="mb-1" />,
  code: ({ ...props }) => (
    <code {...props} className="rounded bg-gray-100 px-1 py-0.5" />
  ),
  pre: ({ ...props }) => (
    <pre {...props} className="my-2 overflow-x-auto rounded bg-gray-100 p-2" />
  ),
};

// Storage key for visitor ID
const VISITOR_ID_KEY = "geeksblabla_visitor_id";
const SIGNATURE_SECRET =
  import.meta.env.PUBLIC_SIGNATURE_SECRET || "default-secret";

// Helper function to sign a visitor ID
function signVisitorId(id: string): string {
  const timestamp = Date.now();
  const data = `${id}:${timestamp}:${SIGNATURE_SECRET}`;
  const signature = btoa(unescape(encodeURIComponent(data)));
  return `${id}.${timestamp}.${signature}`;
}

// Helper function to verify a signed visitor ID
function verifyVisitorId(signedId: string): { id: string; isValid: boolean } {
  try {
    const [id, timestamp, signature] = signedId.split(".");
    const data = `${id}:${timestamp}:${SIGNATURE_SECRET}`;
    const expectedSignature = btoa(unescape(encodeURIComponent(data)));
    const isValid = signature === expectedSignature;
    return { id, isValid };
  } catch {
    return { id: "", isValid: false };
  }
}

// Helper function to store visitor ID in Redis
async function storeVisitorId(visitorId: string): Promise<void> {
  try {
    const signedId = signVisitorId(visitorId);
    const response = await fetch("/api/store-visitor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ visitorId: signedId }),
    });

    if (!response.ok) {
      await response.json();
    }
  } catch {
    // Don't throw the error - we want the chat to work even if storage fails
    // The rate limiter will handle invalid IDs appropriately
  }
}

export default function ChatInterface() {
  const [signedVisitorId, setSignedVisitorId] = useState<string>("");
  const [isFingerprintLoading, setIsFingerprintLoading] = useState(true);

  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const storedId = localStorage.getItem(VISITOR_ID_KEY);
        if (storedId) {
          const { id, isValid } = verifyVisitorId(storedId);
          if (isValid) {
            await storeVisitorId(id);
            setSignedVisitorId(storedId);
            setIsFingerprintLoading(false);
            return;
          }
          localStorage.removeItem(VISITOR_ID_KEY);
        }

        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const newVisitorId = result.visitorId;

        const signedId = signVisitorId(newVisitorId);
        localStorage.setItem(VISITOR_ID_KEY, signedId);

        await storeVisitorId(newVisitorId);
        setSignedVisitorId(signedId);
      } catch {
        const fallbackId = `client-${Math.random().toString(36).substring(7)}`;
        const signedFallbackId = signVisitorId(fallbackId);
        localStorage.setItem(VISITOR_ID_KEY, signedFallbackId);
        await storeVisitorId(fallbackId);
        setSignedVisitorId(signedFallbackId);
      } finally {
        setIsFingerprintLoading(false);
      }
    };

    initFingerprint();

    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === VISITOR_ID_KEY && e.newValue) {
        const { id, isValid } = verifyVisitorId(e.newValue);
        if (isValid) {
          await storeVisitorId(id);
          setSignedVisitorId(e.newValue);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      headers: {
        "X-Visitor-ID": signedVisitorId,
      },
    });

  if (isFingerprintLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center bg-gray-50">
        <div className="flex gap-1">
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col bg-gray-50">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[70%] rounded-2xl p-3 ${
                m.role === "user"
                  ? "rounded-tr-sm bg-blue-50 text-white"
                  : "prose prose-sm max-w-none rounded-tl-sm bg-white text-gray-800 shadow-sm"
              }`}
            >
              <ReactMarkdown components={components}>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {error && (
          <div className="animate-fade-in flex justify-start">
            <div className="max-w-[70%] rounded-2xl rounded-tl-sm bg-red-50 p-3 text-red-600 shadow-sm">
              <ReactMarkdown components={components}>
                {error.message}
              </ReactMarkdown>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="animate-fade-in flex justify-start">
            <div className="flex max-w-[80px] items-center gap-2 rounded-2xl rounded-tl-sm bg-gray-100 p-3 text-gray-800">
              <div className="flex gap-1">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question about our podcast episodes..."
            disabled={isLoading}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-50"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-blue-50 px-6 py-2 text-white hover:bg-blue-40 focus:outline-none focus:ring-2 focus:ring-blue-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
