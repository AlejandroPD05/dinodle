import { supabase } from '../lib/supabaseClient';

export async function signUp(email: string, password: string, username: string) {
  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { username: username.trim() }
    }
  });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}