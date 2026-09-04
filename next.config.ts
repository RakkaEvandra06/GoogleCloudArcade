import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',            value: 'DENY' },
  { key: 'X-Content-Type-Options',     value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control',     value: 'on' },
  { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://cdn.qwiklabs.com https://storage.googleapis.com https://lh3.googleusercontent.com https://googleusercontent.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

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
     Covers: Security Misconfiguration, Cryptographic Failures,
     Broken Access Control, XSS/Clickjacking/MIME-sniff defences.
  ── */
  async headers() {
    return [
      {
        /* Apply to every route */
        source: '/(.*)',
        headers: [
          ...SECURITY_HEADERS,
          /* Cache-Control for pages — no sensitive data cached by proxies */
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        /* API routes: never cache, extra CORS lock-down */
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control',                value: 'no-store, max-age=0' },
          { key: 'Access-Control-Allow-Origin',  value: process.env.NEXT_PUBLIC_APP_URL ?? 'null' }, // fail-closed: 'null' blocks all cross-origin if APP_URL is unset
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
