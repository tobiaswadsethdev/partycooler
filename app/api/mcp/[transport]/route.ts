import { createClient } from '@supabase/supabase-js'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { registerPartycoolerTools } from '@/lib/mcp/tools'

const handler = createMcpHandler(
  (server) => registerPartycoolerTools(server),
  {},
  { basePath: '/api/mcp', maxDuration: 60 }
)

// Bearer tokens are Supabase access tokens issued through the OAuth 2.1 flow
// (Supabase Auth is the authorization server). Verified per request; the
// resulting user identity is passed to the tools via authInfo.
async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { data, error } = await supabase.auth.getUser(bearerToken)
  if (error || !data.user) return undefined

  return {
    token: bearerToken,
    scopes: [],
    clientId: data.user.id,
    extra: { userId: data.user.id, email: data.user.email },
  }
}

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
})

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
