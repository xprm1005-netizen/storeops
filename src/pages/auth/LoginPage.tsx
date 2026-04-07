import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요'); return; }
    setLoading(true);
    try {
      await authService.signIn(email, password);
      const user = await authService.loadCurrentUser();
      if (!user) {
        setError('소속된 매장이 없습니다. 가입을 다시 진행해주세요.');
        return;
      }
      setUser(user);
      navigate(user.role === 'crew' ? '/crew/home' : '/manager/dashboard');
    } catch (e: any) {
      setError(e.message ?? '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-center p-6 max-w-[480px] mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-primary-600 mb-2">StoreOps</h1>
        <p className="text-sm text-gray-500">무인매장 운영의 모든 것</p>
      </div>

      <div className="space-y-4">
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500" />
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] focus:outline-none focus:border-primary-500" />

        {error && (
          <div className="text-sm text-danger-600 bg-danger-50 p-3 rounded-xl">{error}</div>
        )}

        <Button variant="primary" size="lg" fullWidth loading={loading} onClick={submit}>로그인</Button>

        <p className="text-center text-sm text-gray-500 pt-2">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-primary-600 font-semibold">가입하기</Link>
        </p>
      </div>
    </div>
  );
}
