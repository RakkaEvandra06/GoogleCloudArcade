export async function register() {
  // Only run on the Node.js server side — not in Edge workers or the browser.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const errors: string[] = [];

  // ── SESSION_SECRET ──────────────────────────────────────────────────────────
  const session = process.env.SESSION_SECRET ?? '';
  const PLACEHOLDERS = ['change-this', 'your-random', 'placeholder', 'secret-here', 'example'];
  if (!session) {
    errors.push(
      '  SESSION_SECRET is not set.\n' +
      '  Generate one:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  } else if (session.length < 32) {
    errors.push(
      `  SESSION_SECRET is too short (${session.length} chars — minimum 32).\n` +
      '  Generate one:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  } else if (PLACEHOLDERS.some(p => session.toLowerCase().includes(p))) {
    errors.push(
      '  SESSION_SECRET looks like a placeholder value.\n' +
      '  Generate one:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }

  // ── ADMIN_SECRET ────────────────────────────────────────────────────────────
  const admin = process.env.ADMIN_SECRET ?? '';
  if (!admin) {
    errors.push('  ADMIN_SECRET is not set.  Add a password (min 16 chars) to .env.local.');
  } else if (admin.length < 16) {
    errors.push(`  ADMIN_SECRET is too short (${admin.length} chars — minimum 16).`);
  } else if (PLACEHOLDERS.some(p => admin.toLowerCase().includes(p))) {
    errors.push('  ADMIN_SECRET looks like a placeholder value.');
  }

  // ── NEXT_PUBLIC_APP_URL ────────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (!appUrl) {
    errors.push(
      '  NEXT_PUBLIC_APP_URL is not set.\n' +
      '  Set it to http://localhost:3000 for local dev, or your production URL.',
    );
  } else if (!/^https?:\/\//.test(appUrl)) {
    errors.push(`  NEXT_PUBLIC_APP_URL looks invalid: "${appUrl}". Must start with http:// or https://.`);
  }

  // ── SUPABASE ────────────────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('  NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('  SUPABASE_SERVICE_ROLE_KEY is not set.');
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  if (errors.length > 0) {
    const divider = '─'.repeat(72);
    console.error(
      '\n' + divider + '\n' +
      '  ⚠  ArcadeTracker — missing or invalid environment variables:\n' +
      divider + '\n' +
      errors.join('\n\n') + '\n\n' +
      '  Copy .env.local.example to .env.local and fill in every value.\n' +
      '  Then RESTART the dev server — Next.js only reads .env.local at startup.\n' +
      divider + '\n',
    );

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ArcadeTracker startup aborted: environment variables are missing or ' +
        'use placeholder values.  See the error details above.',
      );
    }
  } else {
    console.log(
      '✓ ArcadeTracker env check passed ' +
      `(SESSION_SECRET ${session.length} chars, APP_URL: ${appUrl})`,
    );
  }
}
