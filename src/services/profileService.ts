import { supabase } from '../lib/supabaseClient';

export interface ProfileData {
  username: string;
  createdAt: string;
  currentStreak: number;
  bestStreak: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgAttempts: number;
  dinosaursDiscovered: number;
  totalDinosaurs: number;
}

export interface CalendarEntry {
  date: string;
  won: boolean;
}

export async function getProfileData(userId: string): Promise<ProfileData> {
  const [
    { data: profile, error: profileError },
    { data: streak },
    { data: stats },
    { count: discoveredCount },
    { count: totalCount },
  ] = await Promise.all([
    supabase.from('profiles').select('username, created_at').eq('id', userId).single(),
    supabase.from('streaks').select('current_streak, best_streak').eq('user_id', userId).maybeSingle(),
    supabase.from('user_stats').select('games_played, wins, losses, win_rate, avg_attempts').maybeSingle(),
    supabase.from('user_dinosaurs').select('*', { count: 'exact', head: true }),
    supabase.from('dinosaurs').select('*', { count: 'exact', head: true }),
  ]);

  if (profileError) {
    throw profileError;
  }

  return {
    username: profile.username,
    createdAt: profile.created_at,
    currentStreak: streak?.current_streak ?? 0,
    bestStreak: streak?.best_streak ?? 0,
    gamesPlayed: stats?.games_played ?? 0,
    wins: stats?.wins ?? 0,
    losses: stats?.losses ?? 0,
    winRate: stats?.win_rate ?? 0,
    avgAttempts: stats?.avg_attempts ?? 0,
    dinosaursDiscovered: discoveredCount ?? 0,
    totalDinosaurs: totalCount ?? 0,
  };
}

export async function getCalendarEntries(userId: string): Promise<CalendarEntry[]> {
  const { data, error } = await supabase
    .from('games')
    .select('date, won')
    .eq('user_id', userId)
    .not('completed_at', 'is', null);

  if (error) {
    throw error;
  }

  return data;
}