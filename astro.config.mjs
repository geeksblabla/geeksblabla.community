import { defineConfig, envField } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import remarkToc from "remark-toc";
import icon from "astro-icon";
import remarkCollapse from "remark-collapse";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";

import rehypeExternalLinks from "rehype-external-links";

import mdx from "@astrojs/mdx";
import pagefind from "astro-pagefind";
// import netlify from "@astrojs/netlify";
import { getAstroRedirects } from "./src/redirects";

import cloudflare from "@astrojs/cloudflare";

const envSchema = {
  NOTION_API_KEY: envField.string({ context: "server", access: "secret" }),
  GEEKSBLABLA_NOTION_DATABASE_ID: envField.string({
    context: "server",
    access: "secret",
  }),
  YOUTUBE_API_KEY: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  CLOUDINARY_API_SECRET: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  PUBLIC_CLOUDINARY_API_KEY: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  PUBLIC_CLOUDINARY_CLOUD_NAME: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  OPENAI_API_KEY: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  OPENAI_CHAT_MODEL: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  OPENAI_EMBEDDING_MODEL: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  CHROMA_URL: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  CHROMA_TOKEN: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  CHROMA_COLLECTION: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  N_RESULTS_RETRIEVE: envField.number({
    context: "server",
    access: "secret",
    optional: true,
  }),
  N_RESULTS_CONTEXT: envField.number({
    context: "server",
    access: "secret",
    optional: true,
  }),
  TRANSLATE_NON_ENGLISH: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  OPEN_ROUTER_API_KEY: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
  SUPADATA_API_KEY: envField.string({
    context: "server",
    access: "secret",
    optional: true,
  }),
};

const redirects = getAstroRedirects();
// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  output: "static",
  adapter: cloudflare(),
  env: {
    schema: envSchema,
  },
  prefetch: {
    prefetchAll: true,
  },
  experimental: {},
  build: {
    format: "file",
  },
  redirects,

  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap({
      filter: page => !page.includes("/404"),
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(),
    }),
    icon(),
    mdx(),
    pagefind(),
  ],

  markdown: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: "_blank",
          rel: ["noopener", "noreferrer"],
          internal: true,
        },
      ],
    ],
    remarkPlugins: [
      remarkToc,
      [
        remarkCollapse,
        {
          test: "Table of contents",
        },
      ],
    ],
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      wrap: true,
    },
  },
  vite: {
    assetsInclude: ["**/*.riv"],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js", "node:fs", "stream"],
    },
    ssr: {
      external: [
        "@resvg/resvg-js",
        "@resvg/resvg-js-darwin-arm64",
        "@resvg/resvg-js-darwin-x64",
        "@resvg/resvg-js-linux-arm64-gnu",
        "@resvg/resvg-js-linux-arm64-musl",
        "@resvg/resvg-js-linux-x64-gnu",
        "@resvg/resvg-js-linux-x64-musl",
        "@resvg/resvg-js-win32-arm64-msvc",
        "@resvg/resvg-js-win32-x64-msvc",
        "node:fs",
        "node:path",
        "node:url",
        "node:crypto",
        "path",
        "fs",
        "stream",
        "util",
        "console",
        "child_process",
      ],
    },
  },
  scopedStyleStrategy: "where",
});
