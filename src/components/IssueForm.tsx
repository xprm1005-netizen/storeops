import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IssueCategory, IssueSeverity } from '@/types';
import { issuesService } from '@/services/issues.service';
import { tasksService } from '@/services/tasks.service';
import { useAuthStore } from '@/store/authStore';
import { Button } from './ui/Button';
import { PhotoUploader } from './PhotoUploader';
import { cn } from '@/lib/cn';

const categories: { value: IssueCategory; icon: string; label: string }[] = [
  { value: 'equipment', icon: '🔧', label: '기기' },
  { value: 'leak', icon: '💧', label: '누수' },
  { value: 'cleanliness', icon: '🗑', label: '청결' },
  { value: 'stock', icon: '📦', label: '재고' },
  { value: 'safety', icon: '⚡', label: '안전' },
  { value: 'etc', icon: '···', label: '기타' },
];

const severities: { value: IssueSeverity; label: string }[] = [
  { value: 'low', label: '낮음' },
  { value: 'normal', label: '보통' },
  { value: 'high', label: '높음' },
  { value: 'urgent', label: '긴급' },
];

export function IssueForm() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [severity, setSeverity] = useState<IssueSeverity>('normal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = category && title.trim() && photoDataUrl && !submitting;

  const submit = async () => {
    if (!canSubmit || !category || !user) return;
    setSubmitting(true);
    try {
      const photoUrl = photoDataUrl
        ? await tasksService.uploadPhotoFromDataUrl(user.storeId, photoDataUrl)
        : undefined;
      await issuesService.create({
        store_id: user.storeId,
        category, severity,
        title: title.trim(),
        description: description.trim() || undefined,
        photo_url: photoUrl,
      });
      alert('특이사항이 보고되었습니다.');
      navigate('/crew/home');
    } catch (e: any) {
      alert('보고 실패: ' + (e.message ?? '알 수 없는 오류'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">어떤 문제인가요?</h3>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={cn(
                'aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all',
                category === c.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
              )}>
              <span className="text-2xl">{c.icon}</span>
              <span className="text-xs font-semibold text-gray-700">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">얼마나 급한가요?</h3>
        <div className="flex gap-2">
          {severities.map((s) => (
            <button key={s.value} onClick={() => setSeverity(s.value)}
              className={cn(
                'flex-1 h-11 rounded-full text-sm font-semibold border transition-all',
                severity === s.value
                  ? s.value === 'urgent'
                    ? 'bg-danger-500 text-white border-danger-500'
                    : 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200'
              )}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">제목</h3>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 커피머신 누수"
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500" />
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">사진 (필수)</h3>
        <PhotoUploader onCapture={setPhotoDataUrl} value={photoDataUrl} />
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">설명 (선택)</h3>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="무슨 일이 있었나요?" rows={3}
          className="w-full p-4 rounded-xl border border-gray-200 text-[15px] resize-none focus:outline-none focus:border-primary-500" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 max-w-[480px] mx-auto">
        <Button variant={severity === 'urgent' ? 'danger' : 'primary'} size="lg" fullWidth
          disabled={!canSubmit} loading={submitting} onClick={submit}>
          {severity === 'urgent' ? '긴급으로 보고' : '보고하기'}
        </Button>
      </div>
    </div>
  );
}
