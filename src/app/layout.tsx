import type { Metadata } from 'next';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Geist Sans + Geist Mono via Google Fonts (available as open-source fonts) */}
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
