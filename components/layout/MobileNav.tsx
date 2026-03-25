'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Plus, AlertTriangle, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/protected/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/protected/products', label: 'Products', icon: Package },
  { href: '/protected/inventory', label: 'Add', icon: Plus, primary: true },
  { href: '/protected/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/protected/activity', label: 'Activity', icon: Activity },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t bg-background md:hidden">
      {navItems.map(({ href, label, icon: Icon, primary }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {primary ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
            ) : (
              <Icon className="h-5 w-5" />
            )}
            {!primary && <span>{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
