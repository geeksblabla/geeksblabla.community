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

export default function ChatInterface() {
  const [visitorId, setVisitorId] = useState<string>("");
  const [isFingerprintLoading, setIsFingerprintLoading] = useState(true);

  // Initialize FingerprintJS
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        // Check if we already have a visitor ID in localStorage
        const storedId = localStorage.getItem(VISITOR_ID_KEY);
        if (storedId) {
          setVisitorId(storedId);
          setIsFingerprintLoading(false);
          return;
        }

        // If not, get a new one from FingerprintJS
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const newVisitorId = result.visitorId;

        // Store it in localStorage
        localStorage.setItem(VISITOR_ID_KEY, newVisitorId);
        setVisitorId(newVisitorId);
      } catch {
        // Fallback to a random ID if fingerprinting fails
        const fallbackId = `client-${Math.random().toString(36).substring(7)}`;
        localStorage.setItem(VISITOR_ID_KEY, fallbackId);
        setVisitorId(fallbackId);
      } finally {
        setIsFingerprintLoading(false);
      }
    };

    initFingerprint();

    // Listen for storage changes (in case another tab updates the ID)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === VISITOR_ID_KEY && e.newValue) {
        setVisitorId(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      headers: {
        "X-Visitor-ID": visitorId,
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
