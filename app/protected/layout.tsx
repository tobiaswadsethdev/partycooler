import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .single()

  return (
    <SidebarProvider>
      <AppSidebar name={profile?.name ?? null} email={profile?.email ?? user.email ?? ''} />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto p-4 pb-20 md:pb-4">
          {children}
        </main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
