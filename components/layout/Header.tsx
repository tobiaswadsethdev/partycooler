'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const routeTitles: Record<string, string> = {
  '/protected/dashboard': 'Dashboard',
  '/protected/products': 'Products',
  '/protected/inventory': 'Inventory',
  '/protected/alerts': 'Alerts',
  '/protected/activity': 'Activity',
  '/protected/settings': 'Settings',
}

export function Header() {
  const pathname = usePathname()
  const title = routeTitles[pathname] ?? 'Partycooler'

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  )
}
