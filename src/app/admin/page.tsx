import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import AdminPanel from '@/components/AdminPanel';

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/admin-login');
  return <AdminPanel />;
}
