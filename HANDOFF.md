# Activation ERP - 원격 작업 핸드오프

## 프로젝트 기본 정보

- **위치**: `C:\Users\woosol\OneDrive\Desktop\activation-erp`
- **스택**: Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS v4
- **DB**: Neon PostgreSQL (serverless) + Drizzle ORM
- **인증**: Better Auth v1.4.18
- **테이블**: TanStack React Table v8
- **파일 저장**: Google Drive API 연동
- **개발 서버**: `npm run dev` → `http://localhost:3000`

---

## 테스트 계정

| 역할 | 로그인 ID | 비밀번호 | 리다이렉트 |
|------|----------|----------|-----------|
| 관리자 (ADMIN) | `admin` (= admin@activation-erp.local) | `admin1234` | `/` (대시보드) |
| 거래처 (PARTNER) | `partner@dreamhigh.kr` | `partner123` | `/partner` (스프레드시트뷰) |

- PARTNER 계정은 `dream_high`, `creatoria` 두 거래처에 배정됨
- 테스트 데이터: dream_high 7건, creatoria 14건 (총 55건 중 21건 접근 가능)

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
│   │   ├── import/page.tsx             ← CSV 가져오기/내보내기 UI
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
│       ├── import/route.ts             ← CSV Import (벌크 Insert)
│       ├── export/route.ts             ← CSV Export (UTF-8 BOM)
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

## Git 상태

최근 커밋 후 세션 2-3 작업분 커밋 필요 (13 modified + 5 new files)

---

## 2026-02-26 버그 수정 및 CSV Import/Export 추가

### 버그 수정 완료
1. **PARTNER 편집 권한 수정** (`src/app/api/activations/[id]/route.ts`)
   - PARTNER_EDITABLE_FIELDS에 기본 정보 필드 추가 (customerName, usimNumber, entryDate, subscriptionType, ratePlan)
   - PARTNER_BASIC_FIELDS 세트 추가 + isLocked 체크 로직 추가
   - 잠금 상태에서 기본 정보 편집 차단

2. **partner-columns.tsx isLocked 하드코딩 수정**
   - 5개 필드 `isLocked={true}` → `isLocked={!!row.original.isLocked}` 변경
   - 이제 DB의 실제 잠금 상태에 따라 편집 가능/불가 결정됨

3. **SQL 인젝션 취약점 수정** (`src/lib/db/queries/activations.ts`)
   - getMonthlyStats, getDailyStats, getWeeklyStats에서 `sql.raw()` + 문자열 보간 제거
   - `sql` 템플릿 태그로 파라미터화된 쿼리로 변환

### CSV Import/Export 구현 완료
1. **Import API** (`src/app/api/import/route.ts`)
   - POST: `{ rows: Record<string, string>[] }` → 벌크 Insert
   - 거래처명 → ID 자동 매핑 (없으면 자동 생성)
   - 날짜 형식 변환: `25/12/03` → `2025-12-03`, `2025. 12. 18` → `2025-12-18`
   - Boolean 변환: TRUE/FALSE/완료/지로
   - activationStatus 기반 workStatus 자동 설정

2. **Export API** (`src/app/api/export/route.ts`)
   - GET: agencyId, status 쿼리 파라미터 지원
   - PARTNER 역할 시 allowedAgencies 필터링
   - UTF-8 BOM + 27개 컬럼 CSV 다운로드

3. **Import UI** (`src/app/(dashboard)/import/page.tsx`)
   - 드래그 앤 드롭 CSV 업로드
   - PapaParse 클라이언트 사이드 파싱
   - 멀티라인 헤더 자동 정규화 (서류검수 → 순서별 매핑)
   - 미리보기 테이블 (50건) + Import/Export 버튼

4. **사이드바 메뉴 추가** (`src/components/layout/sidebar.tsx`)
   - "가져오기/내보내기" 메뉴 → `/import`

### 빌드 상태
- `npm run build` 성공 (24 pages)
- 신규 패키지: papaparse, @types/papaparse

---

## 남은 작업 / 개선 후보

