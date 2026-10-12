export interface SessionRecord {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

export interface UserSettingsPreferences {
  theme_mode: 'dark' | 'light' | 'system';
  color_theme: ThemeId;
  language: 'en' | 'hi' | 'es' | 'id';
  sound_enabled: boolean;
  vibration_enabled: boolean;
  reduce_motion: boolean;
  high_contrast: boolean;
  notifications: {
    match_reminders: boolean;
    registration_confirmation: boolean;
    announcements: boolean;
    results_rewards: boolean;
    email_digest: boolean;
  };
  privacy: {
    profile_visibility: 'public' | 'friends' | 'private';
    show_match_history: boolean;
    show_stats_leaderboard: boolean;
    allow_direct_challenges: boolean;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  free_fire_uid: string;
  phone: string;
  phone_verified: boolean;
  email_verified: boolean;
  wallet_balance: number;
  upi_id: string;
  is_blocked: boolean;
  created_at: string;
  login_methods: string[];
  active_sessions: SessionRecord[];
  preferences?: UserSettingsPreferences;
  xp?: number;
  level?: number;
  badges?: string[];
  preferred_game?: string;
}

export type PlayerTier = 'Grandmaster' | 'Master' | 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';

export interface PlayerLeaderboardEntry {
  user: User;
  rank: number;
  total_wins: number;
  matches_played: number;
  win_rate: number;
  accumulated_xp: number;
  level: number;
  tier: PlayerTier;
  total_prize_won: number;
  badges: string[];
  trend: 'up' | 'down' | 'same';
  favorite_game: string;
}

export interface PlayerAnalyticsSummary {
  totalGamers: number;
  totalXP: number;
  averageWinRate: number;
  topWinner: PlayerLeaderboardEntry | null;
  topXPGamer: PlayerLeaderboardEntry | null;
  highestWinRateGamer: PlayerLeaderboardEntry | null;
  totalMatchesConcluded: number;
  totalPrizesPaid: number;
  gamePopularity: { game: string; count: number; percentage: number }[];
  tierDistribution: { tier: PlayerTier; count: number; color: string }[];
  topPlayers: PlayerLeaderboardEntry[];
}

export interface Tournament {
  id: number;
  title: string;
  game_name: string;
  entry_fee: number;
  prize_pool: number;
  commission_percent: number;
  match_time: string;
  room_id: string;
  room_password: string;
  winner_id: number | null;
  status: 'Upcoming' | 'Live' | 'Completed';
  created_at: string;
  participant_ids: number[];
}

export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'credit' | 'debit';
  status: 'Completed' | 'Pending' | 'Verified' | 'Refunded';
  reference_id: string;
  description: string;
  category: 'entry_fee' | 'prize_winnings' | 'refund' | 'bonus' | 'deposit_hold';
  tournament_id?: number;
  created_at: string;
}

export interface DepositRequest {
  id: number;
  user_id: number;
  username: string;
  amount: number;
  transaction_id: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  created_at: string;
}

export interface WithdrawalRequest {
  id: number;
  user_id: number;
  username: string;
  amount: number;
  upi_id: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: number;
  title: string;
  message: string;
  type: 'reminder' | 'confirmation' | 'announcement' | 'result' | 'reward';
  read: boolean;
  created_at: string;
  link_tab?: 'matches' | 'wallet' | 'settings';
}

export interface SupportTicket {
  id: string;
  user_id: number;
  username: string;
  type: 'tournament_dispute' | 'player_report' | 'account_issue' | 'other';
  subject: string;
  tournament_id?: number;
  reported_player?: string;
  description: string;
  status: 'Open' | 'In Review' | 'Resolved' | 'Closed';
  created_at: string;
  updated_at: string;
  response?: string;
}

export type ThemeId = 'emerald' | 'crimson' | 'cyberpunk' | 'cyan' | 'amber';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  icon: string;
  primaryColor: string;
  badgeBg: string;
  badgeBorder: string;
  gradient: string;
  textColor: string;
  bgDark: string;
}

export interface AppSettings {
  admin_upi_id: string;
  admin_qr_code: string;
  app_name: string;
  theme: ThemeId;
}
