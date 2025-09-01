import { Client } from "@notionhq/client";
import type {
  NotionResponse,
  NotionNormalizedResponse,
  NotionEpisodeCategory,
  NotionEpisodeStatus,
  NotionEpisodeProperties,
  NotionProperty,
  NotionPage,
  NotionPeopleProperties,
} from "./types";
import {
  NOTION_API_KEY,
  GEEKSBLABLA_NOTION_DATABASE_ID,
} from "astro:env/server";

const databaseId = GEEKSBLABLA_NOTION_DATABASE_ID;
const apiKey = NOTION_API_KEY;

let notionClient: Client;

const getNotionClient = () => {
  if (!notionClient) {
    notionClient = new Client({ auth: apiKey });
  }
  return notionClient;
};

export async function getGeekBlablaEpisodesPlannings(): Promise<NotionNormalizedResponse> {
  if (import.meta.env.DEV) {
    if (!apiKey || !databaseId) {
      const data = await import("./notion-mock.json");
      return data.default as unknown as NotionNormalizedResponse;
    }
  }

  const episodes = (await getNotionClient().databases.query({
    database_id: databaseId,
    filter: {
      or: [
        {
          property: "Status",
          select: {
            equals: "Backlog",
          },
        },
        {
          property: "Status",
          select: {
            equals: "Scheduled",
          },
        },
        {
          property: "Status",
          select: {
            equals: "Next Up",
          },
        },
      ],
    },
  })) as NotionResponse;
  return normalizeNotionResponse(episodes);
}

export const getEpisodeDetails = async (id: string) => {
  const episode = (await getNotionClient().pages.retrieve({
    page_id: id,
  })) as NotionPage;

  const normalizedEpisode = normalizeEpisodeProperties(episode.properties, id);
  const guests = await getPeopleDetails(normalizedEpisode.guests);
  const hosts = await getPeopleDetails(normalizedEpisode.hosts);
  console.log(JSON.stringify({ normalizedEpisode, guests, hosts }, null, 2));
  return {
    ...normalizedEpisode,
    guests,
    hosts,
  };
};

export const getPeopleDetails = async (ids: string[]) => {
  const users = (await Promise.all(
    ids.map(id => getNotionClient().pages.retrieve({ page_id: id }))
  )) as NotionPage[];
  console.log(JSON.stringify(users, null, 2));
  return users.map(user => normalizePeopleProperties(user.properties));
};

function normalizePeopleProperties(properties: {
  [key: string]: NotionProperty;
}): NotionPeopleProperties {
  const link =
    properties.link?.type === "url" ? (properties.link.url ?? "") : "";
  const linkedin =
    properties["Linkedin"]?.type === "url"
      ? (properties["Linkedin"].url ?? "")
      : "";
  return {
    title:
      properties.Name?.type === "title"
        ? (properties.Name.title[0]?.plain_text ?? "")
        : "",
    url: link || linkedin,
  };
}

export function normalizeEpisodeProperties(
  properties: {
    [key: string]: NotionProperty;
  },
  id: string
): NotionEpisodeProperties {
  return {
    episodeId: id,
    title:
      properties.title?.type === "title"
        ? (properties.title.title[0]?.plain_text ?? "")
        : "",

    date:
      properties.Date?.type === "date"
        ? (properties.Date.date?.start ?? "")
        : "",

    guests:
      properties.Guests?.type === "relation"
        ? properties.Guests.relation.map(relation => relation.id)
        : [],

    description:
      properties["Description "]?.type === "rich_text"
        ? (properties["Description "].rich_text[0]?.plain_text ?? "")
        : "",

    youtube:
      properties["Youtube URL"]?.type === "url"
        ? (properties["Youtube URL"].url ?? "")
        : "",

    category:
      properties["Category "]?.type === "select"
        ? ((properties[
            "Category "
          ].select?.name.toLowerCase() as NotionEpisodeCategory) ?? "dev")
        : "dev",

    hosts:
      properties.Hosts?.type === "relation"
        ? properties.Hosts.relation.map(relation => relation.id)
        : [],

    assignedTo:
      properties["Assign to "]?.type === "people"
        ? (properties["Assign to "].people[0]?.name ?? "")
        : "",

    status:
      properties.Status?.type === "select"
        ? ((properties.Status.select?.name.toLowerCase() as NotionEpisodeStatus) ??
          "backlog")
        : "backlog",
  };
}

export function normalizeNotionResponse(
  response: NotionResponse
): NotionNormalizedResponse {
  return response.results.map(page => {
    const properties = page.properties;
    console.log(page.id);
    return normalizeEpisodeProperties(properties, page.id);
  });
}

/**
 *
 * Episode suggestions
 *
 */

const formatSubmission = (name: string, content: string) => {
  const timestamp = new Date().toLocaleDateString("en-GB");
  return `${content.trimEnd()} \n > By: ${name}  At: ${timestamp}`;
};

export async function addSuggestionToNotionEpisode({
  episodeId,
  submittedBy,
  content,
}: {
  episodeId: string;
  submittedBy: string;
  content: string;
}) {
  const notion = getNotionClient();

  try {
    // First, fetch the current page to get existing suggestions
    const page = (await notion.pages.retrieve({
      page_id: episodeId,
    })) as NotionPage;

    const existingSuggestions =
      page.properties.suggestions?.type === "rich_text"
        ? page.properties.suggestions.rich_text[0]?.plain_text || ""
        : "";

    const newSuggestion = formatSubmission(submittedBy, content);
    const combinedSuggestions = existingSuggestions
      ? `${existingSuggestions}\n\n\n${newSuggestion}`
      : newSuggestion;

    await notion.pages.update({
      page_id: episodeId,
      properties: {
        suggestions: {
          rich_text: [
            {
              text: {
                content: combinedSuggestions,
              },
            },
          ],
        },
      },
    });
  } catch (error) {
    console.error("Error adding suggestion to Notion:", error);
    throw error;
  }
}

export async function addNewEpisodeToNotion({
  title,
  description,
  submittedBy,
}: {
  title: string;
  description: string;
  submittedBy: string;
}) {
  const notion = getNotionClient();

  const suggestion = formatSubmission(submittedBy, description);

  try {
    const response = await notion.pages.create({
      parent: {
        type: "database_id",
        database_id: databaseId,
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
        suggestions: {
          rich_text: [
            {
              text: {
                content: suggestion,
              },
            },
          ],
        },
        Status: {
          select: {
            name: "Need Triage",
          },
        },
      },
    });

    return response;
  } catch (error) {
    console.error("Error creating new episode in Notion:", error);
    throw error;
  }
}
