import type { Metadata } from 'next'
import LoginPage from '@/components/login-page'
import SetupNotice from '@/components/setup-notice'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Team sign in',
  robots: { index: false, follow: false },
}

export default function SignInPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice title="Team sign-in is not configured" detail="Set the Supabase URL and publishable key, confirm the admin account, and apply the dashboard admins migration." />
  }
  return <LoginPage />
}
