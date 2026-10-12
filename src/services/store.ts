import { 
  User, 
  Tournament, 
  Transaction, 
  DepositRequest, 
  WithdrawalRequest, 
  AppSettings, 
  ThemeId, 
  ThemeConfig,
  AppNotification,
  SupportTicket,
  UserSettingsPreferences,
  SessionRecord,
  PlayerLeaderboardEntry,
  PlayerTier,
  PlayerAnalyticsSummary
} from '../types/tournament';

const STORAGE_KEY = 'clutch_arena_database_v5';

export function calculatePlayerTier(level: number, xp: number): PlayerTier {
  if (xp >= 25000 || level >= 40) return 'Grandmaster';
  if (xp >= 18000 || level >= 30) return 'Master';
  if (xp >= 12000 || level >= 20) return 'Diamond';
  if (xp >= 7000 || level >= 12) return 'Platinum';
  if (xp >= 3000 || level >= 6) return 'Gold';
  if (xp >= 1000 || level >= 2) return 'Silver';
  return 'Bronze';
}

interface AppDatabase {
  users: User[];
  tournaments: Tournament[];
  transactions: Transaction[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  settings: AppSettings;
  notifications: AppNotification[];
  supportTickets: SupportTicket[];
  currentUser: User | null;
  isAdminLoggedIn: boolean;
}

const DEFAULT_SESSIONS: SessionRecord[] = [
  {
    id: 'sess-current',
    device: 'Mobile (iPhone 15 Pro)',
    browser: 'Mobile Safari 18.0',
    ip: '103.212.145.89',
    location: 'Mumbai, India',
    last_active: 'Active now',
    is_current: true,
  },
  {
    id: 'sess-pc',
    device: 'Desktop PC (Windows 11)',
    browser: 'Chrome 128.0',
    ip: '103.212.145.92',
    location: 'Pune, India',
    last_active: 'Yesterday, 18:42',
    is_current: false,
  }
];

const DEFAULT_PREFERENCES: UserSettingsPreferences = {
  theme_mode: 'dark',
  color_theme: 'emerald',
  language: 'en',
  sound_enabled: true,
  vibration_enabled: true,
  reduce_motion: false,
  high_contrast: false,
  notifications: {
    match_reminders: true,
    registration_confirmation: true,
    announcements: true,
    results_rewards: true,
    email_digest: false,
  },
  privacy: {
    profile_visibility: 'public',
    show_match_history: true,
    show_stats_leaderboard: true,
    allow_direct_challenges: true,
  }
};

const DEFAULT_USERS: User[] = [
  {
    id: 1,
    username: 'gamer_akash',
    email: 'akash.esports@gmail.com',
    avatar: 'cyber-ninja',
    free_fire_uid: 'FF-99482104',
    phone: '+91 98765 43210',
    phone_verified: true,
    email_verified: true,
    wallet_balance: 150.00,
    upi_id: 'akash@okhdfcbank',
    is_blocked: false,
    created_at: '2026-10-01 10:00:00',
    login_methods: ['password', 'google'],
    active_sessions: DEFAULT_SESSIONS,
    preferences: DEFAULT_PREFERENCES,
    xp: 19500,
    level: 32,
    badges: ['Apex Fragger', 'Scrim Champion', 'Verified Pro'],
    preferred_game: 'BGMI',
  },
  {
    id: 2,
    username: 'vampire_pro',
    email: 'vampire@gmail.com',
    avatar: 'skull-warrior',
    free_fire_uid: 'FF-77281930',
    phone: '+91 98111 22334',
    phone_verified: true,
    email_verified: true,
    wallet_balance: 420.00,
    upi_id: 'vampire@ybl',
    is_blocked: false,
    created_at: '2026-10-02 14:20:00',
    login_methods: ['password'],
    active_sessions: [],
    xp: 25400,
    level: 42,
    badges: ['Grandmaster', 'BGMI Sniper', 'Clutch God'],
    preferred_game: 'BGMI',
  },
  {
    id: 3,
    username: 'killer_sam',
    email: 'sam99@gmail.com',
    avatar: 'shadow-assassin',
    free_fire_uid: 'FF-66382910',
    phone: '+91 97222 33445',
    phone_verified: false,
    email_verified: true,
    wallet_balance: 60.00,
    upi_id: 'sam@paytm',
    is_blocked: false,
    created_at: '2026-10-03 18:30:00',
    login_methods: ['password'],
    active_sessions: [],
    xp: 8200,
    level: 13,
    badges: ['Rising Star', 'Daily Grinder'],
    preferred_game: 'COD Mobile',
  },
  {
    id: 4,
    username: 'sniper_queen',
    email: 'queen_riya@gmail.com',
    avatar: 'valkyrie',
    free_fire_uid: 'FF-88492019',
    phone: '+91 96333 44556',
    phone_verified: true,
    email_verified: true,
    wallet_balance: 850.00,
    upi_id: 'riya@icici',
    is_blocked: false,
    created_at: '2026-10-04 11:15:00',
    login_methods: ['password', 'discord'],
    active_sessions: [],
    xp: 22800,
    level: 38,
    badges: ['Free Fire Queen', 'Sharpshooter', 'Tournament MVP'],
    preferred_game: 'Free Fire',
  },
  {
    id: 5,
    username: 'cyber_valkyrie',
    email: 'valkyrie.cyber@gmail.com',
    avatar: 'cyber-ninja',
    free_fire_uid: 'FF-55192837',
    phone: '+91 95444 11223',
    phone_verified: true,
    email_verified: true,
    wallet_balance: 1240.00,
    upi_id: 'valkyrie@axis',
    is_blocked: false,
    created_at: '2026-10-01 08:30:00',
    login_methods: ['password'],
    active_sessions: [],
    xp: 29500,
    level: 49,
    badges: ['Apex Champion', 'Undefeated Quad', 'Fair Play Elite'],
    preferred_game: 'Free Fire',
  },
  {
    id: 6,
    username: 'hydra_rishabh',
    email: 'rishabh.hydra@gmail.com',
    avatar: 'skull-warrior',
    free_fire_uid: 'FF-44019283',
    phone: '+91 94555 66778',
    phone_verified: true,
    email_verified: true,
    wallet_balance: 380.00,
    upi_id: 'rishabh@oksbi',
    is_blocked: false,
    created_at: '2026-10-03 12:00:00',
    login_methods: ['password'],
    active_sessions: [],
    xp: 16700,
    level: 27,
    badges: ['Rush Master', 'Assault Spec'],
    preferred_game: 'TDM',
  },
  {
    id: 7,
    username: 'demon_god',
    email: 'demon.god@gmail.com',
    avatar: 'shadow-assassin',
    free_fire_uid: 'FF-33928174',
    phone: '+91 93666 77889',
    phone_verified: true,
    email_verified: true,
    wallet_balance: 210.00,
    upi_id: 'demongod@paytm',
    is_blocked: false,
    created_at: '2026-10-05 09:45:00',
    login_methods: ['password'],
    active_sessions: [],
    xp: 13400,
    level: 22,
    badges: ['Clutch King', 'Headshot Hero'],
    preferred_game: 'BGMI',
  },
  {
    id: 8,
    username: 'shadow_rex',
    email: 'rex.shadow@gmail.com',
    avatar: 'valkyrie',
    free_fire_uid: 'FF-22819384',
    phone: '+91 92777 88990',
    phone_verified: false,
    email_verified: true,
    wallet_balance: 75.00,
    upi_id: 'shadowrex@ybl',
    is_blocked: false,
    created_at: '2026-10-06 16:15:00',
    login_methods: ['password'],
    active_sessions: [],
    xp: 6100,
    level: 10,
    badges: ['Rookie Challenger'],
    preferred_game: 'COD Mobile',
  }
];

const DEFAULT_TOURNAMENTS: Tournament[] = [
  {
    id: 101,
    title: 'BGMI Erangel Mega Squad Showdown',
    game_name: 'BGMI',
    entry_fee: 30.00,
    prize_pool: 600.00,
    commission_percent: 20,
    match_time: '2026-10-12 20:00:00',
    room_id: '9281745',
    room_password: '4455',
    winner_id: null,
    status: 'Live',
    created_at: '2026-10-10 12:00:00',
    participant_ids: [1, 2, 3, 5, 7],
  },
  {
    id: 102,
    title: 'Free Fire Bermuda Clash Squad',
    game_name: 'Free Fire',
    entry_fee: 20.00,
    prize_pool: 400.00,
    commission_percent: 20,
    match_time: '2026-10-12 21:30:00',
    room_id: '',
    room_password: '',
    winner_id: null,
    status: 'Upcoming',
    created_at: '2026-10-11 09:00:00',
    participant_ids: [2, 4, 5, 6],
  },
  {
    id: 103,
    title: 'COD Mobile Search & Destroy Elite',
    game_name: 'COD Mobile',
    entry_fee: 50.00,
    prize_pool: 1000.00,
    commission_percent: 20,
    match_time: '2026-10-13 18:00:00',
    room_id: '',
    room_password: '',
    winner_id: null,
    status: 'Upcoming',
    created_at: '2026-10-11 11:00:00',
    participant_ids: [3, 8],
  },
  {
    id: 104,
    title: '4v4 TDM Warehouse Quick Cash',
    game_name: 'TDM',
    entry_fee: 10.00,
    prize_pool: 200.00,
    commission_percent: 20,
    match_time: '2026-10-10 19:00:00',
    room_id: '4839201',
    room_password: '1234',
    winner_id: 1,
    status: 'Completed',
    created_at: '2026-10-09 10:00:00',
    participant_ids: [1, 2, 4, 6],
  },
  {
    id: 105,
    title: 'BGMI Sanhok Scrim War',
    game_name: 'BGMI',
    entry_fee: 25.00,
    prize_pool: 500.00,
    commission_percent: 20,
    match_time: '2026-10-09 21:00:00',
    room_id: '7788112',
    room_password: '9900',
    winner_id: 2,
    status: 'Completed',
    created_at: '2026-10-08 14:00:00',
    participant_ids: [1, 2, 3, 7],
  },
  {
    id: 106,
    title: 'Free Fire Kalahari Clash Squad',
    game_name: 'Free Fire',
    entry_fee: 35.00,
    prize_pool: 650.00,
    commission_percent: 20,
    match_time: '2026-10-08 20:30:00',
    room_id: '3344551',
    room_password: '7711',
    winner_id: 5,
    status: 'Completed',
    created_at: '2026-10-07 10:00:00',
    participant_ids: [2, 4, 5, 6],
  },
  {
    id: 107,
    title: 'COD Mobile Raid Hardpoint',
    game_name: 'COD Mobile',
    entry_fee: 20.00,
    prize_pool: 450.00,
    commission_percent: 20,
    match_time: '2026-10-07 18:00:00',
    room_id: '9911223',
    room_password: '5566',
    winner_id: 4,
    status: 'Completed',
    created_at: '2026-10-06 11:30:00',
    participant_ids: [3, 4, 8],
  },
  {
    id: 108,
    title: 'BGMI Miramar Elite Duo',
    game_name: 'BGMI',
    entry_fee: 40.00,
    prize_pool: 800.00,
    commission_percent: 20,
    match_time: '2026-10-06 20:00:00',
    room_id: '1122334',
    room_password: '8899',
    winner_id: 2,
    status: 'Completed',
    created_at: '2026-10-05 13:00:00',
    participant_ids: [1, 2, 5, 7],
  },
  {
    id: 109,
    title: '4v4 TDM Kill Race Arena',
    game_name: 'TDM',
    entry_fee: 15.00,
    prize_pool: 300.00,
    commission_percent: 20,
    match_time: '2026-10-05 19:30:00',
    room_id: '4455667',
    room_password: '2233',
    winner_id: 6,
    status: 'Completed',
    created_at: '2026-10-04 15:00:00',
    participant_ids: [1, 3, 6, 8],
  },
  {
    id: 110,
    title: 'Free Fire Purgatory Cup',
    game_name: 'Free Fire',
    entry_fee: 45.00,
    prize_pool: 900.00,
    commission_percent: 20,
    match_time: '2026-10-04 21:00:00',
    room_id: '6677889',
    room_password: '3344',
    winner_id: 5,
    status: 'Completed',
    created_at: '2026-10-03 16:00:00',
    participant_ids: [1, 4, 5, 7],
  },
  {
    id: 111,
    title: 'BGMI Bootcamp Showdown',
    game_name: 'BGMI',
    entry_fee: 20.00,
    prize_pool: 400.00,
    commission_percent: 20,
    match_time: '2026-10-03 17:00:00',
    room_id: '8899001',
    room_password: '6677',
    winner_id: 7,
    status: 'Completed',
    created_at: '2026-10-02 12:00:00',
    participant_ids: [2, 3, 7],
  },
  {
    id: 112,
    title: 'COD Mobile Crossfire Snipers',
    game_name: 'COD Mobile',
    entry_fee: 30.00,
    prize_pool: 550.00,
    commission_percent: 20,
    match_time: '2026-10-02 19:00:00',
    room_id: '2233445',
    room_password: '9988',
    winner_id: 4,
    status: 'Completed',
    created_at: '2026-10-01 14:00:00',
    participant_ids: [1, 4, 8],
  }
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    user_id: 1,
    amount: 50.00,
    type: 'credit',
    status: 'Verified',
    reference_id: 'TXN-CA-2026-9011',
    category: 'bonus',
    description: 'Welcome Scrim Bonus Allocation',
    created_at: '2026-10-01 10:00:00',
  },
  {
    id: 2,
    user_id: 1,
    amount: 200.00,
    type: 'credit',
    status: 'Completed',
    reference_id: 'TXN-CA-2026-9482',
    category: 'prize_winnings',
    tournament_id: 104,
    description: '1st Place Prize: 4v4 TDM Warehouse Quick Cash',
    created_at: '2026-10-10 20:00:00',
  },
  {
    id: 3,
    user_id: 1,
    amount: 30.00,
    type: 'debit',
    status: 'Completed',
    reference_id: 'TXN-CA-2026-9812',
    category: 'entry_fee',
    tournament_id: 101,
    description: 'Scrim Slot Registration: BGMI Erangel Mega Squad',
    created_at: '2026-10-11 15:30:00',
  }
];

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    user_id: 1,
    title: 'Match Starting Shortly: BGMI Erangel',
    message: 'Your scrim match starts in 20 minutes! Room ID and password are now unlocked.',
    type: 'reminder',
    read: false,
    created_at: '2026-10-11 22:30:00',
    link_tab: 'matches',
  },
  {
    id: 'notif-2',
    user_id: 1,
    title: 'Registration Confirmed',
    message: 'Slot confirmed for BGMI Erangel Mega Squad Showdown.',
    type: 'confirmation',
    read: true,
    created_at: '2026-10-11 15:30:00',
    link_tab: 'matches',
  },
  {
    id: 'notif-3',
    user_id: 1,
    title: 'Free Fire Bermuda Series Announced',
    message: 'New weekly prize tourney scheduled for Saturday 9 PM IST. Registration is live.',
    type: 'announcement',
    read: true,
    created_at: '2026-10-10 12:00:00',
  },
  {
    id: 'notif-4',
    user_id: 1,
    title: 'Tournament Winner Winnings Credited',
    message: 'Congratulations! You secured 1st place in 4v4 TDM Warehouse. ₹200.00 credited.',
    type: 'reward',
    read: true,
    created_at: '2026-10-10 20:05:00',
    link_tab: 'wallet',
  }
];

