export type Lang = 'EN' | 'ID' | 'JP';
export const LANGS: Lang[] = ['EN', 'ID', 'JP'];

export const LANG_META: Record<Lang, { flag: string; name: string; locale: string }> = {
  EN: { flag: '🇺🇸', name: 'English',   locale: 'en' },
  ID: { flag: '🇮🇩', name: 'Indonesia', locale: 'id' },
  JP: { flag: '🇯🇵', name: '日本語',    locale: 'ja' },
};

type Dict = Record<string, Record<Lang, string>>;

const dict: Dict = {
  /* ── Navigation ──────────────────────────────────────────── */
  'nav.dashboard':        { EN: 'Dashboard',        ID: 'Dasbor',         JP: 'ダッシュボード'  },
  'nav.leaderboard':      { EN: 'Leaderboard',      ID: 'Papan Peringkat',JP: 'ランキング'      },
  'nav.live':             { EN: 'Live',              ID: 'Langsung',       JP: 'ライブ'          },
  'nav.select_lang':      { EN: 'Language',          ID: 'Bahasa',         JP: '言語'            },

  /* ── Header ──────────────────────────────────────────────── */
  'header.brand':         { EN: 'Arcade Track',      ID: 'Arcade Track',   JP: 'Arcade Track'    },
  'header.year':          { EN: '2026',              ID: '2026',           JP: '2026'            },
  'header.theme_dark':    { EN: 'Dark mode',         ID: 'Mode gelap',     JP: 'ダークモード'    },
  'header.theme_light':   { EN: 'Light mode',        ID: 'Mode terang',    JP: 'ライトモード'    },

  /* ── Profile header ──────────────────────────────────────── */
  'profile.role_label':   { EN: 'Google Cloud Arcade Participant', ID: 'Peserta Google Cloud Arcade', JP: 'Google Cloud Arcade 参加者' },
  'profile.profile_link': { EN: 'Skills Boost Profile',           ID: 'Profil Skills Boost',         JP: 'スキルブーストプロフィール' },
  'profile.pts':          { EN: 'pts',               ID: 'poin',           JP: 'ポイント'        },
  'profile.games':        { EN: 'games',             ID: 'game',           JP: 'ゲーム'          },
  'profile.skills':       { EN: 'skills',            ID: 'skill',          JP: 'スキル'          },
  'profile.sync':         { EN: 'Sync',              ID: 'Sinkron',        JP: '同期'            },
  'profile.syncing':      { EN: 'Syncing…',          ID: 'Menyinkron…',    JP: '同期中…'         },
  'profile.sign_out':     { EN: 'Sign Out',          ID: 'Keluar',         JP: 'ログアウト'      },

  /* ── Dashboard section titles ────────────────────────────── */
  'dash.progress_title':  { EN: 'Monthly Progress',  ID: 'Progres Bulanan',JP: '月間進捗'        },
  'dash.tiers_title':     { EN: 'Tier Progress',     ID: 'Progres Tier',   JP: 'ティア進捗'      },
  'dash.milestones':      { EN: 'Milestones',        ID: 'Pencapaian',     JP: 'マイルストーン'  },
  'dash.tracks_title':    { EN: 'Game Tracks',       ID: 'Track Game',     JP: 'ゲームトラック'  },
  'dash.skills_title':    { EN: 'Skill Badges',      ID: 'Badge Skill',    JP: 'スキルバッジ'    },
  'dash.badges_earned':   { EN: 'badges earned',     ID: 'badge diraih',   JP: 'バッジ獲得'      },
  'dash.completed':       { EN: 'Completed',         ID: 'Selesai',        JP: '完了'            },
  'dash.in_progress':     { EN: 'In Progress',       ID: 'Sedang Berjalan',JP: '進行中'          },
  'dash.not_started':     { EN: 'Not Started',       ID: 'Belum Mulai',    JP: '未開始'          },
  'dash.view_track':      { EN: 'View Track',        ID: 'Lihat Track',    JP: 'トラックを見る'  },
  'dash.copy_code':       { EN: 'Copy Code',         ID: 'Salin Kode',     JP: 'コードをコピー'  },
  'dash.copied':          { EN: 'Copied!',           ID: 'Tersalin!',      JP: 'コピーした!'     },
  'dash.level':           { EN: 'Level',             ID: 'Level',          JP: 'レベル'          },
  'dash.access_code':     { EN: 'Access Code',       ID: 'Kode Akses',     JP: 'アクセスコード'  },
  'dash.no_badges':       { EN: 'No badges yet — start completing labs!', ID: 'Belum ada badge — mulai kerjakan lab!', JP: 'まだバッジなし — ラボを始めよう！' },

  /* ── Tiers ───────────────────────────────────────────────── */
  'tier.legend':          { EN: 'Arcade Legend',     ID: 'Legenda Arcade',  JP: 'アーケード伝説'  },
  'tier.champion':        { EN: 'Arcade Champion',   ID: 'Juara Arcade',    JP: 'アーケード王者'  },
  'tier.ranger':          { EN: 'Arcade Ranger',     ID: 'Ranger Arcade',   JP: 'アーケードレンジャー' },
  'tier.trooper':         { EN: 'Arcade Trooper',    ID: 'Prajurit Arcade', JP: 'アーケード兵士'  },
  'tier.unranked':        { EN: 'Unranked',          ID: 'Belum Peringkat', JP: 'ランク外'        },
  'tier.next_tier_at':    { EN: 'Next tier at',      ID: 'Tier berikut di', JP: '次のティア',      },
  'tier.pts_needed':      { EN: 'pts needed',        ID: 'poin lagi',       JP: 'ポイント必要'    },
  'tier.pts_to_go':       { EN: 'pts to go',         ID: 'poin lagi',       JP: 'ポイントまで'    },
  'tier.already_max':     { EN: 'Max tier reached!', ID: 'Tier maksimal!',  JP: '最高ティア達成！' },

  /* ── Milestones ──────────────────────────────────────────── */
  'ms.games_needed':      { EN: 'Game Badges',       ID: 'Badge Game',      JP: 'ゲームバッジ'    },
  'ms.skills_needed':     { EN: 'Skill Badges',      ID: 'Badge Skill',     JP: 'スキルバッジ'    },
  'ms.bonus_pts':         { EN: 'Bonus pts',         ID: 'Bonus poin',      JP: 'ボーナスpt'      },
  'ms.achieved':          { EN: 'Achieved',          ID: 'Dicapai',         JP: '達成'            },
  'ms.locked':            { EN: 'Locked',            ID: 'Terkunci',        JP: 'ロック中'        },

  /* ── Activity Chart ──────────────────────────────────────── */
  'chart.title':          { EN: 'Badges per Week',   ID: 'Badge per Minggu',JP: '週別バッジ数'    },
  'chart.active_weeks':   { EN: 'active weeks',      ID: 'minggu aktif',    JP: 'アクティブ週'    },
  'chart.badge_count':    { EN: 'BADGES COMPLETED',  ID: 'BADGE SELESAI',   JP: 'バッジ完了'      },
  'chart.game_badges':    { EN: 'Game Badges',       ID: 'Badge Game',      JP: 'ゲームバッジ'    },
  'chart.skill_badges':   { EN: 'Skill Badges',      ID: 'Badge Skill',     JP: 'スキルバッジ'    },
  'chart.no_activity':    { EN: 'No activity yet',   ID: 'Belum ada aktivitas', JP: '活動なし'    },
  'chart.hover_hint':     { EN: 'Hover or tap a bar for details', ID: 'Arahkan atau tap bar untuk detail', JP: 'バーをホバーまたはタップで詳細' },
  'chart.total_label':    { EN: 'Total Badges (Game + Skill)', ID: 'Total Badge (Game + Skill)', JP: '合計バッジ (ゲーム+スキル)' },
  'week.1':               { EN: 'Week 1',            ID: 'Minggu 1',        JP: '第1週'           },
  'week.2':               { EN: 'Week 2',            ID: 'Minggu 2',        JP: '第2週'           },
  'week.3':               { EN: 'Week 3',            ID: 'Minggu 3',        JP: '第3週'           },
  'week.4':               { EN: 'Week 4',            ID: 'Minggu 4',        JP: '第4週'           },
  'week.5':               { EN: 'Week 5',            ID: 'Minggu 5',        JP: '第5週'           },

  /* ── Month names ─────────────────────────────────────────── */
  'month.1':    { EN: 'January',   ID: 'Januari',   JP: '1月'  },
  'month.2':    { EN: 'February',  ID: 'Februari',  JP: '2月'  },
  'month.3':    { EN: 'March',     ID: 'Maret',     JP: '3月'  },
  'month.4':    { EN: 'April',     ID: 'April',     JP: '4月'  },
  'month.5':    { EN: 'May',       ID: 'Mei',       JP: '5月'  },
  'month.6':    { EN: 'June',      ID: 'Juni',      JP: '6月'  },
  'month.7':    { EN: 'July',      ID: 'Juli',      JP: '7月'  },
  'month.8':    { EN: 'August',    ID: 'Agustus',   JP: '8月'  },
  'month.9':    { EN: 'September', ID: 'September', JP: '9月'  },
  'month.10':   { EN: 'October',   ID: 'Oktober',   JP: '10月' },
  'month.11':   { EN: 'November',  ID: 'November',  JP: '11月' },
  'month.12':   { EN: 'December',  ID: 'Desember',  JP: '12月' },
  'month.short.1':  { EN: 'Jan', ID: 'Jan', JP: '1月'  },
  'month.short.2':  { EN: 'Feb', ID: 'Feb', JP: '2月'  },
  'month.short.3':  { EN: 'Mar', ID: 'Mar', JP: '3月'  },
  'month.short.4':  { EN: 'Apr', ID: 'Apr', JP: '4月'  },
  'month.short.5':  { EN: 'May', ID: 'Mei', JP: '5月'  },
  'month.short.6':  { EN: 'Jun', ID: 'Jun', JP: '6月'  },
  'month.short.7':  { EN: 'Jul', ID: 'Jul', JP: '7月'  },
  'month.short.8':  { EN: 'Aug', ID: 'Agu', JP: '8月'  },
  'month.short.9':  { EN: 'Sep', ID: 'Sep', JP: '9月'  },
  'month.short.10': { EN: 'Oct', ID: 'Okt', JP: '10月' },
  'month.short.11': { EN: 'Nov', ID: 'Nov', JP: '11月' },
  'month.short.12': { EN: 'Dec', ID: 'Des', JP: '12月' },

  /* ── Activity Heatmap ────────────────────────────────────── */
  'heatmap.title':        { EN: 'Activity',          ID: 'Aktivitas',       JP: 'アクティビティ'  },
  'heatmap.badge_unit':   { EN: 'badge',             ID: 'badge',           JP: 'バッジ'          },
  'heatmap.active_days':  { EN: 'active days',       ID: 'hari aktif',      JP: '活動日'          },
  'heatmap.less':         { EN: 'Less',              ID: 'Sedikit',         JP: '少ない'          },
  'heatmap.more':         { EN: 'More',              ID: 'Banyak',          JP: '多い'            },
  'heatmap.day.sun':      { EN: 'Sun',               ID: 'Min',             JP: '日'              },
  'heatmap.day.mon':      { EN: 'Mon',               ID: 'Sen',             JP: '月'              },
  'heatmap.day.wed':      { EN: 'Wed',               ID: 'Rab',             JP: '水'              },
  'heatmap.day.fri':      { EN: 'Fri',               ID: 'Jum',             JP: '金'              },

  /* ── Leaderboard ─────────────────────────────────────────── */
  'lb.title':             { EN: 'Leaderboard',       ID: 'Papan Peringkat', JP: 'ランキング'      },
  'lb.rank':              { EN: 'Rank',              ID: 'Peringkat',       JP: '順位'            },
  'lb.participant':       { EN: 'Participant',       ID: 'Peserta',         JP: '参加者'          },
  'lb.points':            { EN: 'Points',            ID: 'Poin',            JP: 'ポイント'        },
  'lb.tier':              { EN: 'Tier',              ID: 'Tier',            JP: 'ティア'          },
  'lb.badges':            { EN: 'Badges',            ID: 'Badge',           JP: 'バッジ'          },
  'lb.you':               { EN: 'You',               ID: 'Kamu',            JP: 'あなた'          },
  'lb.empty':             { EN: 'No participants yet.', ID: 'Belum ada peserta.', JP: 'まだ参加者なし。' },
  'lb.search':            { EN: 'Search…',           ID: 'Cari…',           JP: '検索…'           },

  /* ── Login pages ─────────────────────────────────────────── */
  'login.player.title':   { EN: 'Arcade Track 2026', ID: 'Arcade Track 2026', JP: 'アーケードトラック 2026' },
  'login.player.subtitle':{ EN: 'Sign in with your Google Skills Boost profile', ID: 'Masuk dengan profil Google Skills Boost kamu', JP: 'Google スキルブーストプロフィールでサインイン' },
  'login.player.label':   { EN: 'Player Sign In',    ID: 'Login Pemain',    JP: 'プレイヤーサインイン' },
  'login.player.hint':    { EN: 'Paste your public Google Skills profile URL below', ID: 'Tempel URL profil publik Google Skills kamu di sini', JP: 'Google Skillsの公開プロフィールURLを貼り付けてください' },
  'login.player.placeholder': { EN: 'https://www.skills.google/public_profiles/…', ID: 'https://www.skills.google/public_profiles/…', JP: 'https://www.skills.google/public_profiles/…' },
  'login.player.public_note': { EN: 'Your profile must be set to Public in Google Skills settings', ID: 'Profil kamu harus diatur ke Publik di pengaturan Google Skills', JP: 'Google Skillsの設定でプロフィールを公開に設定してください' },
  'login.player.submit':  { EN: 'Load My Dashboard', ID: 'Muat Dasbor Saya', JP: 'ダッシュボードを開く' },
  'login.player.loading': { EN: 'Loading…',          ID: 'Memuat…',         JP: '読み込み中…'     },
  'login.player.progress':{ EN: 'Progress',          ID: 'Progres',         JP: '進捗'            },
  'login.facilitator_link':{ EN: 'Facilitator Login →', ID: 'Login Fasilitator →', JP: 'ファシリテーターログイン →' },
  'login.admin_link':     { EN: 'Admin Login →',     ID: 'Login Admin →',   JP: '管理者ログイン →' },
  'login.player_link':    { EN: '← Player Login',    ID: '← Login Pemain',  JP: '← プレイヤーログイン' },

  'login.fac.title':      { EN: 'Facilitator Panel', ID: 'Panel Fasilitator', JP: 'ファシリテーターパネル' },
  'login.fac.subtitle':   { EN: 'Arcade Track 2026 — Facilitator Access', ID: 'Arcade Track 2026 — Akses Fasilitator', JP: 'アーケードトラック 2026 — ファシリテーターアクセス' },
  'login.fac.label':      { EN: 'Facilitator Sign In', ID: 'Login Fasilitator', JP: 'ファシリテーターサインイン' },
  'login.fac.hint':       { EN: 'Enter the access code provided by your Admin', ID: 'Masukkan kode akses dari Admin kamu', JP: '管理者から提供されたアクセスコードを入力してください' },
  'login.fac.placeholder':{ EN: 'FAC-XXXX-0000',     ID: 'FAC-XXXX-0000',   JP: 'FAC-XXXX-0000'   },
  'login.fac.submit':     { EN: 'Enter Facilitator Panel', ID: 'Masuk ke Panel Fasilitator', JP: 'ファシリテーターパネルへ' },
  'login.fac.features':   { EN: 'Facilitator Panel includes:', ID: 'Fitur Panel Fasilitator:', JP: 'ファシリテーターパネルの機能:' },

  'login.admin.title':    { EN: 'Admin Panel',       ID: 'Panel Admin',     JP: '管理パネル'      },
  'login.admin.subtitle': { EN: 'Mentor Utama — Restricted Access', ID: 'Mentor Utama — Akses Terbatas', JP: 'メンターウタマ — アクセス制限' },
  'login.admin.label':    { EN: 'Restricted',        ID: '⚠️ Terbatas',     JP: '⚠️ 制限あり'     },
  'login.admin.hint':     { EN: 'Only 1 authorized account can access this panel.', ID: 'Hanya 1 akun yang berwenang mengakses panel ini.', JP: 'このパネルへのアクセスは1アカウントのみです。' },
  'login.admin.placeholder': { EN: 'Admin secret',  ID: 'Rahasia admin',   JP: '管理者シークレット' },
  'login.admin.submit':   { EN: 'Enter Admin Panel', ID: 'Masuk ke Panel Admin', JP: '管理パネルへ' },
  'login.verifying':      { EN: 'Verifying…',        ID: 'Memverifikasi…',  JP: '確認中…'         },

  /* ── Common / Shared ─────────────────────────────────────── */
  'common.loading':       { EN: 'Loading…',          ID: 'Memuat…',         JP: '読み込み中…'     },
  'common.error':         { EN: 'Something went wrong.', ID: 'Terjadi kesalahan.', JP: 'エラーが発生しました。' },
  'common.retry':         { EN: 'Retry',             ID: 'Coba Lagi',       JP: '再試行'          },
  'common.never':         { EN: 'Never',             ID: 'Tidak Pernah',    JP: '未同期'          },
  'common.today':         { EN: 'Today',             ID: 'Hari ini',        JP: '今日'            },
  'common.points_short':  { EN: 'pts',               ID: 'poin',            JP: 'pt'              },
};

