import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler'

// RFC 9728 protected resource metadata: tells MCP clients that Supabase Auth
// is the OAuth 2.1 authorization server for this MCP endpoint.
const handler = protectedResourceHandler({
  authServerUrls: [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
})

const corsHandler = metadataCorsOptionsRequestHandler()

export { handler as GET, corsHandler as OPTIONS }
