# Activation ERP - 원격 작업 핸드오프

## 프로젝트 기본 정보

- **위치**: `C:\Users\woosol\OneDrive\Desktop\activation-erp`
- **스택**: Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS v4
- **DB**: Neon PostgreSQL (serverless) + Drizzle ORM
- **인증**: Better Auth v1.4.18
- **테이블**: TanStack React Table v8
- **파일 저장**: Google Drive API 연동
- **개발 서버**: `npm run dev` → `http://localhost:3001`

---

## 테스트 계정

| 역할 | 로그인 ID | 비밀번호 | 리다이렉트 |
|------|----------|----------|-----------|
| 관리자 (ADMIN) | `admin@activation-erp.kr` | (기존 비밀번호) | `/` (대시보드) |
| 거래처 (PARTNER) | `partner@dreamhigh.kr` | `partner123` | `/partner` (스프레드시트뷰) |

- PARTNER 계정은 `dream_high`, `creatoria` 두 거래처에 배정됨
- 테스트 데이터: dream_high 4건, creatoria 3건 (총 31건 중)

---

## 라우트 구조

```
/login                    → 로그인 (역할별 자동 리다이렉트)
/(dashboard)/             → 관리자 대시보드 (ADMIN, SUB_ADMIN)
/(dashboard)/activations  → 개통 관리 목록
/(dashboard)/activations/new → 새 개통 등록
/(dashboard)/activations/[id] → 개통 상세/수정
/(dashboard)/admin/users  → 사용자 관리
/(dashboard)/admin/agencies → 거래처 관리
/(dashboard)/admin/settings → 설정 (상태값 커스텀)
/partner                  → 거래처 전용 스프레드시트 뷰 (PARTNER, GUEST)
```

---

## 최근 구현 완료 (Phase 1~4: 거래처/관리자 화면 분리)

### Phase 1: 기반
- DB: `activations` 테이블에 `isLocked`, `lockedAt`, `lockedBy` 추가
- 미들웨어: `user-role` httpOnly 쿠키 기반 역할 리다이렉트
- 로그인: 역할 확인 후 PARTNER→`/partner`, ADMIN→`/`
- 대시보드 layout: 클라이언트 사이드 fallback 리다이렉트

### Phase 2: 거래처 전용 페이지
- `src/app/partner/layout.tsx` - 심플 헤더 (사이드바 없음)
- `src/app/partner/page.tsx` - 스프레드시트형 메인 (요약 카드 + 테이블)
- `src/components/partner/editable-cell.tsx` - 인라인 편집 (text/date/select)
- `src/components/partner/file-cell.tsx` - 다중 파일 업로드 (Google Drive) + 링크 입력
- `src/components/partner/partner-columns.tsx` - 거래처 전용 컬럼 정의

### Phase 3: 잠금 + API 보안
- PATCH API: PARTNER 편집 가능 필드 allowlist 적용
- 잠긴 행 PARTNER 수정 시 403
- 관리자 `개통완료` 설정 시 자동 잠금
- `POST /api/activations/lock` 일괄 잠금/해제 API
- 관리자 테이블에 잠금 토글 컬럼

### Phase 4: 마무리
- 로그아웃 시 `user-role` 쿠키 정리 (`POST /api/auth/logout`)
- 타입 일관성 (`isLocked` 필드)

### 추가 수정 (오늘)
- **ID 자유 형태**: `@`가 없으면 자동으로 `@activation-erp.local` 붙여서 처리
  - 로그인 페이지: `type="text"`, 라벨 "로그인 ID"
  - 사용자 생성 API: 자동 이메일 변환
- **PW 자유 설정**: Better Auth `minPasswordLength: 4`, 프론트엔드 `minLength={4}`
- **다중 파일 업로드**: `<input multiple>`, 각각 Google Drive 업로드, JSON 배열로 저장
- **No. 컬럼**: 관리자/거래처 양쪽 테이블 첫 열에 순번 (1,2,3...) 추가

---

## 컬럼 권한 매트릭스

| 컬럼 | 거래처 | 관리자 |
|------|:------:|:------:|
| No. | 읽기 | 읽기 |
| customerName | **편집** | 편집 |
| usimNumber | **편집** | 편집 |
| entryDate | **편집** | 편집 |
| subscriptionType | **편집** | 편집 |
| ratePlan | **편집** | 편집 |
| 서류 4종 (파일/링크) | **편집** | 편집 |
| newPhoneNumber | 읽기 | 편집 |
| subscriptionNumber | 읽기 | 편집 |
| virtualAccount | 읽기 | 편집 |
| activationDate | 읽기 | 편집 |
| activationStatus | 읽기 | 편집 |
| personInCharge | 읽기 | 편집 |
| workStatus | 읽기 | 편집 |
| 서류검수 4종 | 읽기 | 편집 |
| 잠긴 행 전체 | 읽기만 | 편집 |

