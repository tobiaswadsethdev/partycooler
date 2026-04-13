'use client'

import { cn } from '@/lib/utils'
import type { UserProductMatrix as UserProductMatrixData } from '@/lib/actions/user-summary'

interface UserProductMatrixProps {
  data: UserProductMatrixData
}

function NetCell({ value }: { value: number | undefined }) {
  if (value === undefined || value === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        value > 0 ? 'text-[var(--success)]' : 'text-destructive'
      )}
    >
      {value > 0 ? `+${value}` : value}
    </span>
  )
}

export function UserProductMatrix({ data }: UserProductMatrixProps) {
  const { users, products, nets } = data

  if (users.length === 0 || products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No activity data available yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {/* Frozen user column header */}
            <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-medium text-muted-foreground border-r border-b whitespace-nowrap min-w-[140px]">
              User
            </th>
            {products.map((p) => (
              <th
                key={p.id}
                className="px-3 py-3 text-right font-medium text-muted-foreground border-b whitespace-nowrap min-w-[80px]"
                title={p.category ? `${p.name} · ${p.category}` : p.name}
              >
                <div className="flex flex-col items-end gap-0.5">
                  <span>{p.name}</span>
                  {p.category && (
                    <span className="text-xs font-normal text-muted-foreground/70">{p.category}</span>
                  )}
                </div>
              </th>
            ))}
            <th className="px-3 py-3 text-right font-medium text-muted-foreground border-b border-l whitespace-nowrap">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const userNets = nets[user.id] ?? {}
            const rowTotal = Object.values(userNets).reduce((sum, v) => sum + v, 0)
            return (
              <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                {/* Frozen user name cell */}
                <td className="sticky left-0 z-10 bg-background border-r px-4 py-3 font-medium whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span>{user.name ?? user.email}</span>
                    {user.name && (
                      <span className="text-xs font-normal text-muted-foreground truncate max-w-[120px]">
                        {user.email}
                      </span>
                    )}
                  </div>
                </td>
                {products.map((p) => (
                  <td key={p.id} className="px-3 py-3 text-right">
                    <NetCell value={userNets[p.id]} />
                  </td>
                ))}
                <td className="px-3 py-3 text-right border-l">
                  <NetCell value={rowTotal} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
