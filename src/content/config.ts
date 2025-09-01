import { file, glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { PUBLIC_CLOUDINARY_CLOUD_NAME } from "astro:env/server";
import { cldAssetsLoader } from "astro-cloudinary/loaders";
import {
  authorSchema,
  blogSchema,
  episodeSchema,
  memberSchema,
  testimonialSchema,
} from "./schema";
/**
 * Podcast collection
 * Read episodes markdown files from episodes folder in the root of the project
 * Validate the data using zod
 * Return the data based on the episodeSchema
 */
const podcast = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "episodes" }),
  schema: episodeSchema,
});

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "articles" }),
  schema: arg => blogSchema(arg),
});

export const authors = defineCollection({
  loader: glob({ pattern: "**/[^_]*.json", base: "authors" }),
  schema: authorSchema,
});

/**
 * Gallery collection
 * As you need env vars to use cldAssetsLoader, we need to use a mock data to allow people to play with the website locally
 */

const gallery = !PUBLIC_CLOUDINARY_CLOUD_NAME
  ? defineCollection({
      loader: file("gallery-mock-data.json"),
    })
  : defineCollection({
      loader: cldAssetsLoader({
        limit: 30,
        folder: "community-gallery",
      }),
    });

const team = defineCollection({
  loader: file("team/team-members.json"),
  schema: ctx => memberSchema(ctx),
});

const testimonials = defineCollection({
  loader: file("testimonials/data.json"),
  schema: ctx => testimonialSchema(ctx),
});

export const collections = {
  podcast,
  gallery,
  team,
  blog,
  authors,
  testimonials,
};
