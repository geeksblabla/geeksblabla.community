import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DEFAULT_VALUES,
  episodeSchemaForm,
  type FormValues,
  getDefaultValues,
} from "./schema";
import BasicInfos from "./basic-infos";
import { Links } from "./links";
import Notes from "./notes";
import { useEffect, useState } from "react";
import { Guests } from "./guests";
import { Hosts } from "./hosts";
import { GenerateEpisodeButton } from "./generate-episode-button";
import { actions } from "astro:actions";

const getYoutubeId = (url: string) => {
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get("v");
};

interface Props {
  notionId: string;
}

export default function CompleteFormComponent({ notionId }: Props) {
  const [episodeData, setEpisodeData] = useState<Partial<FormValues> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpisodeData = async () => {
      try {
        // Construct the Notion URL from the ID
        const notionUrl = `https://www.notion.so/geeksblabla/${notionId}`;
        const { error, data } = await actions.getEpisodeDetails({
          url: notionUrl,
        });

        if (error) {
          setError("Failed to fetch episode details. Please try again.");
          return;
        }

        const missingFields = [];
        if (!data.youtube || !data.duration || !data.publishedAt) {
          missingFields.push("YouTube URL");
        }
        if (data.guests?.length) {
          const guestsWithoutUrls = data.guests.filter(guest => !guest.url);
          if (guestsWithoutUrls.length > 0) {
            missingFields.push(
              `URLs for guests: ${guestsWithoutUrls.map(g => g.title).join(", ")}`
            );
          }
        }
        if (missingFields.length > 0) {
          setError(
            `Missing required fields from episode details. Please ensure the Notion page has the following: ${missingFields.join(", ")}`
          );
          return;
        }

        const defaultValues = getDefaultValues();
        const episodeData = {
          ...defaultValues,
          title: data.title,
          date: new Date(data.publishedAt || data.date),
          youtube: data.youtube,
          category: data.category,
          guests: data.guests,
          hosts: data.hosts,
          description: data.description,
          duration: data.duration,
          episodeNumber: data.episodeNumber?.toString() || "0",
        };

        setEpisodeData(episodeData);
      } catch (err) {
        console.error("Error fetching episode data:", err);
        setError("Failed to fetch episode details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpisodeData();
  }, [notionId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <svg
            className="h-8 w-8 animate-spin text-gray-500"
            viewBox="0 0 24 24"
          >
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
          <span className="text-gray-600">Loading episode data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md rounded-lg bg-red-50 p-6">
          <div className="flex items-center">
            <svg
              className="h-6 w-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="ml-3 text-lg font-medium text-red-800">Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4">
            <button
              onClick={() => (window.location.href = "/podcast/new")}
              className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!episodeData) {
    return null;
  }

  return <NewEpisodeForm defaultValues={episodeData} />;
}

const NewEpisodeForm = ({
  defaultValues = DEFAULT_VALUES,
}: {
  defaultValues: Partial<FormValues>;
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    getValues,
    watch,
    trigger,
    setError,
    clearErrors,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(episodeSchemaForm),
    defaultValues,
  });

  const handleBackClick = () => {
    window.location.href = "/podcast/new";
  };

  return (
    <div className="relative">
      <div className="absolute left-0 top-0">
        <button
          onClick={handleBackClick}
          className="flex items-center space-x-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>
      <div className="absolute right-0 top-0 flex gap-2">
        <GenerateEpisodeButton handleSubmit={handleSubmit} />
      </div>
      <div className="grid grid-cols-2 gap-16 pt-24">
        <div className="space-y-2">
          <Notes
            control={control}
            register={register}
            errors={errors}
            setError={setError}
            watch={watch}
            clearErrors={clearErrors}
            setValue={setValue}
            totalDuration={getValues("duration")}
          />
          <Links
            control={control}
            register={register}
            watch={watch}
            errors={errors}
            trigger={trigger}
          />
        </div>
        <div className="space-y-2">
          <div className="aspect-video w-full">
            {defaultValues.youtube && (
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeId(
                  defaultValues.youtube
                )}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                className="aspect-video w-full"
                allowFullScreen
              ></iframe>
            )}
          </div>
          <BasicInfos
            errors={errors}
            register={register}
            getValues={getValues}
          />
          <Guests
            control={control}
            register={register}
            watch={watch}
            errors={errors}
            trigger={trigger}
          />
          <Hosts
            control={control}
            register={register}
            watch={watch}
            errors={errors}
            trigger={trigger}
          />
        </div>
      </div>
    </div>
  );
};
