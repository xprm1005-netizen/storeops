import { supabase } from './supabase';
import { Task, TaskLog } from '@/types';

export const tasksService = {
  async listForStore(storeId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('phase');
    if (error) throw error;
    return (data ?? []) as Task[];
  },

  async getById(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (error) throw error;
    return data as Task;
  },

  async getTodayLogs(taskId: string): Promise<TaskLog[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('task_logs')
      .select('*')
      .eq('task_id', taskId)
      .gte('performed_at', start.toISOString())
      .order('performed_at');
    if (error) throw error;
    return (data ?? []) as TaskLog[];
  },

  async logItem(params: {
    task_id: string;
    store_id: string;
    item_id: string;
    item_title: string;
    status: 'ok' | 'anomaly';
    note?: string;
    photo_url?: string;
  }): Promise<TaskLog> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('task_logs')
      .insert({ ...params, performed_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    return data as TaskLog;
  },

  async uploadPhoto(storeId: string, file: File | Blob): Promise<string> {
    const ext = (file instanceof File ? file.name.split('.').pop() : 'jpg') ?? 'jpg';
    const path = `${storeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file instanceof File ? file.type : 'image/jpeg',
    });
    if (error) throw error;
    const { data } = supabase.storage.from('photos').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadPhotoFromDataUrl(storeId: string, dataUrl: string): Promise<string> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return this.uploadPhoto(storeId, blob);
  },
};
