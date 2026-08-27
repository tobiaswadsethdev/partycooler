'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface ConsentDetails {
  clientName: string
  scopes: string[]
}

function ConsentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authorizationId = searchParams.get('authorization_id')

  const [details, setDetails] = useState<ConsentDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authorizationId) {
      setError('Missing authorization request. Start the connection from your MCP client.')
      return
    }

    const supabase = createClient()
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId!)}`
        router.replace(`/auth/login?next=${encodeURIComponent(next)}`)
        return
      }

      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId!)
      if (cancelled) return
      if (error || !data) {
        setError(error?.message ?? 'Failed to load the authorization request.')
        return
      }
      if (!('authorization_id' in data)) {
        // Already consented — Supabase returns the redirect straight away.
        window.location.href = data.redirect_url
        return
      }
      setDetails({
        clientName: data.client?.name ?? 'Unknown application',
        scopes: (data.scope ?? '').split(' ').filter(Boolean),
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [authorizationId, router])

  async function decide(approve: boolean) {
    if (!authorizationId) return
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })

    if (error || !data) {
      setError(error?.message ?? 'Failed to submit your decision.')
      setSubmitting(false)
      return
    }
    window.location.href = data.redirect_url
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Authorize access</CardTitle>
        <CardDescription>
          {details
            ? `${details.clientName} wants to access your Partycooler account`
            : 'Loading authorization request...'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {details && details.scopes.length > 0 && (
          <div>
            <p className="text-sm font-medium">Requested permissions</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              {details.scopes.map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={!details || submitting}
          onClick={() => decide(false)}
        >
          Deny
        </Button>
        <Button className="flex-1" disabled={!details || submitting} onClick={() => decide(true)}>
          {submitting ? 'Submitting...' : 'Approve'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function ConsentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <ConsentContent />
      </Suspense>
    </div>
  )
}
