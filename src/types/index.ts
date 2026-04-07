export type Role = 'crew' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string;
  storeName: string;
}

export type ItemStatus = 'pending' | 'ok' | 'anomaly';

export interface ChecklistItemTemplate {
  id: string;
  title: string;
  description?: string;
  require_photo: boolean;
}

export interface ChecklistItemData extends ChecklistItemTemplate {
  status: ItemStatus;
  photoUrl?: string;
  note?: string;
}

export interface Task {
  id: string;
  store_id: string;
  name: string;
  phase: 'opening' | 'regular' | 'closing';
  estimated_minutes: number;
  items: ChecklistItemTemplate[];
}

export interface TaskLog {
  id: string;
  task_id: string;
  store_id: string;
  item_id: string;
  item_title: string;
  status: 'ok' | 'anomaly';
  note?: string;
  photo_url?: string;
  performed_at: string;
  performed_by: string;
}

export interface Report {
  id: string;
  store_id: string;
  task_id: string;
  task_name: string;
  report_date: string;
  performer_id: string;
  performer_name: string;
  ok_count: number;
  anomaly_count: number;
  total_count: number;
  duration_min: number;
  created_at: string;
}

export interface Staff {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  role: Role;
  store_name: string;
}

export type IssueCategory = 'equipment' | 'leak' | 'cleanliness' | 'stock' | 'safety' | 'etc';
export type IssueSeverity = 'low' | 'normal' | 'high' | 'urgent';

export interface Issue {
  id: string;
  store_id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description?: string;
  photo_url?: string;
  status: 'open' | 'resolved';
  created_at: string;
}