### 완료
- [x] 개발 서버 실행 후 API 런타임 테스트 (세션 3에서 완료)
- [x] Google Sheets HTML Import (55건 적재 완료)
- [x] Admin/Partner 로그인 검증 완료
- [x] 날짜 데이터 오류 수정 (2025-02 → 2026-02)

### 선택 (향후)
- [ ] UI E2E 브라우저 테스트
- [ ] CSV Import/Export 추가 테스트
- [ ] 거래처 "새 고객 추가" 시 agencyId 자동 배정 검증
- [ ] 모바일 반응형 (거래처 스프레드시트 뷰)
- [ ] 서류검수 상태 관리자 인라인 편집 (현재 읽기만)
- [ ] 알림 시스템 (서류 보완 요청 → 거래처 알림)

---

## 개발 명령어

```bash
npm run dev          # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run db:push      # 스키마 → DB 직접 반영
npm run db:studio    # Drizzle Studio (DB 관리 UI)
```

---

## 환경변수 (.env.local)

```
DATABASE_URL=postgresql://...@ep-muddy-poetry-a169oxq7-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_SERVICE_ACCOUNT_EMAIL=...  (Google Drive용)
GOOGLE_PRIVATE_KEY=...
GOOGLE_DRIVE_FOLDER_ID=...
```

---

## 2026-02-26 세션 2: Google Sheets HTML Import + 통합 뷰 + 대시보드 개선

### Google Sheets HTML Import (`scripts/import-sheets.mjs`)
- Google Sheets 공유 URL → HTML 파싱 → DB Insert 스크립트
- 3개 시트 Import 완료:
  - 키르기스스탄 D2,D4 - 2025-12: 39건
  - 키르기스스탄 D2,D4 - 2026-02: 14건
  - 키르기스스탄 D4 - 2026-03: 2건
- **총 55건** 데이터 DB 적재 완료

### 통합 전체데이터 뷰 (개통 관리 페이지 개선)
- 월별 퀵 필터 추가 (`/api/activations/months` 신규 API)
- Filters 컴포넌트에 월 선택 드롭다운 추가
- 거래처별 그룹 뷰 + 전체목록 뷰 토글
- 월 요약 배지 (총건수, 개통완료, 대기, 취소)

### 통합 대시보드 개선 (`/(dashboard)/page.tsx`)
- KPI 카드 4종 (총건, 대기, 개통완료, 자동이체미등록) + 클릭 드릴다운
- 일별/주별/월별 개통 추이 차트 (탭 전환)
- 거래처별 종합 현황 테이블 (11개 거래처)
- 담당자별 업무 현황 테이블
- ARC 외국인등록증 보완 패널 (긴급/기한초과 표시)

---

## 2026-02-26 세션 3: 런타임 검증 + 버그 수정

### Admin 비밀번호 리셋
- Better Auth 비밀번호 해싱: `@noble/hashes/scrypt` (N=16384, r=16, p=1, dkLen=64)
- Better Auth의 `hashPassword()` 함수 직접 사용하여 새 해시 생성
- DB 직접 업데이트 → 로그인 성공

### 날짜 데이터 오류 수정
- DOD_ON 14건의 entry_date가 2025-02-25/26으로 잘못 파싱됨 (정상: 2026-02-25/26)
- SQL로 1년 추가 수정: `UPDATE activations SET entry_date = (entry_date + INTERVAL '1 year')::date WHERE ...`
- 수정 후: 2025-12 (39건), 2026-02 (16건) = 총 55건 정상

### API 전체 검증 완료
- Dashboard API: 55건 통계, 일/주/월별 차트, 거래처별, 담당자별 모두 정상
- Activations API: 목록 조회, 월 필터, PATCH 인라인 편집, 잠금/해제 정상
- Partner 역할 필터링: dream_high(7) + creatoria(14) = 21건만 표시 정상
- Months API: 2025-12(39), 2026-02(16) 정상

### 빌드 상태
- `npm run build` 성공 (25 pages, 0 TypeScript errors)

---

## 2026-02-26 세션 4~5: 거래처 계층 구조 시스템 (대분류-중분류-소분류)

### 개요
거래처를 3단계 계층으로 분류: DOD(대분류) → 키르기스스탄/ON(중분류) → 개별 거래처(소분류)

