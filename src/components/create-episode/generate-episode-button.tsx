import { type z } from "zod";
import type { UseFormHandleSubmit } from "react-hook-form";
import { useState, useRef, useEffect } from "react";

import { episodeSchemaForm } from "./schema";
import { generateEpisodeMarkdown } from "./generate-episode-markdown";

type FormValues = z.infer<typeof episodeSchemaForm>;

const generateNewFileUrl = (
  data: FormValues,
  markdown: string,
  episodeNumber: string
) => {
  const repoOwner = "geeksblabla";
  const repoName = "geeksblabla.community";
  const branchName = "master";
  const folderPath = "episodes";

  const fileName = `episode-${episodeNumber.toString().padStart(4, "0")}.md`;

  return {
    fileName,
    url: `https://github.com/${repoOwner}/${repoName}/new/${branchName}/${folderPath}?filename=${encodeURIComponent(fileName)}&value=${encodeURIComponent(markdown)}`,
  };
};

export const GenerateEpisodeButton = ({
  handleSubmit,
}: {
  handleSubmit: UseFormHandleSubmit<FormValues>;
}) => {
  const [markdown, setMarkdown] = useState<string>("");
  const [formData, setFormData] = useState<FormValues | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    const handleShowModal = () => {
      document.body.style.overflow = "hidden";
    };

    const handleCloseModal = () => {
      document.body.style.overflow = "unset";
    };

    dialog?.addEventListener("close", handleCloseModal);
    dialog?.addEventListener("showModal", handleShowModal);

    return () => {
      dialog?.removeEventListener("close", handleCloseModal);
      dialog?.removeEventListener("showModal", handleShowModal);
    };
  }, []);

  const onSubmit = (data: FormValues) => {
    const generatedMarkdown = generateEpisodeMarkdown(data);
    setMarkdown(generatedMarkdown);
    setFormData(data);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-500 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
        onClick={handleSubmit(onSubmit)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        Generate Episode File
      </button>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 m-0 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl backdrop:bg-gray-500/50"
      >
        <div className="relative flex flex-col gap-4">
          <div className="absolute right-0 top-0 flex gap-2">
            <button
              onClick={() => dialogRef.current?.close()}
              className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100"
              title="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <h2 className="text-xl font-semibold text-gray-800">
            Generated Episode Markdown
          </h2>

          <button
            onClick={() => {
              if (formData) {
                const newFileUrl = generateNewFileUrl(
                  formData,
                  markdown,
                  formData.episodeNumber || "0"
                );
                window.open(newFileUrl.url, "_blank");
              }
            }}
            className="flex items-center gap-2 rounded-md p-2 transition-colors"
            title="Create Pull Request on GitHub"
            disabled={!formData}
          >
            {/* GitHub Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-gray-700"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.396.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.359.309.678.919.678 1.852 0 1.336-.012 2.417-.012 2.747 0 .268.18.579.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
            </svg>
            <span>Create PR</span>
          </button>

          <div className="relative mt-4 max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200">
            <div className="absolute right-0 top-0 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(markdown);
                }}
                className="flex items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100"
                title="Copy to clipboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
              </button>
            </div>
            <pre className="bg-gray-50 p-4">
              <code className="block whitespace-pre-wrap break-words font-mono text-sm text-gray-800">
                {markdown}
              </code>
            </pre>
          </div>
        </div>
      </dialog>
    </>
  );
};
