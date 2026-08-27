# Partycooler MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets an AI assistant record drink consumption in the shared Partycooler inventory.

## Tools

| Tool | Description |
|------|-------------|
| `consume_drink` | Record that a user consumed a drink. Takes `user` (name or email), `drink` (product name), and optional `quantity` (default 1). Creates an `egress` inventory transaction attributed to that user. |
| `list_drinks` | List all drinks with their current stock level. |

Both user and drink are matched case-insensitively, exact match first, then substring. Ambiguous or unknown names return the available options so the assistant can retry.

## Setup

The server runs over stdio and signs in to Supabase once at startup. Configure it in your MCP client (Claude Code, Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "partycooler": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/path/to/partycooler",
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY": "sb_publishable_...",
        "PARTYCOOLER_EMAIL": "bot@example.com",
        "PARTYCOOLER_PASSWORD": "..."
      }
    }
  }
}
```

Or run it directly for a smoke test:

```bash
npm run mcp
```

## Authentication model

The database RLS policies treat `user_id` on `inventory_transactions` as **attribution only** — any authenticated user may record a transaction for any user (see `scripts/schema.sql`). The MCP server therefore needs just **one** authenticated Supabase session, and the `user` tool argument decides who the consumption is attributed to.

Recommended: create a dedicated **bot account** through the normal sign-up flow and use its credentials in `PARTYCOOLER_EMAIL` / `PARTYCOOLER_PASSWORD`. Transactions are still attributed to the person named in the tool call, not to the bot.

Why email + password here, and when not to use it:

- This is a **local stdio server**: credentials live in your own MCP client config on your own machine, equivalent to a `.env.local`. Using a dedicated bot account keeps your personal password out of config files and makes revocation trivial (delete the bot user).
- For a **remote/hosted MCP server** (Streamable HTTP), do *not* pass email + password. The MCP spec prescribes OAuth 2.1 for HTTP transports — the client obtains a token via browser sign-in and the server validates it per request. That would be the right upgrade path if this server is ever exposed over the network.
