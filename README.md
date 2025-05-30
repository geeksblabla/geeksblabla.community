# GeeksBlabla Website

> This website is built with [Astro](https://astro.build/)

## Getting Started

1. Fork and clone the repository

```bash
git clone https://github.com/your-username/geeksblabla.community.git
```

2. Install dependencies

```bash
pnpm install
```

3. Start the development server

```bash
pnpm run dev
```

To simplify project management, we added mock data to ensure the website functions in development mode without requiring any external API keys. However, if you want to work with real data for the gallery, episode planning, or adding new episodes through the website, you will need the following API keys:

```sh
NOTION_API_KEY=
GEEKSBLABLA_NOTION_DATABASE_ID=
YOUTUBE_API_KEY=
CLOUDINARY_API_SECRET=
PUBLIC_CLOUDINARY_API_KEY=
PUBLIC_CLOUDINARY_CLOUD_NAME=
```

**Podcast Chatbot Feature API Keys/Config (Required for chatbot functionality):**

```sh
# Required
OPENAI_API_KEY="sk-..." # Your OpenAI API Key
CHROMA_URL="http://localhost:8000" # URL of your ChromaDB instance (local Docker or remote)
CHROMA_TOKEN="your-token-here" # Token for ChromaDB authentication (if required)

# Optional (with default values)
CHROMA_COLLECTION="podcast_episodes" # Default collection name in ChromaDB
OPENAI_CHAT_MODEL="gpt-4-turbo" # Default chat model
OPENAI_EMBEDDING_MODEL="text-embedding-3-small" # Default embedding model
N_RESULTS_RETRIEVE="20" # Number of results to retrieve from ChromaDB
N_RESULTS_CONTEXT="5" # Number of results to include in the context
```

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── articles/
├── authors/
├── episodes/
├── src/
│   ├── actions/ # astro actions, Api for to connect with notion
│   ├── assets/ # images, videos, etc.
│   ├── components/ # reusable components
│   ├── content/ # content for the blog config, articles, authors, episodes
│   ├── lib/ # utils functions
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                    | Action                                           |
| :------------------------- | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm run dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm run build`           | Build your production site to `./dist/`          |
| `pnpm run preview`         | Preview your build locally, before deploying     |
| `pnpm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm run lint`            | Run lint                                         |
| `pnpm run check`           | Run check                                        |
| `pnpm run check-all`       | Run lint, check and build                        |
| `pnpm run astro -- --help` | Get help using the Astro CLI                     |

## Add a new Episode

Adding a new episode is as simple as adding a new markdown file to the episodes folder with the following format:

> ⚠️ `category` attribute should be one of the following: `dev`, `mss`, `ai`, `career`,`ama`

```md
---
date: 2020-02-16
duration: "01:40:00"
title: "Side Projects & Indie Hacking"
tags: ["dev", "indie", "career"]
category: "career"
youtube: https://www.youtube.com/watch?v=bDrUAza36ec
published: true
---

Episode description

## Guests

[Guest 1](https://example.com)

[Guest 2](https://example.com)

## Notes

00:00:00 - Introduction: Welcoming, guests intro.

00:05:00 - Topic 1

00:16:00 - Topic 2

00:24:00 - Topic 3

00:32:00 - Topic 4

## Links

[Link 1](https://www.example.com)

[Link 2](https://www.example.com)

## Prepared and Presented by

[Host 1](https://example.com)
```

## Add a new Article

To add a new article, follow these steps:

1. If this is your first time, you will need to create your author json file in the `authors/` directory.

```json
// authors/author-name.json
{
  "name": "Author Name",
  "url": "https://example.dev",
  "bio": "Guest bio",
  "avatar": "/avatars/avatar.jpg",
  "is_core_team": false
}
```

2. Create a new markdown file in the `articles/` directory.
3. Use the following format:

```md
---
title: "Article Title"
tags: ["tag1", "tag2", "tag3"]
keywords: ["keyword1", "keyword2", "keyword3"]
pubDatetime: 2024-12-01
authors: ["author-name"] # the name of the author file
slug: article-slug
description: "Article description"
ogImage: "/og-image.jpg"
---

Article content
```

## Licensing

The code in this project is licensed under MIT license.

## Contributors

Big thanks to all the code contributors who made this project possible!

![GeeksBlabla contributors](https://contributors.aika.dev/geeksblabla/geeksblabla.com/contributors.svg?max=44)
