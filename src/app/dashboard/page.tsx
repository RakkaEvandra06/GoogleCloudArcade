// Route: /dashboard  (primary player route)
// Server Component → fetches all data → renders PlayerShell (client).
// Middleware also guards this route: non-players are redirected to /player-login.
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getParticipant, getBadges, getParticipants } from '@/lib/db';
import PlayerShell from '@/components/PlayerShell';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || session.role !== 'player' || !session.participantId) {
    redirect('/player-login');
  }

  const [participant, badges, participants] = await Promise.all([
    getParticipant(session.participantId),
    getBadges(session.participantId),
    getParticipants(),
  ]);

  if (!participant) redirect('/player-login');

  return (
    <PlayerShell
      participant={participant}
      badges={badges}
      participants={participants}
      profileUrl={session.profileUrl ?? ''}
    />
  );
}
