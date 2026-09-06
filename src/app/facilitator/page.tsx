import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import FacilitatorPanel from '@/components/FacilitatorPanel';

export default async function FacilitatorPage() {
  const session = await getSession();
  if (!session || session.role !== 'facilitator') redirect('/facilitator-login');
  return <FacilitatorPanel facName={session.facName ?? 'Facilitator'} />;
}
