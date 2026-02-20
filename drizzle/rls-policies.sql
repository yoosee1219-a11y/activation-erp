-- =============================================
-- Activation ERP - RLS Policies
-- Neon PostgreSQL에서 직접 실행
-- =============================================

-- 참고: Neon은 Supabase와 달리 auth.user_id() 같은 내장 함수가 없으므로
-- 애플리케이션 레벨에서 RLS를 시뮬레이션합니다.
-- 대신 session 변수를 사용하여 current_user_id를 설정합니다.

-- 헬퍼 함수: 현재 세션의 사용자 ID 조회
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
  SELECT current_setting('app.current_user_id', true);
$$ LANGUAGE sql STABLE;

-- 헬퍼 함수: 현재 사용자의 역할 조회
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = current_user_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 헬퍼 함수: 현재 사용자의 허용 에이전시 조회
CREATE OR REPLACE FUNCTION get_allowed_agencies() RETURNS TEXT[] AS $$
  SELECT allowed_agencies FROM user_profiles WHERE id = current_user_id();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 헬퍼 함수: 에이전시 접근 가능 여부 확인
CREATE OR REPLACE FUNCTION can_access_agency(agency TEXT) RETURNS BOOLEAN AS $$
  SELECT
    get_user_role() = 'ADMIN'
    OR 'ALL' = ANY(get_allowed_agencies())
    OR agency = ANY(get_allowed_agencies());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- activations RLS
-- =============================================
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activations_select" ON activations
  FOR SELECT USING (can_access_agency(agency_id));

CREATE POLICY "activations_insert" ON activations
  FOR INSERT WITH CHECK (can_access_agency(agency_id));

CREATE POLICY "activations_update" ON activations
  FOR UPDATE USING (can_access_agency(agency_id));

CREATE POLICY "activations_delete" ON activations
  FOR DELETE USING (get_user_role() = 'ADMIN');

-- =============================================
-- document_files RLS
-- =============================================
ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs_select" ON document_files
  FOR SELECT USING (can_access_agency(agency_id));

CREATE POLICY "docs_insert" ON document_files
  FOR INSERT WITH CHECK (can_access_agency(agency_id));

CREATE POLICY "docs_delete" ON document_files
  FOR DELETE USING (get_user_role() IN ('ADMIN', 'SUB_ADMIN'));
