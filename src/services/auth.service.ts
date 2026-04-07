import { supabase } from './supabase';
import { Role, User } from '@/types';

export const authService = {
  async signUpManager(params: {
    name: string; email: string; password: string;
    orgName: string; storeName: string; businessType: string;
  }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    if (!data.user) throw new Error('가입에 실패했습니다');

    // Some projects require email confirmation. If no session, user must verify first.
    if (!data.session) {
      // Try immediate sign-in (works if email confirmation is disabled in Supabase settings)
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });
      if (signInErr) {
        throw new Error('가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.');
      }
    }

    const { data: storeId, error: rpcErr } = await supabase.rpc('create_store_for_user', {
      p_user_name: params.name,
      p_org_name: params.orgName,
      p_store_name: params.storeName,
      p_business_type: params.businessType,
    });
    if (rpcErr) throw rpcErr;
    return storeId as string;
  },

  async signUpCrewWithInvite(params: {
    name: string; email: string; password: string; code: string;
  }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    if (!data.user) throw new Error('가입에 실패했습니다');

    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });
      if (signInErr) throw new Error('가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.');
    }

    const { data: storeId, error: rpcErr } = await supabase.rpc('join_store_by_code', {
      p_user_name: params.name,
      p_code: params.code.trim().toUpperCase(),
    });
    if (rpcErr) throw rpcErr;
    return storeId as string;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async loadCurrentUser(): Promise<User | null> {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: membership, error } = await supabase.rpc('my_membership');
    if (error || !membership || membership.length === 0) {
      // User exists but has no membership — treat as unregistered
      return null;
    }

    const m = membership[0] as { store_id: string; store_name: string; role: Role };

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', authUser.id)
      .single();

    return {
      id: authUser.id,
      name: profile?.name ?? authUser.email ?? '',
      email: profile?.email ?? authUser.email ?? '',
      role: m.role,
      storeId: m.store_id,
      storeName: m.store_name,
    };
  },
};