const DEFAULT_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-CA-4029',
    user_id: 1,
    username: 'gamer_akash',
    type: 'tournament_dispute',
    subject: 'Room server connection delay in TDM 4v4',
    tournament_id: 104,
    description: 'Custom room took 3 minutes to start after countdown. All teammates managed to play through.',
    status: 'Resolved',
    created_at: '2026-10-10 20:15:00',
    updated_at: '2026-10-10 20:45:00',
    response: 'Dispute reviewed by arena marshals. Official result verified and points recorded accurately.',
  }
];

const DEFAULT_DEPOSITS: DepositRequest[] = [
  {
    id: 1,
    user_id: 2,
    username: 'vampire_pro',
    amount: 100.00,
    transaction_id: 'UPI948271038472',
    status: 'Pending',
    created_at: '2026-10-11 21:10:00',
  }
];

const DEFAULT_WITHDRAWALS: WithdrawalRequest[] = [
  {
    id: 1,
    user_id: 4,
    username: 'sniper_queen',
    amount: 200.00,
    upi_id: 'riya@icici',
    status: 'Pending',
    created_at: '2026-10-11 20:45:00',
  }
];

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    id: 'emerald',
    name: 'Emerald Neon',
    icon: 'fa-gem',
    primaryColor: 'emerald',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    badgeBorder: 'border-emerald-500',
    gradient: 'from-emerald-500 to-teal-400',
    textColor: 'text-emerald-400',
    bgDark: 'bg-[#0b0f19]',
  },
  {
    id: 'crimson',
    name: 'Crimson Fury',
    icon: 'fa-fire',
    primaryColor: 'rose',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    badgeBorder: 'border-rose-500',
    gradient: 'from-rose-500 to-red-600',
    textColor: 'text-rose-400',
    bgDark: 'bg-[#12080a]',
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Violet',
    icon: 'fa-bolt',
    primaryColor: 'indigo',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    badgeBorder: 'border-purple-500',
    gradient: 'from-indigo-500 to-purple-600',
    textColor: 'text-purple-400',
    bgDark: 'bg-[#0d091a]',
  },
  {
    id: 'cyan',
    name: 'Glacier Cyan',
    icon: 'fa-snowflake',
    primaryColor: 'cyan',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    badgeBorder: 'border-cyan-500',
    gradient: 'from-cyan-400 to-blue-500',
    textColor: 'text-cyan-400',
    bgDark: 'bg-[#08121a]',
  },
  {
    id: 'amber',
    name: 'Apex Gold',
    icon: 'fa-crown',
    primaryColor: 'amber',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    badgeBorder: 'border-amber-500',
    gradient: 'from-amber-400 to-yellow-500',
    textColor: 'text-amber-400',
    bgDark: 'bg-[#141006]',
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  admin_upi_id: 'esports@okhdfcbank',
  admin_qr_code: 'uploads/qr_codes/default_qr.png',
  app_name: 'Clutch Arena',
  theme: 'cyberpunk', // Premium esports default
};

