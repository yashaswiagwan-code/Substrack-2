import { supabase } from './supabase';

export async function signUp(email: string, password: string, fullName: string, businessName: string) {
  // Step 1: Create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  // Step 2: Call the database function to create merchant profile
  // This bypasses RLS using SECURITY DEFINER
  const { error: merchantError } = await supabase.rpc('create_merchant_profile', {
    user_id: authData.user.id,
    user_email: email,
    user_full_name: fullName,
    user_business_name: businessName,
  });

  if (merchantError) {
    console.error('Error creating merchant profile:', merchantError);
    throw merchantError;
  }

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