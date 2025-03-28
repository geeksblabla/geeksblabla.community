import {
  getYoutubeThumbnail,
  slugify,
  transformDateToLocaleString,
} from "@/lib/utils";
import { reference, z, type SchemaContext } from "astro:content";

export const podcastCategorySchema = z.enum([
  "dev",
  "career",
  "ama",
  "mss",
  "book",
  "ai",
]);

export type PodcastCategory = z.infer<typeof podcastCategorySchema>;

export const episodeSchema = z
  .object({
    title: z.string(),
    date: z.coerce.date(),
    dateString: z.string().optional(),
    duration: z.string(),
    tags: z.array(z.string()),
    category: podcastCategorySchema,
    youtube: z.string().url(),
    published: z.boolean(),
    featured: z.boolean().optional().default(false),
    ogImage: z.string().optional(),
    slug: z.string().optional(),
  })
  .transform(arg => {
    const ogImage = getYoutubeThumbnail(arg.youtube);
    const slug = arg.slug ? arg.slug : slugify(arg.title);
    const dateString = transformDateToLocaleString(arg.date.toISOString());
    const category = arg.category.toLowerCase();
    return {
      ...arg,
      ogImage,
      slug,
      dateString,
      category,
    };
  });

export const blogSchema = (ctx: SchemaContext) =>
  z
    .object({
      authors: z.array(reference("authors")).optional(),
      pubDatetime: z.date(),
      title: z.string(),
      slug: z.string().optional(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      keywords: z.array(z.string()).default([""]),
      ogImage: ctx.image().optional(), //z.string().optional(),
      description: z.string().optional().default(""),
      published: z.boolean().optional().default(true),
    })
    .transform(arg => {
      const slug = arg.slug ? arg.slug : slugify(arg.title);
      return {
        ...arg,
        slug,
      };
    });

export const authorSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  bio: z.string(),
  avatar: z.string(),
  is_core_team: z.boolean().optional().default(false),
});

export type ArticleFrontmatter = z.infer<ReturnType<typeof blogSchema>>;

export const memberSchema = (ctx: SchemaContext) =>
  z.object({
    name: z.string(),
    link: z.string().url(),
    profile_image: ctx.image(),
    status: z.enum(["active", "past"]),
  });

export const teamSchema = (ctx: SchemaContext) =>
  z.object({
    members: z.array(memberSchema(ctx)),
  });

export const testimonialSchema = (ctx: SchemaContext) =>
  z.object({
    name: z.string(),
    role: z.string(),
    avatar: ctx.image().optional(),
    quote: z.string().optional(),
    video: z.string().url().optional(),
    poster: z.string().url().optional(),
  });

export const testimonialsSchema = (ctx: SchemaContext) =>
  z.object({
    testimonials: z.array(testimonialSchema(ctx)),
  });