export class AppStore {
  private db: AppDatabase;
  private listeners: (() => void)[] = [];

  constructor() {
    this.db = this.load();
  }

  private load(): AppDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const loadedUsers = (parsed.users || []).map((u: User, idx: number) => {
          const matchDefault = DEFAULT_USERS.find(du => du.id === u.id);
          const xp = u.xp ?? matchDefault?.xp ?? 1500;
          const level = u.level ?? matchDefault?.level ?? Math.max(1, Math.floor(xp / 600));
          return {
            ...matchDefault,
            ...u,
            xp,
            level,
            badges: u.badges ?? matchDefault?.badges ?? ['Esports Challenger'],
            preferred_game: u.preferred_game ?? matchDefault?.preferred_game ?? 'BGMI',
          };
        });

        // Add any default users not in loadedUsers
        DEFAULT_USERS.forEach(du => {
          if (!loadedUsers.some((u: User) => u.id === du.id)) {
            loadedUsers.push(du);
          }
        });

        return {
          ...parsed,
          users: loadedUsers,
          tournaments: (parsed.tournaments && parsed.tournaments.length >= 8) ? parsed.tournaments : DEFAULT_TOURNAMENTS,
          notifications: parsed.notifications || DEFAULT_NOTIFICATIONS,
          supportTickets: parsed.supportTickets || DEFAULT_SUPPORT_TICKETS,
          currentUser: parsed.currentUser ?? DEFAULT_USERS[0],
        };
      }
    } catch (e) {
      console.warn('Failed to load store from localStorage', e);
    }
    return {
      users: DEFAULT_USERS,
      tournaments: DEFAULT_TOURNAMENTS,
      transactions: DEFAULT_TRANSACTIONS,
      deposits: DEFAULT_DEPOSITS,
      withdrawals: DEFAULT_WITHDRAWALS,
      settings: DEFAULT_SETTINGS,
      notifications: DEFAULT_NOTIFICATIONS,
      supportTickets: DEFAULT_SUPPORT_TICKETS,
      currentUser: DEFAULT_USERS[0],
      isAdminLoggedIn: true,
    };
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch (e) {
      console.warn('Failed to save store to localStorage', e);
    }
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) {
      l();
    }
  }

  // Getters
  getUsers() { return this.db.users; }
  getTournaments() { return this.db.tournaments; }
  getTransactions(userId?: number) {
    if (userId) return this.db.transactions.filter(t => t.user_id === userId);
    return this.db.transactions;
  }
  getDeposits() { return this.db.deposits; }
  getWithdrawals() { return this.db.withdrawals; }
  getSettings() { return this.db.settings; }
  getCurrentUser() { return this.db.currentUser; }
  isAdmin() { return this.db.isAdminLoggedIn; }
  
  getNotifications(userId?: number) {
    if (userId) return this.db.notifications.filter(n => n.user_id === userId);
    return this.db.notifications;
  }

  getSupportTickets(userId?: number) {
    if (userId) return this.db.supportTickets.filter(t => t.user_id === userId);
    return this.db.supportTickets;
  }

  // User Actions
  setCurrentUser(user: User | null) {
    this.db.currentUser = user;
    this.save();
  }

  loginUser(usernameOrEmail: string): { success: boolean; message: string } {
    const user = this.db.users.find(u => 
      u.username.toLowerCase() === usernameOrEmail.toLowerCase() || 
      u.email.toLowerCase() === usernameOrEmail.toLowerCase()
    );
    if (!user) {
      return { success: false, message: 'Invalid credentials. User not found.' };
    }
    if (user.is_blocked) {
      return { success: false, message: 'Account is suspended by administrator.' };
    }
    this.db.currentUser = user;
    this.save();
    return { success: true, message: `Welcome back, ${user.username}!` };
  }

  signupUser(username: string, email: string): { success: boolean; message: string } {
    if (this.db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username is already taken.' };
    }
    const newUser: User = {
      id: Date.now(),
      username,
      email,
      avatar: 'cyber-ninja',
      free_fire_uid: '',
      phone: '',
      phone_verified: false,
      email_verified: false,
      wallet_balance: 50.00,
      upi_id: '',
      is_blocked: false,
      created_at: new Date().toISOString(),
      login_methods: ['password'],
      active_sessions: DEFAULT_SESSIONS,
      preferences: DEFAULT_PREFERENCES,
    };
    this.db.users.push(newUser);
    this.db.transactions.unshift({
      id: Date.now(),
      user_id: newUser.id,
      amount: 50.00,
      type: 'credit',
      status: 'Verified',
      reference_id: `TXN-CA-${Date.now().toString().slice(-4)}`,
      category: 'bonus',
      description: 'Welcome Scrim Bonus Allocation',
      created_at: new Date().toISOString(),
    });
    this.db.currentUser = newUser;
    this.save();
    return { success: true, message: 'Account registered successfully with ₹50 bonus!' };
  }

  // Section 1: Account & Profile
  updateUserProfile(userId: number, data: {
    username: string;
    avatar: string;
    free_fire_uid: string;
    phone: string;
    upi_id?: string;
  }): { success: boolean; message: string } {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    // Duplicate username check
    const existing = this.db.users.find(u => u.username.toLowerCase() === data.username.toLowerCase() && u.id !== userId);
    if (existing) {
      return { success: false, message: 'Username is already taken by another gamer.' };
    }

    user.username = data.username.trim();
    user.avatar = data.avatar;
    user.free_fire_uid = data.free_fire_uid.trim();
    user.phone = data.phone.trim();
    if (data.upi_id !== undefined) {
      user.upi_id = data.upi_id.trim();
    }

    if (this.db.currentUser?.id === userId) {
      this.db.currentUser = { ...user };
    }
    this.save();
    return { success: true, message: 'Gamer profile & Free Fire UID updated successfully!' };
  }

  changePassword(userId: number, currentPass: string, newPass: string): { success: boolean; message: string } {
    if (!currentPass || !newPass) {
      return { success: false, message: 'All password fields are required.' };
    }
    if (newPass.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }
    // In our client simulation, password update succeeds
    return { success: true, message: 'Password updated securely across all active devices.' };
  }

  terminateSession(userId: number, sessionId: string): { success: boolean; message: string } {
    const user = this.db.users.find(u => u.id === userId);
    if (!user || !user.active_sessions) return { success: false, message: 'User not found' };

    user.active_sessions = user.active_sessions.filter(s => s.id !== sessionId);
    if (this.db.currentUser?.id === userId) {
      this.db.currentUser.active_sessions = user.active_sessions;
    }
    this.save();
    return { success: true, message: 'Session logged out successfully.' };
  }

  terminateOtherSessions(userId: number): { success: boolean; message: string } {
    const user = this.db.users.find(u => u.id === userId);
    if (!user || !user.active_sessions) return { success: false, message: 'User not found' };

    user.active_sessions = user.active_sessions.filter(s => s.is_current);
    if (this.db.currentUser?.id === userId) {
      this.db.currentUser.active_sessions = user.active_sessions;
    }
    this.save();
    return { success: true, message: 'All other device sessions have been terminated.' };
  }

  // Section 3: Notifications
  markNotificationRead(notificationId: string) {
    const notif = this.db.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      this.save();
    }
  }

  markAllNotificationsRead(userId: number) {
    this.db.notifications.forEach(n => {
      if (n.user_id === userId) n.read = true;
    });
    this.save();
    return { success: true, message: 'All notifications marked as read.' };
  }

  clearNotification(notificationId: string) {
    this.db.notifications = this.db.notifications.filter(n => n.id !== notificationId);
    this.save();
  }

  // Section 4: Security & Privacy
  updatePrivacySettings(userId: number, privacy: UserSettingsPreferences['privacy']) {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };
    if (!user.preferences) user.preferences = { ...DEFAULT_PREFERENCES };

    user.preferences.privacy = { ...privacy };
    if (this.db.currentUser?.id === userId) {
      this.db.currentUser.preferences = user.preferences;
    }
    this.save();
    return { success: true, message: 'Privacy preferences saved.' };
  }

  exportUserData(userId: number): string {
    const user = this.db.users.find(u => u.id === userId);
    const txns = this.getTransactions(userId);
    const notifs = this.getNotifications(userId);
    const tickets = this.getSupportTickets(userId);

    const exportBundle = {
      platform: 'Clutch Arena Esports',
      exported_at: new Date().toISOString(),
      account: {
        id: user?.id,
        username: user?.username,
        email: user?.email,
        free_fire_uid: user?.free_fire_uid,
        phone: user?.phone,
        wallet_balance: user?.wallet_balance,
        created_at: user?.created_at,
        login_methods: user?.login_methods,
      },
      preferences: user?.preferences,
      transactions: txns,
      notifications: notifs,
      support_tickets: tickets,
    };
    return JSON.stringify(exportBundle, null, 2);
  }

  deleteAccount(userId: number): { success: boolean; message: string } {
    this.db.users = this.db.users.filter(u => u.id !== userId);
    this.db.transactions = this.db.transactions.filter(t => t.user_id !== userId);
    this.db.notifications = this.db.notifications.filter(n => n.user_id !== userId);
    this.db.supportTickets = this.db.supportTickets.filter(s => s.user_id !== userId);
    this.db.currentUser = null;
    this.save();
    return { success: true, message: 'Your account and data have been permanently deleted.' };
  }

  // Section 5: App Preferences
  updateAppPreferences(userId: number, prefs: Partial<UserSettingsPreferences>) {
    const user = this.db.users.find(u => u.id === userId);
    if (user) {
      if (!user.preferences) user.preferences = { ...DEFAULT_PREFERENCES };
      user.preferences = { ...user.preferences, ...prefs };
      if (this.db.currentUser?.id === userId) {
        this.db.currentUser.preferences = user.preferences;
      }
    }
    if (prefs.color_theme) {
      this.db.settings.theme = prefs.color_theme;
    }
    this.save();
    return { success: true, message: 'App preferences updated.' };
  }

  // Section 6: Help & Support Tickets
  createSupportTicket(data: {
    userId: number;
    username: string;
    type: SupportTicket['type'];
    subject: string;
    description: string;
    tournament_id?: number;
    reported_player?: string;
  }): { success: boolean; message: string; ticket: SupportTicket } {
    const newTicket: SupportTicket = {
      id: `TKT-CA-${Math.floor(1000 + Math.random() * 9000)}`,
      user_id: data.userId,
      username: data.username,
      type: data.type,
      subject: data.subject.trim(),
      description: data.description.trim(),
      tournament_id: data.tournament_id,
      reported_player: data.reported_player?.trim(),
      status: 'Open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.db.supportTickets.unshift(newTicket);
    this.save();
    return { success: true, message: `Support ticket #${newTicket.id} submitted! Our team will respond within 4 hours.`, ticket: newTicket };
  }

  // Tournaments
  joinTournament(userId: number, tournamentId: number): { success: boolean; message: string } {
    const user = this.db.users.find(u => u.id === userId);
    const tournament = this.db.tournaments.find(t => t.id === tournamentId);

    if (!user || !tournament) {
      return { success: false, message: 'User or Tournament not found.' };
    }
    if (tournament.status === 'Completed') {
      return { success: false, message: 'This tournament has already ended.' };
    }
    if (tournament.participant_ids.includes(userId)) {
      return { success: false, message: 'You have already joined this tournament.' };
    }
    if (user.wallet_balance < tournament.entry_fee) {
      return { success: false, message: `Insufficient balance (₹${user.wallet_balance.toFixed(2)}). Need ₹${tournament.entry_fee.toFixed(2)}.` };
    }

    // Deduct entry fee
    user.wallet_balance -= tournament.entry_fee;
    tournament.participant_ids.push(userId);

    const refId = `TXN-CA-${Date.now().toString().slice(-4)}`;
    this.db.transactions.unshift({
      id: Date.now(),
      user_id: userId,
      amount: tournament.entry_fee,
      type: 'debit',
      status: 'Completed',
      reference_id: refId,
      category: 'entry_fee',
      tournament_id: tournament.id,
      description: `Registration: ${tournament.title}`,
      created_at: new Date().toISOString(),
    });

    // Add match confirmation notification
    this.db.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: userId,
      title: 'Slot Confirmed: ' + tournament.title,
      message: `You registered for ${tournament.game_name} match. Keep notifications on for room unlock.`,
      type: 'confirmation',
      read: false,
      created_at: new Date().toISOString(),
      link_tab: 'matches',
    });

    if (this.db.currentUser?.id === userId) {
      this.db.currentUser.wallet_balance = user.wallet_balance;
    }

    this.save();
    return { success: true, message: `Successfully joined ${tournament.title}! Check room details in My Matches.` };
  }

  // Submit UPI Deposit
  submitDeposit(userId: number, amount: number, transactionId: string): { success: boolean; message: string } {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    if (this.db.deposits.some(d => d.transaction_id === transactionId && d.status !== 'Rejected')) {
      return { success: false, message: 'This transaction ID has already been submitted.' };
    }

    const newDep: DepositRequest = {
      id: Date.now(),
      user_id: userId,
      username: user.username,
      amount,
      transaction_id: transactionId,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };
    this.db.deposits.unshift(newDep);
    this.save();
    return { success: true, message: `Deposit request of ₹${amount.toFixed(2)} submitted! Admin will verify and credit your wallet.` };
  }

  // Submit UPI Withdrawal
  submitWithdrawal(userId: number, amount: number): { success: boolean; message: string } {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };
    if (!user.upi_id) return { success: false, message: 'Please save your UPI ID in Profile first.' };
    if (user.wallet_balance < amount) return { success: false, message: 'Insufficient balance.' };

    user.wallet_balance -= amount;
    const newWith: WithdrawalRequest = {
      id: Date.now(),
      user_id: userId,
      username: user.username,
      amount,
      upi_id: user.upi_id,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };
    this.db.withdrawals.unshift(newWith);

    this.db.transactions.unshift({
      id: Date.now(),
      user_id: userId,
      amount,
      type: 'debit',
      status: 'Pending',
      reference_id: `TXN-CA-WTH-${Date.now().toString().slice(-4)}`,
      category: 'deposit_hold',
      description: `Withdrawal request to UPI (${user.upi_id})`,
      created_at: new Date().toISOString(),
    });

    if (this.db.currentUser?.id === userId) {
      this.db.currentUser.wallet_balance = user.wallet_balance;
    }

    this.save();
    return { success: true, message: `Withdrawal request of ₹${amount.toFixed(2)} submitted to ${user.upi_id}!` };
  }

  // Admin Actions
  approveDeposit(depositId: number): { success: boolean; message: string } {
    const dep = this.db.deposits.find(d => d.id === depositId);
    if (!dep || dep.status !== 'Pending') {
      return { success: false, message: 'Invalid or already processed deposit.' };
    }
    const user = this.db.users.find(u => u.id === dep.user_id);
    if (user) {
      user.wallet_balance += dep.amount;
      if (this.db.currentUser?.id === user.id) {
        this.db.currentUser.wallet_balance = user.wallet_balance;
      }
      this.db.transactions.unshift({
        id: Date.now(),
        user_id: user.id,
        amount: dep.amount,
        type: 'credit',
        status: 'Completed',
        reference_id: `TXN-CA-DEP-${Date.now().toString().slice(-4)}`,
        category: 'bonus',
        description: `UPI Deposit Approved (Ref: ${dep.transaction_id})`,
        created_at: new Date().toISOString(),
      });
      // Notify
      this.db.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: user.id,
        title: 'UPI Deposit Verified & Credited',
        message: `₹${dep.amount.toFixed(2)} has been added to your wallet (Ref: ${dep.transaction_id}).`,
        type: 'reward',
        read: false,
        created_at: new Date().toISOString(),
        link_tab: 'wallet',
      });
    }
    dep.status = 'Completed';
    this.save();
    return { success: true, message: `Deposit of ₹${dep.amount.toFixed(2)} approved & credited!` };
  }

  rejectDeposit(depositId: number): { success: boolean; message: string } {
    const dep = this.db.deposits.find(d => d.id === depositId);
    if (!dep || dep.status !== 'Pending') return { success: false, message: 'Invalid deposit.' };
    dep.status = 'Rejected';
    this.save();
    return { success: true, message: 'Deposit request rejected.' };
  }

  completeWithdrawal(withdrawalId: number): { success: boolean; message: string } {
    const withReq = this.db.withdrawals.find(w => w.id === withdrawalId);
    if (!withReq || withReq.status !== 'Pending') return { success: false, message: 'Invalid withdrawal.' };
    withReq.status = 'Completed';
    this.save();
    return { success: true, message: `Withdrawal of ₹${withReq.amount.toFixed(2)} marked as sent to ${withReq.upi_id}!` };
  }

  rejectWithdrawal(withdrawalId: number): { success: boolean; message: string } {
    const withReq = this.db.withdrawals.find(w => w.id === withdrawalId);
    if (!withReq || withReq.status !== 'Pending') return { success: false, message: 'Invalid withdrawal.' };

    const user = this.db.users.find(u => u.id === withReq.user_id);
    if (user) {
      user.wallet_balance += withReq.amount;
      if (this.db.currentUser?.id === user.id) {
        this.db.currentUser.wallet_balance = user.wallet_balance;
      }
      this.db.transactions.unshift({
        id: Date.now(),
        user_id: user.id,
        amount: withReq.amount,
        type: 'credit',
        status: 'Refunded',
        reference_id: `TXN-CA-REF-${Date.now().toString().slice(-4)}`,
        category: 'refund',
        description: `Refund: Rejected Withdrawal Request`,
        created_at: new Date().toISOString(),
      });
    }

    withReq.status = 'Rejected';
    this.save();
    return { success: true, message: `Withdrawal rejected & ₹${withReq.amount.toFixed(2)} refunded to player wallet.` };
  }

  createTournament(data: Omit<Tournament, 'id' | 'created_at' | 'participant_ids' | 'winner_id' | 'status' | 'room_id' | 'room_password'>): { success: boolean; message: string } {
    const newTournament: Tournament = {
      ...data,
      id: Date.now(),
      room_id: '',
      room_password: '',
      winner_id: null,
      status: 'Upcoming',
      created_at: new Date().toISOString(),
      participant_ids: [],
    };
    this.db.tournaments.unshift(newTournament);
    this.save();
    return { success: true, message: `Tournament "${data.title}" published successfully!` };
  }

  deleteTournament(tournamentId: number) {
    this.db.tournaments = this.db.tournaments.filter(t => t.id !== tournamentId);
    this.save();
    return { success: true, message: 'Tournament deleted.' };
  }

  updateRoom(tournamentId: number, roomId: string, roomPass: string, status: 'Upcoming' | 'Live' | 'Completed') {
    const t = this.db.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return { success: false, message: 'Tournament not found' };
    t.room_id = roomId;
    t.room_password = roomPass;
    t.status = status;

    // If marked Live, broadcast reminder to participants
    if (status === 'Live') {
      t.participant_ids.forEach(uid => {
        this.db.notifications.unshift({
          id: `notif-${Date.now()}-${uid}`,
          user_id: uid,
          title: `Match LIVE: ${t.title}`,
          message: `Room ID: ${roomId} | Pass: ${roomPass}. Join immediately!`,
          type: 'reminder',
          read: false,
          created_at: new Date().toISOString(),
          link_tab: 'matches',
        });
      });
    }

    this.save();
    return { success: true, message: 'Room details & status updated!' };
  }

  declareWinner(tournamentId: number, winnerId: number): { success: boolean; message: string } {
    const t = this.db.tournaments.find(tour => tour.id === tournamentId);
    if (!t) return { success: false, message: 'Tournament not found' };
    if (t.status === 'Completed' && t.winner_id) return { success: false, message: 'Winner already declared for this match.' };

    const winner = this.db.users.find(u => u.id === winnerId);
    if (!winner) return { success: false, message: 'Winner user not found' };

    t.winner_id = winnerId;
    t.status = 'Completed';
    winner.wallet_balance += t.prize_pool;

    // Award Winner XP
    const prevWinnerLevel = winner.level || 1;
    winner.xp = (winner.xp || 1500) + 500;
    winner.level = Math.max(1, Math.floor(winner.xp / 600));

    // Award participation XP to other participants
    t.participant_ids.forEach(pid => {
      if (pid !== winnerId) {
        const participant = this.db.users.find(u => u.id === pid);
        if (participant) {
          participant.xp = (participant.xp || 1000) + 120;
          participant.level = Math.max(1, Math.floor(participant.xp / 600));
          this.db.notifications.unshift({
            id: `notif-${Date.now()}-${pid}`,
            user_id: pid,
            title: `Match Concluded: +120 XP`,
            message: `You earned 120 XP for competing in "${t.title}". Check your position on the Leaderboard!`,
            type: 'reward',
            read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    });

    if (this.db.currentUser?.id === winnerId) {
      this.db.currentUser.wallet_balance = winner.wallet_balance;
      this.db.currentUser.xp = winner.xp;
      this.db.currentUser.level = winner.level;
    }

    this.db.transactions.unshift({
      id: Date.now(),
      user_id: winnerId,
      amount: t.prize_pool,
      type: 'credit',
      status: 'Completed',
      reference_id: `TXN-CA-WIN-${Date.now().toString().slice(-4)}`,
      category: 'prize_winnings',
      tournament_id: t.id,
      description: `Prize Pool Won: ${t.title}`,
      created_at: new Date().toISOString(),
    });

    this.db.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: winnerId,
      title: `Winner Declared: +₹${t.prize_pool.toFixed(2)} & +500 XP`,
      message: `You won "${t.title}"! Prize has been credited and +500 XP added to your ranking.${winner.level > prevWinnerLevel ? ` Leveled up to Level ${winner.level}!` : ''}`,
      type: 'reward',
      read: false,
      created_at: new Date().toISOString(),
      link_tab: 'wallet',
    });

    this.save();
    return { success: true, message: `Prize of ₹${t.prize_pool.toFixed(2)} & 500 XP distributed to ${winner.username}!` };
  }

  awardUserXP(userId: number, xpAmount: number, reason: string): { success: boolean; message: string } {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    const oldLevel = user.level || Math.max(1, Math.floor((user.xp || 1500) / 600));
    user.xp = (user.xp || 1500) + xpAmount;
    user.level = Math.max(1, Math.floor(user.xp / 600));

    const leveledUp = user.level > oldLevel;

    this.db.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: user.id,
      title: leveledUp ? `Level Up! Level ${user.level}` : `+${xpAmount} XP Awarded`,
      message: `${reason}. Total XP: ${user.xp.toLocaleString()} XP.`,
      type: 'reward',
      read: false,
      created_at: new Date().toISOString(),
    });

    if (this.db.currentUser?.id === userId) {
      this.db.currentUser.xp = user.xp;
      this.db.currentUser.level = user.level;
    }

    this.save();
    return {
      success: true,
      message: `Awarded ${xpAmount} XP to ${user.username}! ${leveledUp ? `(Leveled up to Lv. ${user.level}!)` : ''}`,
    };
  }

  getPlayerLeaderboard(
    sortBy: 'wins' | 'xp' = 'wins',
    gameFilter: string = 'All',
    timeFilter: 'all' | 'season' | 'weekly' = 'all'
  ): PlayerLeaderboardEntry[] {
    const tournaments = this.db.tournaments;
    const users = this.db.users;

    const entries: PlayerLeaderboardEntry[] = users.map((user, index) => {
      const userTournaments = tournaments.filter(t => {
        if (gameFilter !== 'All' && t.game_name !== gameFilter) return false;
        return t.participant_ids.includes(user.id);
      });

      const winsTournaments = tournaments.filter(t => {
        if (gameFilter !== 'All' && t.game_name !== gameFilter) return false;
        return t.status === 'Completed' && t.winner_id === user.id;
      });

      let multiplier = 1;
      if (timeFilter === 'weekly') multiplier = 0.4;
      else if (timeFilter === 'season') multiplier = 0.8;

      const total_wins = Math.max(0, Math.round(winsTournaments.length * multiplier));
      const matches_played = Math.max(total_wins, Math.round(userTournaments.length * multiplier));
      const win_rate = matches_played > 0 ? Math.round((total_wins / matches_played) * 100) : 0;
      
      const total_prize_won = winsTournaments.reduce((sum, t) => sum + t.prize_pool, 0) * multiplier;

      const baseXP = user.xp || 1500;
      const accumulated_xp = Math.round(baseXP * multiplier);
      const level = Math.max(1, Math.floor(accumulated_xp / 600));
      const tier = calculatePlayerTier(level, accumulated_xp);

      const trend: 'up' | 'down' | 'same' = (index % 3 === 0) ? 'up' : (index % 4 === 0 ? 'down' : 'same');

      return {
        user,
        rank: 0,
        total_wins,
        matches_played,
        win_rate,
        accumulated_xp,
        level,
        tier,
        total_prize_won,
        badges: user.badges || ['Esports Challenger'],
        trend,
        favorite_game: user.preferred_game || (userTournaments[0]?.game_name || 'BGMI'),
      };
    });

    if (sortBy === 'wins') {
      entries.sort((a, b) => {
        if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins;
        if (b.accumulated_xp !== a.accumulated_xp) return b.accumulated_xp - a.accumulated_xp;
        return b.win_rate - a.win_rate;
      });
    } else {
      entries.sort((a, b) => {
        if (b.accumulated_xp !== a.accumulated_xp) return b.accumulated_xp - a.accumulated_xp;
        if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins;
        return b.level - a.level;
      });
    }

    return entries.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }

  getPlayerAnalytics(): PlayerAnalyticsSummary {
    const leaderboard = this.getPlayerLeaderboard('wins', 'All', 'all');
    const xpLeaderboard = this.getPlayerLeaderboard('xp', 'All', 'all');
    
    const totalGamers = this.db.users.length;
    const totalXP = this.db.users.reduce((sum, u) => sum + (u.xp || 1500), 0);
    
    const activeWithMatches = leaderboard.filter(e => e.matches_played > 0);
    const averageWinRate = activeWithMatches.length > 0 
      ? Math.round(activeWithMatches.reduce((s, e) => s + e.win_rate, 0) / activeWithMatches.length) 
      : 0;

    const topWinner = leaderboard[0] || null;
    const topXPGamer = xpLeaderboard[0] || null;
    
    const sortedByWinRate = [...activeWithMatches].sort((a, b) => {
      if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
      return b.matches_played - a.matches_played;
    });
    const highestWinRateGamer = sortedByWinRate[0] || null;

    const completedTournaments = this.db.tournaments.filter(t => t.status === 'Completed');
    const totalMatchesConcluded = completedTournaments.length;
    const totalPrizesPaid = completedTournaments.reduce((sum, t) => sum + t.prize_pool, 0);

    const gameCounts: Record<string, number> = {};
    this.db.tournaments.forEach(t => {
      gameCounts[t.game_name] = (gameCounts[t.game_name] || 0) + 1;
    });
    const totalTournamentsCount = this.db.tournaments.length || 1;
    const gamePopularity = Object.entries(gameCounts).map(([game, count]) => ({
      game,
      count,
      percentage: Math.round((count / totalTournamentsCount) * 100),
    }));

    const tierCounts: Record<PlayerTier, number> = {
      Grandmaster: 0,
      Master: 0,
      Diamond: 0,
      Platinum: 0,
      Gold: 0,
      Silver: 0,
      Bronze: 0,
    };
    leaderboard.forEach(e => {
      tierCounts[e.tier] = (tierCounts[e.tier] || 0) + 1;
    });

    const tierColors: Record<PlayerTier, string> = {
      Grandmaster: '#ef4444',
      Master: '#a855f7',
      Diamond: '#06b6d4',
      Platinum: '#10b981',
      Gold: '#f59e0b',
      Silver: '#94a3b8',
      Bronze: '#d97706',
    };

    const tierDistribution = (Object.keys(tierCounts) as PlayerTier[]).map(tier => ({
      tier,
      count: tierCounts[tier],
      color: tierColors[tier],
    }));

    return {
      totalGamers,
      totalXP,
      averageWinRate,
      topWinner,
      topXPGamer,
      highestWinRateGamer,
      totalMatchesConcluded,
      totalPrizesPaid,
      gamePopularity,
      tierDistribution,
      topPlayers: leaderboard.slice(0, 10),
    };
  }

  toggleBlockUser(userId: number) {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };
    user.is_blocked = !user.is_blocked;
    this.save();
    return { success: true, message: `User ${user.is_blocked ? 'suspended' : 'activated'}.` };
  }

  updateAdminSettings(upiId: string, qrCode: string) {
    this.db.settings.admin_upi_id = upiId;
    if (qrCode) this.db.settings.admin_qr_code = qrCode;
    this.save();
    return { success: true, message: 'Admin UPI Gateway settings updated successfully!' };
  }

  setTheme(themeId: ThemeId) {
    this.db.settings.theme = themeId;
    if (this.db.currentUser) {
      if (!this.db.currentUser.preferences) {
        this.db.currentUser.preferences = { ...DEFAULT_PREFERENCES };
      }
      this.db.currentUser.preferences.color_theme = themeId;
    }
    this.save();
    return { success: true, message: `Theme switched to ${themeId}!` };
  }

  getTheme(): ThemeConfig {
    const currentId = this.db.settings.theme || 'cyberpunk';
    return AVAILABLE_THEMES.find(t => t.id === currentId) || AVAILABLE_THEMES[2];
  }

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEY);
    this.db = this.load();
    this.save();
  }
}

export const appStore = new AppStore();
