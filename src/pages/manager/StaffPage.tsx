import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { storesService } from '@/services/stores.service';
import { invitesService } from '@/services/invites.service';
import { Staff } from '@/types';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function StaffPage() {
  const user = useAuthStore((s) => s.user);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await storesService.listMembers(user.storeId);
        setStaff(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const openInvite = async () => {
    if (!user) return;
    setShowInvite(true);
    setCreatingInvite(true);
    try {
      const code = await invitesService.createInvite(user.storeId, 'crew');
      setInviteCode(code);
    } catch (e: any) {
      alert('초대 코드 생성 실패: ' + e.message);
      setShowInvite(false);
    } finally {
      setCreatingInvite(false);
    }
  };

  return (
    <div className="min-h-full pb-20">
      <header className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">직원 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">전체 {staff.length}명</p>
        </div>
        <Button size="sm" onClick={openInvite}>+ 초대</Button>
      </header>

      <div className="px-4 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
        ) : staff.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-lg">👤</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">{s.name}</p>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                  s.role === 'manager' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                )}>
                  {s.role === 'manager' ? '관리자' : '크루'}
                </span>
              </div>
              {s.email && <p className="text-xs text-gray-400 mt-0.5">{s.email}</p>}
            </div>
          </div>
        ))}
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/30 z-20 flex items-end" onClick={() => setShowInvite(false)}>
          <div className="w-full bg-white rounded-t-3xl p-6 max-w-[480px] mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold text-gray-900 mb-5 text-center">크루 초대</h2>
            <div className="bg-gray-50 rounded-2xl p-8 mb-5 text-center">
              <p className="text-xs text-gray-500 mb-2">초대 코드</p>
              <p className="text-4xl font-black text-primary-600 tracking-widest">
                {creatingInvite ? '...' : inviteCode ?? '-'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Button variant="secondary" disabled={!inviteCode}
                onClick={() => { if (inviteCode) { navigator.clipboard?.writeText(inviteCode); alert('복사되었습니다'); } }}>
                📋 코드 복사
              </Button>
              <Button variant="secondary" onClick={() => setShowInvite(false)}>닫기</Button>
            </div>
            <p className="text-xs text-gray-400 text-center">이 코드는 24시간 유효합니다</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
