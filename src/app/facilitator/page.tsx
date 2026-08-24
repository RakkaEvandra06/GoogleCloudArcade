import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import FacilitatorDashboard from '@/components/FacilitatorDashboard';

export default async function FacilitatorPage() {
  const session = await getSession();
  if (!session || session.role !== 'facilitator') redirect('/facilitator-login');
  return <FacilitatorDashboard facName={session.facName ?? 'Facilitator'} />;
}
