import { supabase } from './supabase';

export async function signUp(email: string, password: string, fullName: string, businessName: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  const { error: merchantError } = await supabase
    .from('merchants')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      business_name: businessName,
    });

  if (merchantError) throw merchantError;

  return authData;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getMerchantProfile(userId: string) {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
