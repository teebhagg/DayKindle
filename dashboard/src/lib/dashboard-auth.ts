import 'server-only'

import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export type DashboardAccess =
  | { kind: 'ready'; user: User }
  | { kind: 'not-configured' }
  | { kind: 'unauthenticated' }
  | { kind: 'not-allowed' }
  | { kind: 'authorization-not-configured' }

export async function getDashboardAccess(): Promise<DashboardAccess> {
  if (!isSupabaseConfigured()) return { kind: 'not-configured' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  const user = data.user

  if (error || !user) return { kind: 'unauthenticated' }
  if (!user.email_confirmed_at) return { kind: 'not-allowed' }

  const { data: admin, error: adminError } = await supabase
    .from('dashboard_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminError) return { kind: 'authorization-not-configured' }
  if (!admin) return { kind: 'not-allowed' }

  return { kind: 'ready', user }
}
