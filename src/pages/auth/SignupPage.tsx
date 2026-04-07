import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type SignupRole = 'manager' | 'crew';

export function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [role, setRole] = useState<SignupRole>('manager');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // manager fields
  const [orgName, setOrgName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [businessType, setBusinessType] = useState('무인카페');

  // crew fields
  const [inviteCode, setInviteCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name || !email || !password) { setError('이름/이메일/비밀번호는 필수입니다'); return; }

    setLoading(true);
    try {
      if (role === 'manager') {
        if (!orgName || !storeName) { setError('조직명과 매장명을 입력해주세요'); setLoading(false); return; }
        await authService.signUpManager({ name, email, password, orgName, storeName, businessType });
      } else {
        if (!inviteCode) { setError('초대 코드를 입력해주세요'); setLoading(false); return; }
        await authService.signUpCrewWithInvite({ name, email, password, code: inviteCode });
      }

      const user = await authService.loadCurrentUser();
      if (!user) throw new Error('유저 정보를 불러오지 못했습니다');
      setUser(user);
      navigate(user.role === 'crew' ? '/crew/home' : '/manager/dashboard');
    } catch (e: any) {
      setError(e.message ?? '가입 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-center p-6 max-w-[480px] mx-auto py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-primary-600 mb-2">회원가입</h1>
        <p className="text-sm text-gray-500">StoreOps에 오신 것을 환영합니다</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">가입 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {(['manager', 'crew'] as SignupRole[]).map((r) => (
              <button key={r} onClick={() => setRole(r)} type="button"
                className={cn(
                  'h-12 rounded-xl font-semibold text-sm border transition-all',
                  role === r ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200'
                )}>
                {r === 'manager' ? '사장/관리자' : '크루 (초대코드)'}
              </button>
            ))}
          </div>
        </div>

        <input type="text" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500" />
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500" />
        <input type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500" />

        {role === 'manager' ? (
          <>
            <input type="text" placeholder="사업자/조직명 (예: 무인연구소)" value={orgName} onChange={(e) => setOrgName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500" />
            <input type="text" placeholder="매장명 (예: 강남 1호점)" value={storeName} onChange={(e) => setStoreName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500" />
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500 bg-white">
              <option>무인카페</option>
              <option>아이스크림</option>
              <option>프린트</option>
              <option>스터디카페</option>
              <option>세탁</option>
              <option>기타</option>
            </select>
          </>
        ) : (
          <input type="text" placeholder="초대 코드 (6자리)" value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())} maxLength={6}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] uppercase tracking-widest focus:outline-none focus:border-primary-500" />
        )}

        {error && <div className="text-sm text-danger-600 bg-danger-50 p-3 rounded-xl">{error}</div>}

        <Button variant="primary" size="lg" fullWidth loading={loading} onClick={submit}>
          가입하고 시작하기
        </Button>

        <p className="text-center text-sm text-gray-500 pt-2">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary-600 font-semibold">로그인</Link>
        </p>
      </div>
    </div>
  );
}
