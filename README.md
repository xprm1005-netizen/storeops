# StoreOps — 무인매장 운영관리 SaaS (Supabase 연동판)

React + TypeScript + Vite + TailwindCSS + Zustand + **Supabase**

## 1. Supabase 프로젝트 세팅

### 1-1. 프로젝트 생성
1. https://supabase.com 에서 새 프로젝트 생성
2. **Settings → API** 에서 `Project URL` 과 `anon public` 키 복사

### 1-2. 데이터베이스 마이그레이션
1. Supabase 대시보드 → **SQL Editor**
2. `supabase/migrations/0001_init.sql` 전체를 복사해 붙여넣고 **Run**
3. 테이블·RLS 정책·RPC 함수가 한 번에 생성됨

### 1-3. Storage 버킷 생성 (사진 업로드용)
1. **Storage → New bucket**
2. 이름: `photos`, **Public bucket 체크**
3. **Policies → New policy → "For full customization"** 로 아래 두 개 생성:

```sql
-- 인증된 사용자 업로드 허용
create policy "authenticated upload photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photos');

-- 공개 읽기 허용
create policy "public read photos"
on storage.objects for select
to public
using (bucket_id = 'photos');
```

### 1-4. 인증 설정 (중요)
- **Authentication → Providers → Email**: 활성화
- **개발 편의를 위해**: Authentication → Providers → Email → **"Confirm email" 체크 해제**
  (체크되어 있으면 가입 직후 세션이 없어 매장 생성 RPC가 실패함. 실서비스에서는 다시 켜야 함)

## 2. 환경 변수

프로젝트 루트에 `.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 내용:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## 3. 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173

## 4. 사용 플로우

### 사장님 (최초 가입)
1. `/signup` → **"사장/관리자"** 선택
2. 이름/이메일/비밀번호/조직명/매장명/업종 입력
3. 가입과 동시에 조직·매장·기본 템플릿 2종(오픈/마감) 자동 생성
4. `/manager/dashboard` 로 이동

### 크루 초대
1. 사장 앱 → **직원 관리 → + 초대** → 6자리 코드 발급
2. 코드를 크루에게 전달

### 크루 (초대 코드로 가입)
1. `/signup` → **"크루 (초대코드)"** 선택
2. 이름/이메일/비밀번호/초대코드 입력
3. 가입과 동시에 해당 매장에 자동 배정
4. `/crew/home` 으로 이동

### 체크리스트 실행
1. 홈에서 활성 태스크의 "시작하기" 탭
2. 각 항목: 📷 사진 촬영 → 바텀시트 → 정상/이상 2택
3. 모든 항목 완료 시 자동으로 리포트 생성 → 사장 대시보드에 실시간 반영

## 5. 파일 구조

```
storeops/
├── .env.example
├── supabase/
│   └── migrations/0001_init.sql   # DB 스키마 + RLS + RPC
├── src/
│   ├── services/                  # Supabase API 레이어
│   │   ├── supabase.ts             # 클라이언트
│   │   ├── auth.service.ts         # 가입/로그인
│   │   ├── tasks.service.ts        # 태스크/로그/사진 업로드
│   │   ├── reports.service.ts
│   │   ├── issues.service.ts
│   │   ├── stores.service.ts
│   │   └── invites.service.ts
│   ├── store/
│   │   └── authStore.ts            # Zustand (user, loading)
│   ├── components/
│   │   ├── ui/ (Button, Card, ProgressBar)
│   │   ├── TaskCard, ChecklistItem, PhotoUploader,
│   │   ├── ReportCard, IssueForm, BottomNav
│   ├── pages/
│   │   ├── auth/ (Login, Signup)
│   │   ├── crew/ (Home, Checklist, IssueNew)
│   │   └── manager/ (Dashboard, Reports, Staff)
│   ├── types/
│   ├── lib/cn.ts
│   ├── App.tsx                     # onAuthStateChange + 역할 가드
│   └── main.tsx
└── package.json
```

## 6. 주요 아키텍처 포인트

### 인증 상태 동기화
- `App.tsx` 에서 `supabase.auth.onAuthStateChange` 리스너 등록
- 로그인/로그아웃/토큰 갱신 시 `authStore` 자동 업데이트
- 새로고침해도 Supabase가 세션을 로컬스토리지에 유지

### 역할 기반 라우팅
- `Protected` 컴포넌트가 `user.role` 을 검사
- 크루가 `/manager/*` 접근 시 자기 홈으로 리다이렉트 (반대도 동일)
- **이중 안전장치**: 프론트 가드 + DB RLS 정책 (`my_store_ids()` 헬퍼 기반)

### 원자적 가입 (SECURITY DEFINER RPC)
- `create_store_for_user` / `join_store_by_code` 를 Postgres 함수로 구현
- 프로필·조직·매장·멤버십·기본 템플릿 생성을 한 트랜잭션에 처리
- RLS 우회가 필요한 초기 생성 작업을 안전하게 수행

### 사진 업로드
- 카메라 실촬영만 허용 (`capture="environment"`)
- `FileReader` 로 DataURL 생성 → `tasks.service.uploadPhotoFromDataUrl()` 이 Blob 변환 후 Storage에 업로드
- 반환된 Public URL 을 task_logs 에 저장

## 7. 데이터 흐름 예시 (체크리스트 1개 항목 완료)

```
[크루]
 사진 촬영
   ↓
 PhotoUploader → onCapture(dataUrl)
   ↓
 tasksService.uploadPhotoFromDataUrl(storeId, dataUrl)
   → supabase.storage.from('photos').upload(...)
   → publicUrl 반환
   ↓
 tasksService.logItem({task_id, item_id, status, photo_url, ...})
   → insert into task_logs (RLS: store_id ∈ my_store_ids)
   ↓
 로컬 state 업데이트 → 다음 항목으로 자동 이동

[마지막 항목 완료 시]
 reportsService.create({...})
   → insert into reports
   ↓
[사장]
 Dashboard 리프레시 시 reportsService.listToday(storeId) 로 즉시 보임
```

## 8. 다음 단계

- **TanStack Query** 로 서버 상태 캐싱 (현재는 직접 useEffect)
- **Supabase Realtime** 구독으로 대시보드 실시간 갱신
- **이미지 압축** (1200×1600, JPEG 80%) - 업로드 전 처리
- **오프라인 큐** (IndexedDB) - 업로드 실패 시 재시도
- **토스페이먼츠 빌링** 연동
- **PWA** 설치 가능 (manifest + service worker)
