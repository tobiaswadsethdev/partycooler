import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

/**
 * Tool registrations for the Partycooler MCP server.
 *
 * Every tool runs with the caller's own Supabase access token (issued via the
 * OAuth 2.1 flow), so RLS applies exactly as it does in the web app.
 * Transactions are always attributed to the authenticated caller — tools never
 * accept a user to act on behalf of, so an MCP client cannot record
 * consumption against somebody else's account.
 */

interface ProductRow {
  id: string
  name: string
  category: string | null
}

type Named = { name: string | null }

function matchByName<T extends Named>(rows: T[], query: string): { match?: T; candidates: T[] } {
  const q = query.trim().toLowerCase()
  const exact = rows.filter((r) => r.name?.toLowerCase() === q)
  if (exact.length === 1) return { match: exact[0], candidates: exact }

  const partial = rows.filter((r) => r.name?.toLowerCase().includes(q))
  if (partial.length === 1) return { match: partial[0], candidates: partial }
  return { candidates: exact.length > 0 ? exact : partial }
}

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

function textResult(message: string) {
  return { content: [{ type: 'text' as const, text: message }] }
}

/** Supabase client acting as the calling user (RLS applies to their token). */
function userClient(accessToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

/**
 * The authenticated user's id, taken from the verified bearer token only —
 * never from tool arguments.
 */
function callerUserId(authInfo?: { clientId?: string; extra?: Record<string, unknown> }): string | undefined {
  const fromExtra = authInfo?.extra?.userId
  if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra
  return authInfo?.clientId
}

export function registerPartycoolerTools(server: McpServer) {
  server.registerTool(
    'consume_drink',
    {
      title: 'Consume a drink',
      description:
        'Record that the signed-in user consumed a drink (creates an egress inventory transaction ' +
        'attributed to them). Consumption can only be recorded for the signed-in user — there is no ' +
        'way to record it for someone else. The drink is matched case-insensitively by name; use ' +
        'list_drinks to see what is in stock.',
      inputSchema: {
        drink: z.string().min(1).describe('Name of the drink (product) that was consumed'),
        quantity: z.number().int().min(1).default(1).describe('How many were consumed (default 1)'),
      },
    },
    async ({ drink, quantity }, extra) => {
      const token = extra.authInfo?.token
      if (!token) return errorResult('Not authenticated')

      const userId = callerUserId(extra.authInfo)
      if (!userId) return errorResult('Could not resolve your user identity from the access token.')

      const supabase = userClient(token)

      const { data: consumer, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('id', userId)
        .single()
      if (profileError || !consumer) {
        return errorResult(`Could not load your profile: ${profileError?.message ?? 'not found'}`)
      }

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category')
      if (productsError) return errorResult(`Failed to load products: ${productsError.message}`)

      const drinkMatch = matchByName<ProductRow>(products ?? [], drink)
      if (!drinkMatch.match) {
        const options = (drinkMatch.candidates.length > 0 ? drinkMatch.candidates : products ?? [])
          .map((p) => p.name)
          .join(', ')
        return errorResult(
          drinkMatch.candidates.length > 1
            ? `Ambiguous drink "${drink}". Matches: ${options}`
            : `No drink matching "${drink}". Available: ${options}`
        )
      }

      const { error: insertError } = await supabase.from('inventory_transactions').insert({
        user_id: userId,
        product_id: drinkMatch.match.id,
        transaction_type: 'egress',
        quantity,
      })
      if (insertError) return errorResult(`Failed to record consumption: ${insertError.message}`)

      const { data: status } = await supabase
        .from('inventory_status')
        .select('current_quantity')
        .eq('product_id', drinkMatch.match.id)
        .single()

      const who = consumer.name ?? consumer.email
      const remaining = status ? ` ${status.current_quantity} left in stock.` : ''
      return textResult(`Recorded ${quantity} x ${drinkMatch.match.name} consumed by ${who}.${remaining}`)
    }
  )

  server.registerTool(
    'list_drinks',
    {
      title: 'List drinks',
      description: 'List all drinks (products) with their current stock level.',
      inputSchema: {},
    },
    async (_args, extra) => {
      const token = extra.authInfo?.token
      if (!token) return errorResult('Not authenticated')
      const supabase = userClient(token)

      const { data, error } = await supabase
        .from('inventory_status')
        .select('current_quantity, product:products(name, category)')
        .order('last_updated', { ascending: false })
      if (error) return errorResult(`Failed to load inventory: ${error.message}`)

      if (!data || data.length === 0) return textResult('No drinks in inventory.')

      const lines = data.map((row) => {
        const product = Array.isArray(row.product) ? row.product[0] : row.product
        const category = product?.category ? ` [${product.category}]` : ''
        return `${product?.name ?? 'Unknown'}${category}: ${row.current_quantity}`
      })
      return textResult(lines.join('\n'))
    }
  )
}
