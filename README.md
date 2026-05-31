# 🤖 Agent Critiq MCP Server

**Official Model Context Protocol (MCP) server for [Agent Critiq](https://agentcritiq.com)** — the AI agents & software review platform.

This server lets **Claude, Cursor, VS Code Copilot**, and any MCP-compatible AI assistant query the Agent Critiq database of **100+ AI tools** in real time — ratings, pricing, categories, and direct review links.

---

## ✨ Available Tools

| Tool | Description |
|------|-------------|
| `search_ai_tools` | Search by keyword, category, rating, or free-only filter |
| `get_tool_detail` | Full details for a specific tool by slug or name |
| `list_categories` | All 17 categories with tool counts |
| `get_top_rated` | Top-rated tools overall or by category |
| `compare_tools` | Side-by-side comparison of 2-3 tools |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18 or later
- Clone/download this repository

### Install dependencies

```bash
cd mcp-server
npm install
```

### Test locally

```bash
node index.js
# → ✅ Agent Critiq MCP Server running — 101 AI tools ready.
```

---

## 🔌 Connect to Claude Desktop

1. Open your Claude Desktop config file:
   - **macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the following entry (adjust the path):

```json
{
  "mcpServers": {
    "agent-critiq": {
      "command": "node",
      "args": ["C:/Users/YourName/path/to/agent-critiq/mcp-server/index.js"]
    }
  }
}
```

3. Restart Claude Desktop. You'll see **Agent Critiq** in the tools panel. ✅

---

## 🔌 Connect to Cursor / VS Code Copilot

Add to your workspace `.cursor/mcp.json` or `mcp.json`:

```json
{
  "mcpServers": {
    "agent-critiq": {
      "command": "node",
      "args": ["./mcp-server/index.js"]
    }
  }
}
```

---

## 💬 Example Prompts

Once connected, ask your AI assistant:

> *"What are the top 5 free coding AI agents according to Agent Critiq?"*

> *"Compare Cursor vs GitHub Copilot vs Codeium."*

> *"Find me autonomous AI agents with a rating above 4.5."*

> *"List all AI image generation tools in the Agent Critiq database."*

---

## 📦 Data Source

The server reads from `public/agent-critiq-2026-dataset.json` — a curated, machine-readable snapshot of the Agent Critiq catalogue.

- **101 AI tools** across 17 categories
- Updated regularly and synced with [agentcritiq.com](https://agentcritiq.com)
- Also available as a [Hugging Face Dataset](https://huggingface.co/datasets/dobbyb-aidev/agent-critiq-ai-reviews)

---

## 📄 License

MIT — free to use, fork, and integrate.

---

**Made with ❤️ by [Agent Critiq](https://agentcritiq.com)**
