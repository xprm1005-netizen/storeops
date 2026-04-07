import { supabase } from './supabase';

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const invitesService = {
  async createInvite(storeId: string, role: 'manager' | 'crew' = 'crew'): Promise<string> {
    const code = randomCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    const { error } = await supabase.from('invitations').insert({
      store_id: storeId, code, role, expires_at: expiresAt,
    });
    if (error) throw error;
    return code;
  },
};