### Phase 0: 스키마 변경
- `agency_categories` 테이블 신규 (id, name, level, parentId, sortOrder, isActive)
- `agencies` 테이블에 `majorCategory`, `mediumCategory` 컬럼 추가
- `userProfiles` 테이블에 `allowedMajorCategory`, `allowedMediumCategories` 추가
- 초기 데이터: DOD 대분류, DOD_키르기스스탄/DOD_ON 중분류
- dream_high, creatoria → DOD_키르기스스탄 매핑

### Phase 1: 백엔드 API
- `src/types/index.ts` - SessionUser 확장
- `src/lib/auth/session.ts` - 새 필드 반환
- `src/lib/db/queries/categories.ts` (신규) - getCategoryTree, getAgencyIdsByMediumCategories 등
- `src/lib/db/queries/users.ts` - resolveAllowedAgencyIds 함수
- `src/app/api/categories/route.ts` (신규) - GET: 카테고리 트리
- `src/app/api/agencies/route.ts` - 카테고리 포함 응답
- `src/app/api/activations/route.ts` - mediumCategories/majorCategory 파라미터
- `src/app/api/users/route.ts` - 카테고리 필드 저장
- `src/app/api/export/route.ts` - 대분류/중분류 CSV 컬럼
- `src/app/api/import/route.ts` - 카테고리 포함 거래처 자동 생성

### Phase 2: Partner 뷰
- `src/app/partner/page.tsx` - 중분류 체크박스 멀티셀렉트 필터
- `src/hooks/use-agency-filter.ts` - CategoryNode 타입 + 카테고리 데이터 로드

### Phase 3: Admin 뷰
- 3-1: `header.tsx` - SelectGroup 계층형 거래처 드롭다운
- 3-2: `layout.tsx` - DashboardContext에 categories, getFilterParams 추가
  - selectedAgency 인코딩: 'all' | 'major:DOD' | 'medium:DOD_ON' | 'dream_high'
- 3-3: `activations/page.tsx` - 중분류→거래처 2단계 그룹 뷰
- 3-4: `user-form.tsx` - 3가지 접근 모드(전체/카테고리/직접) + 중분류 체크박스
- 3-5: `admin/agencies/page.tsx` - 대분류/중분류 컬럼 + 수정 버튼 + AgencyForm에 categories 전달

### Phase 4: Dashboard 통계 카테고리 반영
- `src/lib/db/queries/activations.ts` - 모든 통계 함수에 agencyIds[] 파라미터 추가
- `src/app/api/dashboard/route.ts` - majorCategory/mediumCategories → agencyIds 변환 후 통계 쿼리에 전달

### Phase 5: 3단계 캐스케이딩 체크박스 멀티셀렉트 필터 (2026-02-26)

기존 단일 Select 드롭다운 → 대분류/중분류/소분류 3개 독립 드롭다운(체크박스 멀티셀렉트)으로 전면 교체.

**변경 파일:**
- `src/components/layout/cascading-filter.tsx` (신규) - 3단계 캐스케이딩 필터 UI
- `src/hooks/use-agency-filter.ts` - selectedAgency(단일) → selectedMajors/Mediums/Agencies(배열) 3개로 변경
- `src/app/(dashboard)/layout.tsx` - DashboardContext 전체 재설계 (멀티셀렉트 + getFilterParams)
- `src/components/layout/header.tsx` - Select → CascadingFilter 교체
- `src/app/api/dashboard/route.ts` - agencyIds(복수), majorCategories(복수) 파라미터 추가
- `src/app/api/activations/route.ts` - agencyIds(복수), majorCategories(복수) 파라미터 추가
- `src/app/(dashboard)/page.tsx` - selectedAgency → selectedMajors/Mediums/Agencies로 의존성 변경
- `src/app/(dashboard)/activations/page.tsx` - dashboardAgency → dashboardSelectedAgencies로 변경

