#!/usr/bin/env node
/**
 * Partycooler MCP server (stdio).
 *
 * Exposes tools for recording drink consumption in the shared inventory.
 * Signs in to Supabase once at startup with a bot/service account
 * (PARTYCOOLER_EMAIL / PARTYCOOLER_PASSWORD). RLS treats user_id as
 * attribution only, so one authenticated session can record consumption
 * for any user.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
const EMAIL = process.env.PARTYCOOLER_EMAIL
const PASSWORD = process.env.PARTYCOOLER_PASSWORD

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY')
  process.exit(1)
}
if (!EMAIL || !PASSWORD) {
  console.error('Missing PARTYCOOLER_EMAIL or PARTYCOOLER_PASSWORD')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: true },
})

interface ProfileRow {
  id: string
  email: string
  name: string | null
}

interface ProductRow {
  id: string
  name: string
  category: string | null
}

type Named = { name: string | null; email?: string }

function matchByName<T extends Named>(rows: T[], query: string): { match?: T; candidates: T[] } {
  const q = query.trim().toLowerCase()
  const exact = rows.filter(
    (r) => r.name?.toLowerCase() === q || r.email?.toLowerCase() === q
  )
  if (exact.length === 1) return { match: exact[0], candidates: exact }

  const partial = rows.filter(
    (r) => r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
  )
  if (partial.length === 1) return { match: partial[0], candidates: partial }
  return { candidates: exact.length > 0 ? exact : partial }
}

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

function textResult(message: string) {
  return { content: [{ type: 'text' as const, text: message }] }
}

const server = new McpServer({ name: 'partycooler', version: '1.0.0' })

server.registerTool(
  'consume_drink',
  {
    title: 'Consume a drink',
    description:
      'Record that a user consumed a drink (creates an egress inventory transaction attributed to that user). ' +
      'User and drink are matched case-insensitively by name or email; use list_drinks to see what is in stock.',
    inputSchema: {
      user: z.string().min(1).describe('Name or email of the user who consumed the drink'),
      drink: z.string().min(1).describe('Name of the drink (product) that was consumed'),
      quantity: z.number().int().min(1).default(1).describe('How many were consumed (default 1)'),
    },
  },
  async ({ user, drink, quantity }) => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, name')
    if (profilesError) return errorResult(`Failed to load users: ${profilesError.message}`)

    const userMatch = matchByName<ProfileRow>(profiles ?? [], user)
    if (!userMatch.match) {
      const options = (userMatch.candidates.length > 0 ? userMatch.candidates : profiles ?? [])
        .map((p) => `${p.name ?? '(no name)'} <${p.email}>`)
        .join(', ')
      return errorResult(
        userMatch.candidates.length > 1
          ? `Ambiguous user "${user}". Matches: ${options}`
          : `No user matching "${user}". Known users: ${options}`
      )
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
      user_id: userMatch.match.id,
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

    const who = userMatch.match.name ?? userMatch.match.email
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
  async () => {
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

async function main() {
  const { error } = await supabase.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! })
  if (error) {
    console.error(`Supabase sign-in failed: ${error.message}`)
    process.exit(1)
  }

  await server.connect(new StdioServerTransport())
  console.error('Partycooler MCP server running on stdio')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
