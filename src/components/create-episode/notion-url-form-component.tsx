import { extractNotionPageId } from "@/lib/notion-utils";
import { useState } from "react";

export default function NotionUrlFormComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const url = formData.get("notionUrl") as string;

    // Extract the Notion page ID from the URL
    const pageId = extractNotionPageId(url);

    if (!pageId) {
      setIsLoading(false);
      setError("Invalid Notion URL. Please provide a valid Notion page URL.");
      return;
    }

    // Redirect to the form page with the Notion page ID
    window.location.href = `/podcast/new/${pageId}`;
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-4 pt-[10vh]">
      <div className="w-full max-w-xl rounded-lg p-8">
        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">
          Add A New Episode
        </h2>
        <div className="mb-6">
          <p className="text-center text-gray-600">
            Enter a Notion URL to automatically fetch episode details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              id="notionUrl"
              name="notionUrl"
              className="flex-1 rounded-md border border-gray-300 px-4 py-3 shadow-sm transition-all focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Paste your Notion URL here"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="min-w-[100px] rounded-md bg-gray-500 px-6 py-3 font-medium text-white transition-all hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
