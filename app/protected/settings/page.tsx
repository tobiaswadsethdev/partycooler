import { getProfile } from '@/lib/actions/profile'
import { ProfileForm } from '@/components/settings/ProfileForm'

export default async function SettingsPage() {
  const profile = await getProfile()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile information.</p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <ProfileForm defaultName={profile?.name ?? ''} email={profile?.email ?? ''} />
      </div>
    </div>
  )
}
