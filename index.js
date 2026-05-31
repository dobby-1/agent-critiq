#!/usr/bin/env node
/**
 * Agent Critiq MCP Server
 * Official Model Context Protocol server for Agent Critiq AI reviews database.
 * Allows Claude, Cursor, VS Code Copilot, and other MCP-compatible AI assistants
 * to query 100+ AI tools from agentcritiq.com in real time.
 *
 * GitHub: https://github.com/dobbyb-aidev/agent-critiq
 * Website: https://agentcritiq.com
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Try multiple candidate paths so the server works from any working directory */
function loadDataset() {
  const candidates = [
    join(__dirname, "..", "public", "agent-critiq-2026-dataset.json"),
    join(__dirname, "agent-critiq-2026-dataset.json"),
    resolve("public/agent-critiq-2026-dataset.json"),
  ];

  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf8");
      return JSON.parse(raw);
    } catch {
      // try next
    }
  }
  throw new Error(
    "Could not find agent-critiq-2026-dataset.json. " +
      "Run the server from the project root or place the dataset next to index.js."
  );
}

const dataset = loadDataset();
const tools = dataset.tools; // Array<Tool>

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function normalise(str = "") {
  return str.toLowerCase().trim();
}

function toolSummary(tool) {
  return {
    name: tool.name,
    slug: tool.slug || tool.id,
    category: tool.category,
    description: tool.description,
    price: tool.price,
    rating: tool.rating,
    reviewUrl: tool.reviewUrl,
    officialUrl: tool.officialUrl,
    tags: tool.tags || [],
    isSponsored: tool.isSponsored || false,
  };
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function searchAiTools({ query, category, min_rating, free_only, limit = 10 }) {
  let results = [...tools];

  if (query) {
    const q = normalise(query);
    results = results.filter(
      (t) =>
        normalise(t.name).includes(q) ||
        normalise(t.description || "").includes(q) ||
        (t.tags || []).some((tag) => normalise(tag).includes(q)) ||
        normalise(t.category || "").includes(q)
    );
  }

  if (category) {
    const c = normalise(category);
    results = results.filter((t) => normalise(t.category || "").includes(c));
  }

  if (min_rating != null) {
    results = results.filter((t) => (t.rating || 0) >= Number(min_rating));
  }

  if (free_only) {
    results = results.filter((t) =>
      normalise(t.price || "").includes("free")
    );
  }

  results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return results.slice(0, Math.min(limit, 50)).map(toolSummary);
}

function getToolDetail({ slug }) {
  if (!slug) return null;
  const s = normalise(slug);
  return (
    tools.find((t) => normalise(t.slug || t.id) === s) ||
    tools.find((t) => normalise(t.name) === s) ||
    tools.find(
      (t) =>
        normalise(t.slug || t.id).includes(s) ||
        normalise(t.name).includes(s)
    ) ||
    null
  );
}

function listCategories() {
  const map = {};
  for (const t of tools) {
    const c = t.category || "Uncategorised";
    map[c] = (map[c] || 0) + 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ category: name, tool_count: count }));
}

function getTopRated({ category, limit = 10 }) {
  let results = [...tools];
  if (category) {
    const c = normalise(category);
    results = results.filter((t) => normalise(t.category || "").includes(c));
  }
  results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return results.slice(0, limit).map(toolSummary);
}

function compareTools({ slugs }) {
  if (!Array.isArray(slugs) || slugs.length < 2) {
    return { error: "Provide at least 2 slugs to compare." };
  }
  const found = slugs.map((s) => getToolDetail({ slug: s })).filter(Boolean);
  if (found.length === 0) return { error: "No matching tools found." };

  const comparison = {};
  for (const f of ["name", "category", "price", "rating", "description"]) {
    comparison[f] = Object.fromEntries(found.map((t) => [t.name, t[f]]));
  }
  comparison.reviewLinks = Object.fromEntries(
    found.map((t) => [t.name, t.reviewUrl])
  );
  return { tools_compared: found.length, comparison };
}

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "agent-critiq-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── List available tools ────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_ai_tools",
      description:
        "Search Agent Critiq's database of 100+ AI tools, agents, and LLMs. " +
        "Filter by keyword, category, minimum rating, or free-only pricing. " +
        "Returns ranked results with review links from agentcritiq.com.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Keyword to search in tool names, descriptions, and tags.",
          },
          category: {
            type: "string",
            description:
              "Filter by category. E.g. 'Coding & Dev Agents', 'Autonomous Agents'. Partial match supported.",
          },
          min_rating: {
            type: "number",
            description: "Minimum rating (0–5). E.g. 4.5 for top-tier only.",
          },
          free_only: {
            type: "boolean",
            description: "If true, only returns tools with free or freemium pricing.",
          },
          limit: {
            type: "number",
            description: "Max results to return. Default 10, max 50.",
          },
        },
      },
    },
    {
      name: "get_tool_detail",
      description:
        "Get full details for a specific AI tool by slug or name. " +
        "Returns description, pricing, rating, tags, and direct links.",
      inputSchema: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Tool slug or name. E.g. 'cursor', 'midjourney', 'open-interpreter'.",
          },
        },
        required: ["slug"],
      },
    },
    {
      name: "list_categories",
      description:
        "List all AI tool categories in the Agent Critiq database with tool counts.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_top_rated",
      description:
        "Get the highest-rated AI tools overall or within a specific category.",
      inputSchema: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional category filter." },
          limit: { type: "number", description: "Number of results. Default 10." },
        },
      },
    },
    {
      name: "compare_tools",
      description:
        "Compare 2–3 AI tools side-by-side across pricing, rating, category, and description.",
      inputSchema: {
        type: "object",
        properties: {
          slugs: {
            type: "array",
            items: { type: "string" },
            description: "Array of 2–3 tool slugs or names.",
          },
        },
        required: ["slugs"],
      },
    },
  ],
}));

// ── Handle tool calls ───────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case "search_ai_tools":
        result = searchAiTools(args || {});
        break;
      case "get_tool_detail": {
        const tool = getToolDetail(args || {});
        if (!tool) {
          return {
            content: [{
              type: "text",
              text: `No tool found matching "${args?.slug}". Try search_ai_tools to discover available tools.`,
            }],
          };
        }
        result = toolSummary(tool);
        break;
      }
      case "list_categories":
        result = listCategories();
        break;
      case "get_top_rated":
        result = getTopRated(args || {});
        break;
      case "compare_tools":
        result = compareTools(args || {});
        break;
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start ───────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`✅ Agent Critiq MCP Server running — ${tools.length} AI tools ready.`);
