import { supabase } from './supabase';
import { Issue, IssueCategory, IssueSeverity } from '@/types';

export const issuesService = {
  async listOpen(storeId: string): Promise<Issue[]> {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Issue[];
  },

  async create(params: {
    store_id: string;
    category: IssueCategory;
    severity: IssueSeverity;
    title: string;
    description?: string;
    photo_url?: string;
  }): Promise<Issue> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('issues')
      .insert({ ...params, reporter_id: user?.id })
      .select()
      .single();
    if (error) throw error;
    return data as Issue;
  },
};
