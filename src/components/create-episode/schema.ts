import { z } from "zod";

/**
 * episode form schema
 */

export const episodeCategorySchema = z.enum([
  "dev",
  "career",
  "ama",
  "mss",
  "book",
  "ai",
]);

export const linkSchema = z.object({
  title: z.string(),
  url: z
    .string()
    .refine(val => val === "#" || z.string().url().safeParse(val).success, {
      message: "Invalid URL. Must be a valid URL or '#'",
    }),
});

const noteSchema = z.object({
  timestamp: z.string().regex(/^(?:[0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message:
      "Invalid timestamp format. Must be in HH:MM:SS format (e.g. 12:34:56)",
  }),
  content: z.string().min(3, { message: "Note too short" }),
});

const episodeSchemaBase = z.object({
  title: z.string().regex(/^[^"\u0600-\u06FF]+$/, {
    message: "Title cannot contain quotation marks or Arabic characters",
  }),
  date: z.coerce.date(),
  duration: z.string(),
  tags: z.array(z.string()),
  category: episodeCategorySchema,
  youtube: z.string().url(),
  published: z.boolean(),
  featured: z.boolean().optional().default(false),
  episodeNumber: z.string().optional().default("0"),
});

export const episodeSchemaForm = episodeSchemaBase.extend({
  links: z.array(linkSchema),
  guests: z.array(linkSchema),
  hosts: z.array(linkSchema),
  description: z
    .string()
    .min(100, { message: "Description must be at least 100 characters long" }),
  notes: z.array(noteSchema),
  tags: z.array(z.string()),
});

export type FormValues = z.infer<typeof episodeSchemaForm>;

export const DEFAULT_VALUES = {
  links: [],
  guests: [],
  hosts: [],
  notes: [],
  tags: [],
  published: true,
  featured: false,
};

export const getDefaultValues = () => {
  return {
    ...DEFAULT_VALUES,
    notes: [],
  } satisfies Partial<FormValues>;
};
