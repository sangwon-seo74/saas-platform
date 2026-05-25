import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/supabase/auth'

export default async function RootPage() {
  const user = await getServerUser()
  redirect(user ? '/app/dashboard' : '/login')
}
