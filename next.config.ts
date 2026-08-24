import type { NextConfig } from 'next';
import { toNextHeaders } from './src/lib/security';

const nextConfig: NextConfig = {
  /* ── Images ── */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.qwiklabs.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'googleusercontent.com' },
      { protocol: 'https', hostname: 'www.cloudskillsboost.google.com' },
    ],
  },

  /* ── HTTP Security Headers ──────────────────────────────────────────────────
     Covers: Security Misconfiguration (A05), Cryptographic Failures (A02),
     Broken Access Control (A01), XSS/Clickjacking/MIME-sniff defences.
  ── */
  async headers() {
    const securityHeaders = toNextHeaders();
    return [
      {
        /* Apply to every route */
        source: '/(.*)',
        headers: [
          ...securityHeaders,
          /* Cache-Control for pages — no sensitive data cached by proxies */
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        /* API routes: never cache, extra CORS lock-down */
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control',                value: 'no-store, max-age=0' },
          { key: 'Access-Control-Allow-Origin',  value: process.env.NEXT_PUBLIC_APP_URL ?? '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },

  /* ── Power-user tweaks ── */
  poweredByHeader: false, // Don't advertise Next.js version (info disclosure)
};

export default nextConfig;
