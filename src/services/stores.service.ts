import { supabase } from './supabase';
import { Staff } from '@/types';

export const storesService = {
  async listMembers(storeId: string): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('store_members')
      .select('id, role, user_id, profiles!inner(name, email), stores!inner(name)')
      .eq('store_id', storeId);
    if (error) throw error;

    return ((data ?? []) as any[]).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      name: m.profiles?.name ?? '-',
      email: m.profiles?.email ?? undefined,
      role: m.role,
      store_name: m.stores?.name ?? '',
    }));
  },
};