/** Translate a key to the given language, falling back to EN, then the key itself. */
export function t(key: string, lang: Lang): string {
  return dict[key]?.[lang] ?? dict[key]?.['EN'] ?? key;
}

/** Get all short month labels for a given language (index 0 = January). */
export function getMonthShort(lang: Lang): string[] {
  return Array.from({ length: 12 }, (_, i) => t(`month.short.${i + 1}`, lang));
}

/** Get all full month names for a given language (index 0 = January). */
export function getMonthFull(lang: Lang): string[] {
  return Array.from({ length: 12 }, (_, i) => t(`month.${i + 1}`, lang));
}

// ─── ADDITIONAL KEYS (added in full-translation pass) ─────────────────────────

const extraDict: Dict = {
  /* ── Sign out dialog ────────────────────────────────────────── */
  'signout.title':          { EN: 'Sign Out?',               ID: 'Keluar?',                     JP: 'ログアウトしますか？'         },
  'signout.desc':           { EN: 'Your session will end. You can sign back in any time.',      ID: 'Sesi kamu akan berakhir. Kamu bisa masuk kembali kapan saja.', JP: 'セッションが終了します。いつでも再サインインできます。'          },
  'signout.cancel':         { EN: 'Cancel',                  ID: 'Batal',                       JP: 'キャンセル'                   },
  'signout.confirm':        { EN: 'Yes, Sign Out',           ID: 'Ya, Keluar',                  JP: 'はい、ログアウト'             },

  /* ── LocalAuth / saved-session hints ─────────────────────────── */
  'auth.saved_player':      { EN: 'Saved profile detected',  ID: 'Profil tersimpan terdeteksi', JP: '保存済みプロフィールを検出'   },
  'auth.use_saved':         { EN: 'Continue',                ID: 'Lanjutkan',                   JP: '続ける'                     },
  'auth.use_diff':          { EN: 'Use a different profile', ID: 'Gunakan profil lain',         JP: '別のプロフィールを使用'       },
  'auth.saved_fac':         { EN: 'Last code pre-filled',    ID: 'Kode terakhir sudah diisi',   JP: '前回のコードが入力済みです'   },
  'auth.saved_admin':       { EN: 'Recently logged in',      ID: 'Baru saja masuk',             JP: '最近ログインしました'         },
  'auth.expiry_note':       { EN: 'Saved for 7 days',        ID: 'Tersimpan selama 7 hari',     JP: '7日間保存'                   },
  'auth.signing_in':        { EN: 'Signing in…',             ID: 'Masuk…',                      JP: 'サインイン中…'               },

  /* ── ProfileHeader extra ─────────────────────────────────────── */
  'profile.last_synced':    { EN: 'Last synced:',            ID: 'Terakhir sinkron:',           JP: '最終同期:'                   },

  /* ── Dashboard sub-tabs ────────────────────────────────────────  */
  'dash.tab.overview':      { EN: 'Overview',                ID: 'Ikhtisar',                    JP: '概要'                        },
  'dash.tab.fasttrack':     { EN: 'FastTrack',               ID: 'FastTrack',                   JP: 'ファストトラック'             },
  'dash.tab.mybadges':      { EN: 'My Badges',               ID: 'Badge Saya',                  JP: 'マイバッジ'                  },

  /* ── Dashboard points card ─────────────────────────────────────  */
  'dash.points_title':      { EN: 'Arcade Points',               ID: 'Poin Arcade',                  JP: 'アーケードポイント'            },
  'dash.pts_total':         { EN: 'pts total',                   ID: 'total poin',                   JP: 'pt 合計'                      },
  'dash.pts_only':          { EN: 'Arcade Points (badges only)', ID: 'Poin Arcade (badge saja)',     JP: 'アーケードポイント (バッジのみ)'},
  'dash.label.game':        { EN: '▷ Game Badges',              ID: '▷ Badge Game',                 JP: '▷ ゲームバッジ'               },
  'dash.label.skill':       { EN: '🜲 Skill Badges',             ID: '🜲 Badge Skill',                JP: '🜲 スキルバッジ'               },
  'dash.label.fac_bonus':   { EN: 'Facilitator Bonus',          ID: 'Bonus Fasilitator',             JP: 'ファシリテーターボーナス'       },
  'dash.label.each_one':    { EN: '×1 each',                    ID: '×1 per badge',                  JP: '×1 ずつ'                      },
  'dash.label.half_each':   { EN: '×0.5 each',                  ID: '×0.5 per badge',                JP: '×0.5 ずつ'                    },
  'dash.label.ms_bonus':    { EN: 'milestone bonus',            ID: 'bonus milestone',               JP: 'マイルストーンボーナス'         },

  /* ── Dashboard section headers ─────────────────────────────────  */
  'dash.section.milestones':{ EN: 'Facilitator Milestones — GCAF 2026', ID: 'Milestone Fasilitator — GCAF 2026', JP: 'ファシリテーターマイルストーン — GCAF 2026'                        },
  'dash.section.tracks':    { EN: 'Active Game Tracks — August 2026',   ID: 'Track Game Aktif — Agustus 2026',   JP: 'アクティブゲームトラック — 2026年8月'                             },
  'dash.section.recent':    { EN: 'Recent Achievements',                ID: 'Pencapaian Terkini',                JP: '最近の成果'                   },

  /* ── Milestone card text ────────────────────────────────────────  */
  'dash.ms.unlocked':       { EN: 'Milestone bonus unlocked!', ID: 'Bonus milestone terbuka!',  JP: 'マイルストーンボーナス解除！'   },
  'dash.ms.on_completion':  { EN: 'bonus pts on completion',   ID: 'poin bonus saat selesai',   JP: 'ボーナスpt (完了時)'           },
  'dash.ms.label.game':     { EN: '▷ Game Badges',            ID: '▷ Badge Game',              JP: '▷ ゲームバッジ'               },
  'dash.ms.label.skill':    { EN: '🜲 Skill Badges',           ID: '🜲 Badge Skill',             JP: '🜲 スキルバッジ'               },

  /* ── Game tracks card ───────────────────────────────────────────  */
  'dash.track.view_code':   { EN: 'View the code',           ID: 'Lihat kode',                  JP: 'コードを見る'                },
  'dash.track.access_code': { EN: 'Access Code',             ID: 'Kode Akses',                  JP: 'アクセスコード'              },
  'dash.track.open':        { EN: 'Open →',                  ID: 'Buka →',                      JP: '開く →'                     },
  'dash.track.completed_pt':{ EN: 'Each completed game = +1.0 Arcade Point', ID: 'Setiap game selesai = +1.0 Poin Arcade', JP: 'ゲーム完了ごとに +1.0 アーケードポイント'                          },

  /* ── Catalog tab ────────────────────────────────────────────────  */
  'catalog.banner.title':   { EN: 'FastTrack Skill Badges',  ID: 'Skill Badge FastTrack',       JP: 'ファストトラックスキルバッジ' },
  'catalog.banner.desc':    { EN: "Complete skill badges alongside the game tracks", ID: 'Selesaikan skill badge bersamaan dengan track game', JP: 'ゲームトラックと並行してスキルバッジを取得'                        },
  'catalog.search':         { EN: 'Search skill badges…',    ID: 'Cari skill badge…',           JP: 'スキルバッジを検索…'          },
  'catalog.all_levels':     { EN: 'All levels',              ID: 'Semua level',                 JP: 'すべてのレベル'               },
  'catalog.intro':          { EN: 'Introductory',            ID: 'Dasar',                       JP: '入門'                        },
  'catalog.inter':          { EN: 'Intermediate',            ID: 'Menengah',                    JP: '中級'                        },
  'catalog.adv':            { EN: 'Advanced',                ID: 'Mahir',                       JP: '上級'                        },
  'catalog.status.all':     { EN: 'ALL',                     ID: 'SEMUA',                       JP: '全て'                        },
  'catalog.status.done':    { EN: 'DONE',                    ID: 'SELESAI',                     JP: '完了'                        },
  'catalog.status.pending': { EN: 'PENDING',                 ID: 'TERTUNDA',                    JP: '保留'                        },
  'catalog.done_pill':      { EN: '✓ Done',                  ID: '✓ Selesai',                   JP: '✓ 完了'                     },
  'catalog.pending_pill':   { EN: '⟳ Pending',               ID: '⟳ Tertunda',                  JP: '⟳ 保留中'                  },
  'catalog.pts_each':       { EN: '+0.5 pts',                ID: '+0.5 poin',                   JP: '+0.5 pt'                     },
  'catalog.free':           { EN: '✦ Free',                  ID: '✦ Gratis',                    JP: '✦ 無料'                     },
  'catalog.revisit':        { EN: 'Revisit ↗',               ID: 'Kunjungi ↗',                  JP: '復習 ↗'                     },
  'catalog.start':          { EN: 'Start ↗',                 ID: 'Mulai ↗',                     JP: '開始 ↗'                     },
  'catalog.empty.no_done':  { EN: 'No badges completed yet', ID: 'Belum ada badge yang selesai', JP: 'まだ完了したバッジなし'       },
  'catalog.empty.all_done': { EN: 'All badges completed!',   ID: 'Semua badge sudah selesai!',  JP: '全バッジ完了！'               },
  'catalog.empty.not_found':{ EN: 'No badges found',         ID: 'Badge tidak ditemukan',       JP: 'バッジが見つかりません'        },
  'catalog.empty.hint':     { EN: 'Try changing the filter or search keyword', ID: 'Coba ubah filter atau kata kunci', JP: 'フィルターや検索キーワードを変更してください'                      },
  'catalog.prev':           { EN: '← Prev',                  ID: '← Sebelumnya',                JP: '← 前へ'                     },
  'catalog.next':           { EN: 'Next →',                  ID: 'Selanjutnya →',               JP: '次へ →'                     },
  'catalog.page_of':        { EN: 'Page',                    ID: 'Halaman',                     JP: 'ページ'                     },
  'catalog.of':             { EN: 'of',                      ID: 'dari',                        JP: '/'                          },

  /* ── Badges tab ──────────────────────────────────────────────── */
  'badges.title':           { EN: 'Badge Collection',        ID: 'Koleksi Badge',               JP: 'バッジコレクション'           },
  'badges.tab.current':     { EN: 'August 2026',             ID: 'Agustus 2026',                JP: '2026年8月'                   },
  'badges.tab.all':         { EN: 'All',                     ID: 'Semua',                       JP: '全て'                        },
  'badges.tab.archive':     { EN: 'Archive',                 ID: 'Arsip',                       JP: 'アーカイブ'                  },
  'badges.earned':          { EN: 'Earned:',                 ID: 'Diraih:',                     JP: '獲得日:'                     },
  'badges.cat.game':        { EN: 'Game',                    ID: 'Game',                        JP: 'ゲーム'                      },
  'badges.cat.skill':       { EN: 'Skill',                   ID: 'Skill',                       JP: 'スキル'                      },
  'badges.cat.archive':     { EN: 'Archive',                 ID: 'Arsip',                       JP: 'アーカイブ'                  },
  'badges.empty':           { EN: 'No badges in this category yet.', ID: 'Belum ada badge di kategori ini.', JP: 'このカテゴリにはまだバッジがありません。'                          },

  /* ── Facilitator panel ──────────────────────────────────────────  */
  'fac.panel_title':        { EN: 'Facilitator Panel',       ID: 'Panel Fasilitator',             JP: 'ファシリテーターパネル'       },
  'fac.locked':             { EN: '🔒︎ LOCKED',               ID: '🔒︎ TERKUNCI',                   JP: '🔒︎ ロック中'              },
  'fac.tab.overview':       { EN: '🗠 Overview',             ID: '🗠 Ikhtisar',                  JP: '🗠 概要'                  },
  'fac.tab.members':        { EN: '🗣 Members',              ID: '🗣 Anggota',                   JP: '🗣 メンバー'              },
  'fac.tab.import':         { EN: '✚ Import',               ID: '✚ Impor',                     JP: '✚ インポート'            },
  'fac.tab.history':        { EN: '🗐 History',              ID: '🗐 Riwayat',                    JP: '🗐 履歴'                  },
  'fac.tab.email':          { EN: '✉ Email',                ID: '✉ Email',                      JP: '✉ メール'                },

  'fac.stat.total':         { EN: 'Total Members',           ID: 'Total Anggota',               JP: '総メンバー数'                },
  'fac.stat.avg':           { EN: 'Avg Points',              ID: 'Rata-rata Poin',              JP: '平均ポイント'                },
  'fac.stat.today':         { EN: 'Synced Today',            ID: 'Sinkron Hari Ini',            JP: '今日の同期'                  },
  'fac.stat.50pts':         { EN: '50+ pts',                 ID: '50+ poin',                    JP: '50+ pt'                     },
  'fac.tier_dist':          { EN: 'Tier Distribution',       ID: 'Distribusi Tier',             JP: 'ティア分布'                  },
  'fac.ms_progress':        { EN: 'Milestone Progress',      ID: 'Progres Milestone',           JP: 'マイルストーン進捗'           },
  'fac.ms.m1':              { EN: 'M1 Ready',                ID: 'M1 Siap',                     JP: 'M1 達成'                    },
  'fac.ms.m2':              { EN: 'M2 Ready',                ID: 'M2 Siap',                     JP: 'M2 達成'                    },
  'fac.ms.ultimate':        { EN: 'Ultimate',                ID: 'Ultimate',                    JP: 'アルティメット'              },

  'fac.members.search':     { EN: 'Search…',                 ID: 'Cari…',                       JP: '検索…'                        },
  'fac.members.sync_all':   { EN: 'Sync All',                ID: 'Sinkron Semua',               JP: '全同期'                       },
  'fac.members.syncing':    { EN: 'Syncing…',                ID: 'Menyinkron…',                 JP: '同期中…'                      },
  'fac.members.col.name':   { EN: 'Name / URL',              ID: 'Nama / URL',                  JP: '名前 / URL'                   },
  'fac.members.col.pts':    { EN: 'Pts',                     ID: 'Poin',                        JP: 'Pt'                           },
  'fac.members.col.tier':   { EN: 'Tier',                    ID: 'Tier',                        JP: 'ティア'                       },
  'fac.members.col.synced': { EN: 'Synced',                  ID: 'Sinkron',                     JP: '同期'                         },
  'fac.members.col.action': { EN: 'Actions',                 ID: 'Aksi',                        JP: 'アクション'                   },
  'fac.members.never':      { EN: 'Never',                   ID: 'Belum pernah',                JP: '未同期'                       },
  'fac.members.empty':      { EN: 'No members found.',       ID: 'Anggota tidak ditemukan.',    JP: 'メンバーが見つかりません。'     },

  'fac.import.title':       { EN: '✚ Import via CSV',       ID: '✚ Impor via CSV',             JP: '✚ CSV でインポート'        },
  'fac.import.format_lbl':  { EN: 'CSV Format:',             ID: 'Format CSV:',                 JP: 'CSVフォーマット:'             },
  'fac.import.choose':      { EN: '🗁 Choose CSV File',      ID: '🗁 Pilih File CSV',            JP: '🗁 CSVファイルを選択'       },
  'fac.import.preview':     { EN: 'Preview',                 ID: 'Pratinjau',                   JP: 'プレビュー'                   },
  'fac.import.new':         { EN: 'new',                     ID: 'baru',                        JP: '新規'                        },
  'fac.import.dup_label':   { EN: 'dup',                     ID: 'duplikat',                    JP: '重複'                        },
  'fac.import.invalid':     { EN: 'invalid',                 ID: 'tidak valid',                 JP: '無効'                        },
  'fac.import.importing':   { EN: '⟳ Importing…',            ID: '⟳ Mengimpor…',                JP: '⟳ インポート中…'            },
  'fac.import.no_valid':    { EN: 'No valid new URLs.',       ID: 'Tidak ada URL baru yang valid.',JP: '有効な新しいURLがありません。'},

  'fac.history.title':      { EN: '🗐 Upload History',       ID: '🗐 Riwayat Unggah',            JP: '🗐 アップロード履歴'       },
  'fac.history.empty':      { EN: 'No uploads yet.',         ID: 'Belum ada unggahan.',         JP: 'まだアップロードなし。'       },
  'fac.history.total':      { EN: 'total',                   ID: 'total',                       JP: '合計'                       },
  'fac.history.ok':         { EN: 'ok',                      ID: 'ok',                          JP: 'OK'                         },
  'fac.history.failed':     { EN: 'failed',                  ID: 'gagal',                       JP: '失敗'                       },
  'fac.history.rolled':     { EN: 'Rolled Back',             ID: 'Dibatalkan',                  JP: 'ロールバック済'              },
  'fac.history.rollback':   { EN: '↩ Rollback',              ID: '↩ Batalkan',                  JP: '↩ ロールバック'            },

  'fac.email.title':        { EN: '✉ Send Progress Reports',ID: '✉ Kirim Laporan Progres',     JP: '✉ 進捗レポートを送信'         },
  'fac.email.subject':      { EN: 'Subject',                 ID: 'Subjek',                      JP: '件名'                         },
  'fac.email.select_lbl':   { EN: 'Select members:',        ID: 'Pilih anggota:',              JP: 'メンバーを選択:'              },
  'fac.email.select_all':   { EN: 'Select All',              ID: 'Pilih Semua',                 JP: '全選択'                       },
  'fac.email.deselect_all': { EN: 'Deselect All',            ID: 'Hapus Semua',                 JP: '全解除'                       },
  'fac.email.resend_note':  { EN: '⚠︎ Requires RESEND_API_KEY + FROM_EMAIL env vars.', ID: '⚠︎ Perlu env var RESEND_API_KEY + FROM_EMAIL.', JP: '⚠︎ RESEND_API_KEY + FROM_EMAIL 環境変数が必要です。'              },
  'fac.email.sending':      { EN: '⟳ Sending…',             ID: '⟳ Mengirim…',                 JP: '⟳ 送信中…'                    },
  'fac.email.send_btn':     { EN: 'Send to {n} members',    ID: 'Kirim ke {n} anggota',        JP: '{n}人のメンバーに送信'         },
};

// Merge extra keys into the main dict at module evaluation time
Object.assign(dict, extraDict);
