import { supabase } from './supabase';
import { Report } from '@/types';

export const reportsService = {
  async listForStore(storeId: string, limit = 30): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('store_id', storeId)
      .order('report_date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Report[];
  },

  async listToday(storeId: string): Promise<Report[]> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('store_id', storeId)
      .eq('report_date', today)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Report[];
  },

  async create(params: {
    store_id: string;
    task_id: string;
    task_name: string;
    performer_id: string;
    performer_name: string;
    ok_count: number;
    anomaly_count: number;
    total_count: number;
    duration_min: number;
  }): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .insert({ ...params, report_date: new Date().toISOString().slice(0, 10) })
      .select()
      .single();
    if (error) throw error;
    return data as Report;
  },
};
