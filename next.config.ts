import type { NextConfig } from 'next';

// ─── Static Security Headers ──────────────────────────────────────────────────
//
// IMPORTANT: Content-Security-Policy is intentionally ABSENT here.
// CSP is generated dynamically per-request in src/middleware.ts so that a
// per-request nonce can be embedded, eliminating the need for 'unsafe-inline'
// in the script-src directive.
//
// All headers listed here are static and do not require per-request values.
// They are applied via next.config.ts for all routes and complement the
// dynamic headers set by middleware.

const STATIC_SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',            value: 'DENY' },
  { key: 'X-Content-Type-Options',     value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control',     value: 'on' },
  { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
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
     Covers: HSTS, Clickjacking (X-Frame-Options), MIME-sniffing,
     Referrer leakage, Permissions.

     Content-Security-Policy is NOT set here — see src/middleware.ts.
  ── */
  async headers() {
    return [
      {
        /* Apply static security headers to every route */
        source: '/(.*)',
        headers: [
          ...STATIC_SECURITY_HEADERS,
          /* No sensitive data should be cached by proxies */
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        /* API routes: never cache, CORS lock-down */
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control',                value: 'no-store, max-age=0' },
          {
            key:   'Access-Control-Allow-Origin',
            // Fail-closed: 'null' blocks all cross-origin access if APP_URL is unset
            value: process.env.NEXT_PUBLIC_APP_URL ?? 'null',
          },
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
