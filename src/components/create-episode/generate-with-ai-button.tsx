import { useState } from "react";
import { type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { type z } from "zod";
import { episodeSchemaForm } from "./schema";

type FormValues = z.infer<typeof episodeSchemaForm>;

interface GenerateWithAIButtonProps {
  setValue: UseFormSetValue<FormValues>;
  watch: UseFormWatch<FormValues>;
}

export const GenerateWithAIButton = ({
  setValue,
  watch,
}: GenerateWithAIButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const youtubeUrl = watch("youtube");

  const handleGenerateWithAI = async () => {
    if (!youtubeUrl) {
      alert("Please provide a YouTube URL first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/episode-analysis?url=${encodeURIComponent(youtubeUrl)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to analyze episode: ${response.statusText}`);
      }

      const data = await response.json();

      // Set the description
      if (data.description) {
        setValue("description", data.description);
      }

      // Set the notes
      if (data.notes && Array.isArray(data.notes)) {
        setValue("notes", data.notes);
      }
    } catch (error) {
      console.error("Error generating with AI:", error);
      alert(
        `Failed to generate with AI: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-500 px-4 py-2 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={handleGenerateWithAI}
      disabled={isLoading || !youtubeUrl}
    >
      {isLoading ? "Generating..." : "Generate with AI"}
    </button>
  );
};