---

## 주요 파일 맵

```
src/
├── app/
│   ├── (auth)/login/page.tsx           ← 로그인 (자유 ID + 자동변환)
│   ├── (dashboard)/
│   │   ├── layout.tsx                  ← 사이드바 + PARTNER fallback 리다이렉트
│   │   ├── page.tsx                    ← 관리자 대시보드
│   │   ├── activations/page.tsx        ← 개통 관리 (잠금토글 포함)
│   │   └── admin/users/page.tsx        ← 사용자 관리
│   ├── partner/
│   │   ├── layout.tsx                  ← 거래처 심플 헤더
│   │   └── page.tsx                    ← 거래처 스프레드시트 뷰
│   └── api/
│       ├── activations/[id]/route.ts   ← PATCH 보안 (필드 allowlist + 잠금)
│       ├── activations/lock/route.ts   ← 일괄 잠금/해제
│       ├── activations/route.ts        ← GET (다중 거래처 inArray 지원)
│       ├── auth/logout/route.ts        ← httpOnly 쿠키 삭제
│       ├── files/upload/route.ts       ← Google Drive 업로드
│       ├── users/route.ts              ← POST (자유 ID→이메일 변환)
│       └── users/me/route.ts           ← user-role 쿠키 설정
├── components/
│   ├── activations/
│   │   ├── columns.tsx                 ← 관리자 컬럼 (No. + 잠금토글)
│   │   └── data-table.tsx              ← 공통 테이블 (컬럼 드롭다운)
│   ├── partner/
│   │   ├── editable-cell.tsx           ← 인라인 편집 셀
│   │   ├── file-cell.tsx               ← 다중 파일/링크 셀
│   │   └── partner-columns.tsx         ← 거래처 컬럼 (No. 포함)
│   ├── admin/user-form.tsx             ← 사용자 생성/수정 (자유 ID)
│   └── layout/sidebar.tsx              ← 관리자 사이드바
├── lib/
│   ├── auth/server.ts                  ← Better Auth 설정 (minPW: 4)
│   ├── db/schema.ts                    ← DB 스키마 (isLocked 등)
│   └── db/queries/activations.ts       ← agencyIds inArray 지원
├── middleware.ts                       ← 역할 기반 라우트 보호
└── types/index.ts                      ← UserRole, SessionUser 등
```

---

## Git 상태 (커밋 안 됨)

```
최근 커밋: bfb33fd chore: DB 연결 설정 및 테스트 스크립트 추가
미커밋 변경: 21개 파일 수정, +1601 / -140 줄
새 파일: partner/, lock API, logout API, settings API, partner 컴포넌트들
```

**커밋 전 `drizzle-kit push`는 이미 완료됨** (isLocked 등 DB 반영 완료)

---

## 남은 작업 / 개선 후보

### 필수
- [ ] 거래처 로그인 후 실제 화면 UI/UX 테스트
- [ ] 파일 업로드 실제 동작 테스트 (Google Drive 연동)
- [ ] 잠금 기능 E2E 테스트 (관리자 잠금 → 거래처 편집 불가)
- [ ] 미커밋 변경사항 정리 후 커밋

### 선택
- [ ] 거래처 "새 고객 추가" 시 agencyId 자동 배정 검증
- [ ] 모바일 반응형 (거래처 스프레드시트 뷰)
- [ ] 서류검수 상태 관리자 인라인 편집 (현재 읽기만)
- [ ] 대시보드 통계 거래처별 필터링
- [ ] 알림 시스템 (서류 보완 요청 → 거래처 알림)

---

## 개발 명령어

```bash
npm run dev          # 개발 서버 (localhost:3001)
npm run build        # 프로덕션 빌드
npm run db:push      # 스키마 → DB 직접 반영
npm run db:studio    # Drizzle Studio (DB 관리 UI)
```

---

## 환경변수 (.env.local)

```
DATABASE_URL=postgresql://...@ep-muddy-poetry-a169oxq7-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001
GOOGLE_SERVICE_ACCOUNT_EMAIL=...  (Google Drive용)
GOOGLE_PRIVATE_KEY=...
GOOGLE_DRIVE_FOLDER_ID=...
```
