import { useState } from "react";
import { type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { type z } from "zod";
import { episodeSchemaForm } from "./schema";

type FormValues = z.infer<typeof episodeSchemaForm>;

interface GenerateWithAIButtonProps {
  setValue: UseFormSetValue<FormValues>;
  watch: UseFormWatch<FormValues>;
}

interface Metadata {
  videoDuration: string;
  videoDurationSeconds: number;
  notesGenerated: number;
  notesRecommended: { min: number; target: number; max: number };
  validation: {
    isValid: boolean;
    warnings: string[];
  };
}

export const GenerateWithAIButton = ({
  setValue,
  watch,
}: GenerateWithAIButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const youtubeUrl = watch("youtube");

  const handleGenerateWithAI = async () => {
    if (!youtubeUrl) {
      alert("Please provide a YouTube URL first");
      return;
    }

    setIsLoading(true);
    setMetadata(null); // Clear previous metadata
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

      // Store metadata for warnings
      if (data.metadata) {
        setMetadata(data.metadata);
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
    <div className="w-full">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-500 px-4 py-2 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleGenerateWithAI}
        disabled={isLoading || !youtubeUrl}
      >
        {isLoading
          ? "Generating Notes and Description..."
          : "Generate Notes and Description with AI"}
      </button>

      {metadata && !metadata.validation.isValid && (
        <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <h4 className="mb-2 font-semibold text-yellow-800">
            ⚠️ Quality Warnings
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
            {metadata.validation.warnings.map(
              (warning: string, index: number) => (
                <li key={index}>{warning}</li>
              )
            )}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isLoading}
              className="rounded bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Regenerate Notes
            </button>
            <span className="text-xs text-yellow-600">
              Note: Regeneration uses API credits and may incur costs
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
