/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly CHROMA_URL: string;
  readonly CHROMA_TOKEN: string;
  readonly CHROMA_COLLECTION: string;
  readonly OPENAI_API_KEY: string;
  readonly OPENAI_CHAT_MODEL: string;
  readonly OPENAI_EMBEDDING_MODEL: string;
  readonly N_RESULTS_RETRIEVE: string;
  readonly N_RESULTS_CONTEXT: string;
  readonly TRANSLATE_NON_ENGLISH: string;

  readonly OPENROUTER_API_KEY: string;
  readonly SUPADATA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
