import { redirect } from 'next/navigation';
import { isAuthenticatedAdmin } from '@/lib/admin-auth';
import AdminDashboardClient from '@/components/AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const auth = await isAuthenticatedAdmin();
  if (!auth.authenticated) {
    redirect('/login');
  }
  return <AdminDashboardClient username={auth.username || 'admin'} />;
}

