import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksService } from '@/services/tasks.service';
import { reportsService } from '@/services/reports.service';
import { useAuthStore } from '@/store/authStore';
import { Task, TaskLog, ChecklistItemData, IssueCategory } from '@/types';
import { ChecklistItem } from '@/components/ChecklistItem';
import { PhotoUploader } from '@/components/PhotoUploader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const categories: { value: IssueCategory; icon: string; label: string }[] = [
  { value: 'equipment', icon: '🔧', label: '기기' },
  { value: 'leak', icon: '💧', label: '누수' },
  { value: 'cleanliness', icon: '🗑', label: '청결' },
  { value: 'stock', icon: '📦', label: '재고' },
  { value: 'safety', icon: '⚡', label: '안전' },
  { value: 'etc', icon: '···', label: '기타' },
];

export function ChecklistPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [task, setTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [startedAt] = useState<number>(Date.now());

  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [showDecision, setShowDecision] = useState(false);
  const [showAnomaly, setShowAnomaly] = useState(false);
  const [anomalyCategory, setAnomalyCategory] = useState<IssueCategory | null>(null);
  const [anomalyNote, setAnomalyNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    (async () => {
      if (!taskId) return;
      setLoading(true);
      try {
        const t = await tasksService.getById(taskId);
        const l = await tasksService.getTodayLogs(taskId);
        setTask(t);
        setLogs(l);
      } catch (e: any) {
        alert('불러오기 실패: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId]);

  const items: ChecklistItemData[] = useMemo(() => {
    if (!task) return [];
    const byItem = new Map(logs.map((l) => [l.item_id, l]));
    return task.items.map((it) => {
      const log = byItem.get(it.id);
      return {
        ...it,
        status: log ? log.status : 'pending',
        photoUrl: log?.photo_url,
        note: log?.note,
      };
    });
  }, [task, logs]);

  const currentItem = items.find((i) => i.status === 'pending');
  const done = items.filter((i) => i.status !== 'pending').length;
  const total = items.length;
  const progress = total > 0 ? (done / total) * 100 : 0;
  const allDone = total > 0 && done === total;

  // Auto-create report when all done (once)
  useEffect(() => {
    (async () => {
      if (!allDone || reported || !task || !user) return;
      setReported(true);
      const ok = items.filter((i) => i.status === 'ok').length;
      const anomaly = items.filter((i) => i.status === 'anomaly').length;
      const duration = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      try {
        await reportsService.create({
          store_id: user.storeId,
          task_id: task.id,
          task_name: task.name,
          performer_id: user.id,
          performer_name: user.name,
          ok_count: ok,
          anomaly_count: anomaly,
          total_count: total,
          duration_min: duration,
        });
      } catch (e) {
        console.error('report create failed', e);
      }
    })();
  }, [allDone, reported, task, user, items, total, startedAt]);

  if (loading) return <div className="p-6 text-center text-gray-500">불러오는 중...</div>;
  if (!task || !user) return <div className="p-6 text-center text-gray-500">점검을 찾을 수 없습니다.</div>;

  if (allDone) {
    const ok = items.filter((i) => i.status === 'ok').length;
    const anomaly = items.filter((i) => i.status === 'anomaly').length;
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">{task.name} 완료!</h1>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 w-full max-w-sm my-6 space-y-2 text-left">
          <div className="flex justify-between"><span className="text-gray-500">완료 항목</span><span className="font-bold">{ok}개</span></div>
          <div className="flex justify-between"><span className="text-gray-500">이상 항목</span><span className="font-bold text-danger-600">{anomaly}개</span></div>
          <div className="flex justify-between"><span className="text-gray-500">전체</span><span className="font-bold">{total}개</span></div>
        </div>
        <p className="text-sm text-success-600 font-semibold mb-6">✓ 사장님께 자동 보고됐어요</p>
        <Button variant="primary" size="lg" fullWidth className="max-w-sm" onClick={() => navigate('/crew/home')}>
          홈으로
        </Button>
      </div>
    );
  }

  const handlePhoto = (url: string) => {
    setPhotoDataUrl(url);
    setShowDecision(true);
  };

  const persistLog = async (status: 'ok' | 'anomaly', note?: string) => {
    if (!currentItem || !task || !user || !photoDataUrl) return;
    setSubmitting(true);
    try {
      const photoUrl = await tasksService.uploadPhotoFromDataUrl(user.storeId, photoDataUrl);
      const newLog = await tasksService.logItem({
        task_id: task.id,
        store_id: user.storeId,
        item_id: currentItem.id,
        item_title: currentItem.title,
        status,
        note,
        photo_url: photoUrl,
      });
      setLogs((prev) => [...prev, newLog]);
      setPhotoDataUrl(undefined);
      setShowDecision(false);
      setShowAnomaly(false);
      setAnomalyCategory(null);
      setAnomalyNote('');
    } catch (e: any) {
      alert('저장 실패: ' + (e.message ?? 'error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full pb-6">
      <header className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => {
            if (confirm('정말 나가시겠어요? 진행상황은 저장돼요')) navigate('/crew/home');
          }} className="text-2xl text-gray-600">←</button>
          <h1 className="flex-1 text-base font-bold text-gray-900">{task.name}</h1>
          <span className="text-sm font-bold text-gray-600">{done}/{total}</span>
        </div>
        <div className="px-4 pb-3"><ProgressBar value={progress} color="success" /></div>
      </header>

      <div className="px-4 pt-4">
        {items.map((item, idx) => (
          <ChecklistItem key={item.id} index={idx + 1} item={item} isCurrent={item.id === currentItem?.id}>
            {item.id === currentItem?.id && (
              <PhotoUploader onCapture={handlePhoto} value={photoDataUrl} />
            )}
          </ChecklistItem>
        ))}
      </div>

      {showDecision && !showAnomaly && (
        <div className="fixed inset-0 bg-black/30 z-20 flex items-end" onClick={() => !submitting && setShowDecision(false)}>
          <div className="w-full bg-white rounded-t-3xl p-6 max-w-[480px] mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold text-gray-900 mb-5 text-center">
              {currentItem?.title} 상태는?
            </h2>
            <div className="space-y-3">
              <Button variant="primary" size="lg" fullWidth loading={submitting} onClick={() => persistLog('ok')}>✅ 정상 완료</Button>
              <Button variant="danger" size="lg" fullWidth disabled={submitting} onClick={() => setShowAnomaly(true)}>⚠️ 이상 있음</Button>
            </div>
          </div>
        </div>
      )}

      {showAnomaly && (
        <div className="fixed inset-0 bg-black/30 z-20 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 max-w-[480px] mx-auto max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold text-gray-900 mb-4">무엇이 문제인가요?</h2>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {categories.map((c) => (
                <button key={c.value} onClick={() => setAnomalyCategory(c.value)}
                  className={cn(
                    'aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1',
                    anomalyCategory === c.value ? 'border-danger-500 bg-danger-50' : 'border-gray-200 bg-white'
                  )}>
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-semibold text-gray-700">{c.label}</span>
                </button>
              ))}
            </div>
            <textarea value={anomalyNote} onChange={(e) => setAnomalyNote(e.target.value)}
              placeholder="메모 (선택)" rows={3}
              className="w-full p-4 rounded-xl border border-gray-200 text-[15px] resize-none focus:outline-none focus:border-primary-500 mb-4" />
            <Button variant="danger" size="lg" fullWidth disabled={!anomalyCategory} loading={submitting}
              onClick={() => persistLog('anomaly', anomalyCategory ? `[${anomalyCategory}] ${anomalyNote}` : anomalyNote)}>
              이상 보고하고 계속
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
