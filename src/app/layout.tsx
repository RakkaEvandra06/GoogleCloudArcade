import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Arcade Track 2026 | Google Cloud Arcade Dashboard',
  description: 'Track your Google Cloud Arcade badges, monitor tier eligibility, hit Facilitator milestones, and compete on the live leaderboard — GCAF 2026.',
  keywords: ['Google Cloud Arcade', 'GCAF 2026', 'Skills Boost', 'badge tracker', 'leaderboard'],
  openGraph: {
    title: 'Arcade Track 2026',
    description: 'Your Google Cloud Arcade progress dashboard for GCAF 2026.',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Middleware sets x-nonce on every request; fall back to '' (empty) so the
  // attribute is rendered but the script is blocked if the nonce is somehow
  // absent — this is the safe failure mode.
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var t = localStorage.getItem('arcade-theme') || 'dark';
    var html = document.documentElement;
    html.setAttribute('data-theme', t);
    html.classList.add(t);
    html.classList.remove(t === 'dark' ? 'light' : 'dark');
  } catch(e) {}
})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