**API 파라미터 체계:**
- `agencyIds` (comma-separated) - 소분류(거래처) 직접 지정
- `mediumCategories` (comma-separated) - 중분류로 필터
- `majorCategories` (comma-separated) - 대분류로 필터
- 우선순위: agencyIds > mediumCategories > majorCategories
- 기존 단수 파라미터(agencyId, majorCategory) 하위호환 유지

### Phase 5 버그 수정: neon-http ANY() 배열 직렬화 오류 (2026-02-26)

**증상**: 대분류(DOD) 선택 시 `/api/dashboard?majorCategories=DOD` → 500 에러
**원인**: `@neondatabase/serverless`의 `neon-http` 드라이버에서 raw SQL의 `ANY(${jsArray})`가
JavaScript 배열을 PostgreSQL 배열로 올바르게 직렬화하지 못함
**수정**: `src/lib/db/queries/activations.ts` - 10개 raw SQL 함수의 `ANY(${agencyIds})` →
`IN (${sql.join(...)})` 패턴으로 전면 교체. `inList()` 헬퍼 함수 추가.
**검증**: 빌드 성공 + 런타임 API 테스트 (majorCategories=DOD → 200, 21건 정상 반환)

### 빌드 상태
- `npm run build` 성공 (26 pages, 0 TypeScript errors)
- 런타임 검증 완료: dashboard/activations API - 대분류/중분류/전체 필터 모두 정상
- Plan file: `C:\Users\woosol\.claude\plans\linear-finding-eagle.md`

---

## 2026-02-27: 유심(USIM) 재고관리 시스템 구현

### 개요
업체별 유심 배정 및 재고를 자동 관리하는 시스템. 유심은 고유 일련번호를 가지며, 업체에 배정 후 고객 개통 시 자동 재고 차감.

### DB 변경
- `usims` 테이블 신규 (`src/lib/db/schema.ts`)
  - id(UUID), usimSerialNumber(UNIQUE), agencyId(FK→agencies), status, assignedDate
  - usedDate, cancelledDate, resetDate, usedActivationId(FK→activations), notes

### 상태 머신 (State Machine)
```
ASSIGNED (배정됨, 재고 O)
  → USED (개통 시 자동)
    → CANCELLED (개통취소 시 자동, 재고 X)
      → RESET_READY (관리자 수동 초기화, 재고 O)
```
- **재고 = ASSIGNED + RESET_READY**
- CANCELLED는 자동 복구 안됨 → 관리자가 "유심초기화 진행완료" 클릭 시만 RESET_READY로 전환

### API 라우트
| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/usims` | GET | 유심 목록 (agencyId/status/search 필터) |
| `/api/usims` | POST | 유심 일괄 배정 (ADMIN) |
| `/api/usims` | DELETE | 유심 일괄 삭제 (ADMIN) |
| `/api/usims/stats` | GET | 업체별 재고 통계 |
| `/api/usims/reset` | POST | CANCELLED → RESET_READY 일괄 초기화 (ADMIN) |

### Activation 연동 (`/api/activations/[id]/route.ts`)
- 개통완료 시 `usimNumber` 있으면 → 해당 유심 자동 USED
- `usimNumber` 새로 입력 + 이미 개통완료 → 자동 USED
- `activationStatus`가 "개통취소"로 변경 → 유심 CANCELLED
- 유심 연동 실패해도 개통 업데이트는 정상 처리 (non-critical)

### UI (`/admin/usims`)
3개 탭 구성:
1. **재고 현황**: 전체 요약 카드(5종) + 업체별 아코디언 테이블 (클릭 시 유심 리스트 펼침)
2. **유심 배정**: 업체 선택 + 범위지정(1300141~1300150) 또는 직접입력 + 일괄 배정
3. **취소/초기화 관리**: CANCELLED 유심 목록 + 체크박스 선택 + "유심초기화 진행완료" 버튼

### 사이드바
- 관리 섹션에 "유심 관리" 메뉴 추가 (CardSim 아이콘)

### 권한
- ADMIN/SUB_ADMIN: 전체 관리 (배정, 삭제, 초기화)
- PARTNER/GUEST: 자기 업체 유심만 조회

### 빌드 상태
- `npm run build` 성공 (30 pages, 0 TypeScript errors)
- Vercel 배포 완료
