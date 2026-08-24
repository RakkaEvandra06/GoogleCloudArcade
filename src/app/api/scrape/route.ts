import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import {
  validateScrapeUrl,
  checkRateLimit,
  getClientIP,
  logSecurity,
  sanitizeString,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // ── Rate limit: 20 scrapes per IP per minute ───────────────────────────────
  const ip = getClientIP(request);
  if (!checkRateLimit(`scrape:${ip}`, 20, 60)) {
    return NextResponse.json(
      { error: 'Too many scrape requests. Please wait.' },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawUrl = sanitizeString(searchParams.get('url') ?? '', 2000);

  if (!rawUrl) {
    return NextResponse.json({ error: 'URL profil wajib diisi.' }, { status: 400 });
  }

  // ── SSRF protection: validate before any fetch ─────────────────────────────
  const validation = validateScrapeUrl(rawUrl);
  if (!validation.ok) {
    logSecurity('warn', 'invalid_url', { reason: validation.error });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Normalise any variant → canonical https://www.skills.google/public_profiles/…
  let targetUrl = rawUrl
    .replace(
      /^https?:\/\/(www\.)?cloudskillsboost\.google\.com\/public_profiles\//,
      'https://www.skills.google/public_profiles/',
    )
    .replace(
      /^https?:\/\/skills\.google\/public_profiles\//,
      'https://www.skills.google/public_profiles/',
    );

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      cache: 'no-store'
    });

    // Check if it redirected to home page (indicates private or invalid profile)
    if (response.redirected && (response.url === 'https://www.skills.google/' || response.url === 'https://www.skills.google')) {
      return NextResponse.json({ error: 'Profil tidak ditemukan atau disetel ke Privat. Silakan ubah pengaturan profil Anda menjadi Publik.' }, { status: 404 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract name
    let name = $('h1').first().text().trim();
    if (!name) {
      name = $('.ql-display-1').first().text().trim();
    }
    if (!name) {
      name = 'Google Cloud Learner';
    }

    let avatarUrl =
      $('ql-avatar.profile-avatar').attr('src') ||
      $('.profile-avatar').attr('src') ||
      $('.profile-avatar img, .avatar img').first().attr('src') ||
      '';
    if (avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;
    // Guard against relative/generic assets (e.g. the Google "G" logo)
    if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = '';

    const badges: any[] = [];
    
    // Select profile badges
    $('.profile-badge').each((_, el) => {
      const title = $(el).find('.ql-title-medium, .ql-subheading-1').text().trim();
      const dateText = $(el).find('.ql-body-medium, .ql-body-large, .ql-label-medium').text().trim();
      const imageUrl = $(el).find('img').attr('src') || '';

      if (title) {
        // Parse date (e.g. "Earned Jul 8, 2026" or "Earned on Jul 8, 2026")
        let cleanDateStr = dateText.replace(/Earned\s+(on\s+)?/i, '').trim();
        let earnedDate = new Date().toISOString().split('T')[0]; // Default to today if parsing fails
        if (cleanDateStr) {
          const parsedDate = new Date(cleanDateStr);
          if (!isNaN(parsedDate.getTime())) {
            earnedDate = parsedDate.toISOString().split('T')[0];
          }
        }

        // Categorize badge based on confirmed PRD rules:
        // Game badges: Arcade Voyage, Arcade Base Camp, Arcade Adventure, Arcade Trail, Safe Spaces, Arcade Simulator, etc.
        const lowerTitle = title.toLowerCase();
        const isGame = 
          lowerTitle.includes('arcade') || 
          lowerTitle.includes('voyage') || 
          lowerTitle.includes('base camp') || 
          lowerTitle.includes('adventure') || 
          lowerTitle.includes('trail') || 
          lowerTitle.includes('safe spaces') || 
          lowerTitle.includes('simulator') || 
          lowerTitle.includes('trivia');

        badges.push({
          badge_name: title,
          category: isGame ? 'game' : 'skill_badge',
          points: isGame ? 1 : 0.5,
          earned_date: earnedDate,
          image_url: imageUrl
        });
      }
    });

    // Calculate points summary
    const gameBadges = badges.filter(b => b.category === 'game');
    const skillBadges = badges.filter(b => b.category === 'skill_badge');

    const totalGamePoints = gameBadges.length; // 1 point per game
    const totalSkillPoints = skillBadges.length * 0.5; // 0.5 points per skill badge
    const totalBasePoints = totalGamePoints + totalSkillPoints;

    return NextResponse.json({
      name,
      avatar_url: avatarUrl,
      profile_url: targetUrl,
      scraped_at: new Date().toISOString(),
      badges_count: badges.length,
      total_points: totalBasePoints,
      badges
    });

  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dari Google Skills Boost. Silakan coba beberapa saat lagi.' }, { status: 500 });
  }
}
