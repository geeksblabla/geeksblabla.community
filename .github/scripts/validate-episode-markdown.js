// @ts-check
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import matter from "gray-matter";

const markdownLinkRegex = /^(?:[-*]\s*)?\[.+\]\(.+\)$/;

/**
 * @typedef {Object} ValidationError
 * @property {number} line - The line number where the error occurred
 * @property {string} message - The error message
 */

/**
 * @typedef {Object} ValidationResult
 * @property {string} episodePath - The episode file path
 * @property {boolean} isValid - Whether the episode is valid
 * @property {ValidationError[]} errors - The array of errors
 */

/**
 * Validate the frontmatter of an episode
 * @param {Object} frontMatter - The frontmatter object
 * @returns {ValidationError[]} errors - The array of errors
 */
const validateFrontMatter = frontMatter => {
  const errors = [];
  // Enhanced frontmatter validation based on schema.ts
  const requiredFrontMatter = [
    "date",
    "duration",
    "title",
    "tags",
    "category",
    "youtube",
    "published",
  ];

  // Validate required fields
  requiredFrontMatter.forEach(field => {
    if (!frontMatter[field]) {
      errors.push({
        line: 1,
        message: `Missing required frontmatter field: ${field}`,
      });
    }
  });

  // Validate specific fields according to schema
  if (frontMatter.title && /["\u0600-\u06FF]/.test(frontMatter.title)) {
    errors.push({
      line: 1,
      message: "Title cannot contain quotation marks or Arabic characters",
    });
  }

  if (frontMatter.youtube && !frontMatter.youtube.startsWith("http")) {
    errors.push({
      line: 1,
      message: "YouTube field must be a valid URL",
    });
  }

  const validCategories = ["dev", "career", "ama", "mss", "book", "ai"];
  if (frontMatter.category && !validCategories.includes(frontMatter.category)) {
    errors.push({
      line: 1,
      message: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
    });
  }

  if (
    frontMatter.duration &&
    !/^(?:(?:[0-9]|[0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]|[0-9]:[0-5][0-9]:[0-5][0-9])$/.test(
      frontMatter.duration
    )
  ) {
    errors.push({
      line: 1,
      message:
        "Duration must be in HH:MM:SS or H:MM:SS format (e.g. 12:34:56 or 2:34:56)",
    });
  }

  if (frontMatter.tags && !Array.isArray(frontMatter.tags)) {
    errors.push({
      line: 1,
      message: "Tags must be an array",
    });
  }

  if (
    frontMatter.published !== undefined &&
    typeof frontMatter.published !== "boolean"
  ) {
    errors.push({
      line: 1,
      message: "Published must be a boolean value",
    });
  }

  if (
    frontMatter.featured !== undefined &&
    typeof frontMatter.featured !== "boolean"
  ) {
    errors.push({
      line: 1,
      message: "Featured must be a boolean value",
    });
  }

  return errors;
};

/**
 * Validate the markdown file for an episode
 * @param {string} input - Either episode number or full file path
 * @returns {ValidationResult} - An object containing the validation results
 */
function validateEpisodeMarkdown(input) {
  const errors = [];
  // Determine if input is episode number or path
  const filePath = input.includes(".md")
    ? input
    : join(
        process.cwd(),
        "episodes",
        `episode-${String(input).padStart(4, "0")}.md`
      );
  try {
    const fileContent = readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");

    // Parse frontmatter and content
    const { data: frontMatter } = matter(fileContent);

    const frontMatterErrors = validateFrontMatter(frontMatter);
    if (frontMatterErrors.length > 0) {
      errors.push(...frontMatterErrors);
    }

    // Find line numbers for each section
    const sectionLines = {
      "## Guests": -1,
      "## Notes": -1,
      "## Links": -1,
      "## Prepared and Presented by": -1,
    };

    lines.forEach((line, index) => {
      // Make the check more flexible by trimming and comparing
      const trimmedLine = line.trim();
      Object.keys(sectionLines).forEach(section => {
        if (trimmedLine === section) {
          sectionLines[section] = index + 1;
        }
      });
    });

    // Validate main sections if they are present
    Object.entries(sectionLines).forEach(([section, lineNum]) => {
      if (lineNum === -1) {
        errors.push({
          line: -1,
          message: `Missing required section: ${section}`,
        });
      }
    });

    // Validate Guests format and if every line represents a valid guest format
    if (sectionLines["## Guests"] !== -1) {
      let currentLine = sectionLines["## Guests"] + 1;
      while (
        currentLine < lines.length &&
        !lines[currentLine].startsWith("##")
      ) {
        const line = lines[currentLine].trim();
        if (line && !line.match(markdownLinkRegex)) {
          errors.push({
            line: currentLine + 1,
            message: `Invalid guest format: "${line}". Expected format: "- [Name](link)"`,
          });
        }
        currentLine++;
      }
    }

    // Validate Notes format and make sure every line represents a valid note format
    if (sectionLines["## Notes"] !== -1) {
      let currentLine = sectionLines["## Notes"] + 1;
      while (
        currentLine < lines.length &&
        !lines[currentLine].startsWith("##")
      ) {
        const line = lines[currentLine].trim();
        if (line && !line.match(/^[0-9]?[0-9]:[0-9]{2}:[0-9]{2} [-–] .+/)) {
          errors.push({
            line: currentLine + 1,
            message: `Invalid note format: "${line}". Expected format: "HH:MM:SS - Description" or "HH:MM:SS – Description"`,
          });
        }
        currentLine++;
      }
    }

    // Validate Links format and make sure every line represents a valid link format
    if (sectionLines["## Links"] !== -1) {
      let currentLine = sectionLines["## Links"] + 1;
      while (
        currentLine < lines.length &&
        !lines[currentLine].startsWith("##")
      ) {
        const line = lines[currentLine].trim();
        if (line && !line.match(markdownLinkRegex)) {
          errors.push({
            line: currentLine + 1,
            message: `Invalid link format: "${line}". Expected format: "[Title](url)"`,
          });
        }
        currentLine++;
      }
    }

    // Update host format validation and make sure every line represents a valid presenter format
    if (sectionLines["## Prepared and Presented by"] !== -1) {
      let currentLine = sectionLines["## Prepared and Presented by"] + 1;
      while (
        currentLine < lines.length &&
        !lines[currentLine].startsWith("##")
      ) {
        const line = lines[currentLine].trim();
        if (line && !line.match(markdownLinkRegex)) {
          errors.push({
            line: currentLine + 1,
            message: `Invalid presenter format: "${line}". Expected format: "[Name](link)" or "- [Name](link)"`,
          });
        }
        currentLine++;
      }
    }

    return {
      episodePath: filePath,
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push({
      line: 0,
      message: `Failed to read or parse episode file: ${error.message}`,
    });
    return {
      episodePath: filePath,
      isValid: false,
      errors,
    };
  }
}

/**
 * Validate all episodes
 * @returns {ValidationResult[]} errors - The array of errors
 */
function validateAllEpisodes() {
  const results = [];
  const episodesDir = join(process.cwd(), "episodes");
  let episodeCount = 0;
  try {
    const files = readdirSync(episodesDir);
    episodeCount = files.filter(
      file => file.startsWith("episode-") && file.endsWith(".md")
    ).length;
  } catch (error) {
    console.error("Failed to read episodes directory:", error.message);
    process.exit(1);
  }

  if (episodeCount === 0) {
    console.error("No episodes found in episodes directory");
    process.exit(1);
  }

  for (let i = 1; i <= episodeCount; i++) {
    const paddedNumber = String(i).padStart(4, "0");
    const result = validateEpisodeMarkdown(paddedNumber);
    results.push(result);
  }

  return results;
}

const main = async () => {
  let hasErrors = false;
  let totalErrors = 0;
  const input = process.argv[2];

  if (!input) {
    console.info("No input provided, validating all episodes");
    const results = validateAllEpisodes();
    const invalidEpisodes = results.filter(result => !result.isValid);
    if (invalidEpisodes.length > 0) {
      hasErrors = true;
      console.error("🚨 Validation failed for some episodes. Errors:");
      invalidEpisodes.forEach(result => {
        totalErrors++;
        console.error(`\n❌ ${result.episodePath.split("/").pop()}:`);
        result.errors.forEach(error => {
          console.error(`Line ${error.line}: ${error.message}`);
        });
        console.error("");
      });
    }
    if (invalidEpisodes.length === 0) {
      console.log("✅ Good Job! All episodes are valid");
    }
  }

  // If it's a path, validate single file
  if (input) {
    const { isValid, errors } = validateEpisodeMarkdown(input);
    if (!isValid) {
      hasErrors = true;
      console.error(`\nValidation failed for ${input}. Errors:`);
      errors.forEach(error => {
        totalErrors++;
        console.error(`Line ${error.line}: ${error.message}`);
      });
    } else {
      console.log(`✅ Good Job! ${input} is valid`);
    }
  }

  if (totalErrors > 0) {
    console.log(`Total errors: ${totalErrors}`);
  }

  if (hasErrors) {
    process.exit(1);
  }
};

main();
