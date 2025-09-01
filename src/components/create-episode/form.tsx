import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_VALUES, episodeSchemaForm, type FormValues } from "./schema";
import BasicInfos from "./basic-infos";
import { Links } from "./links";
import Notes from "./notes";
import { useState } from "react";
import { Guests } from "./guests";
import { Hosts } from "./hosts";
import { GenerateEpisodeButton } from "./generate-episode-button";
import { GenerateWithAIButton } from "./generate-with-ai-button";
import { NotionUrlSearch } from "./notion-url-search";

const getYoutubeId = (url: string) => {
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get("v");
};

export default function Form() {
  const [episodeData, setEpisodeData] = useState<Partial<FormValues> | null>(
    null
  );
  if (!episodeData) {
    return <NotionUrlSearch onDataFetch={setEpisodeData} />;
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

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 flex gap-2">
        <GenerateWithAIButton setValue={setValue} watch={watch} />
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
