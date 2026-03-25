import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader className="space-y-3">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Authentication error</CardTitle>
        <CardDescription>
          {message ?? 'Something went wrong during authentication. Please try again.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          If the problem persists, please contact support.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
