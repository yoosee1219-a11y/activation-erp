-- =============================================
-- Activation ERP - 초기 시드 데이터
-- =============================================

-- 에이전시 (거래처/유학원)
INSERT INTO agencies (id, name, contact_name, contact_phone) VALUES
  ('dream_high', 'Dream High', NULL, NULL),
  ('creatoria', 'Creatoria', NULL, NULL),
  ('sj_intl', 'SJ International', NULL, NULL),
  ('edu_korea', 'Edu Korea', NULL, NULL),
  ('global_study', 'Global Study', NULL, NULL),
  ('k_academy', 'K Academy', NULL, NULL),
  ('seoul_edu', 'Seoul Education', NULL, NULL),
  ('han_bridge', 'Han Bridge', NULL, NULL),
  ('asia_connect', 'Asia Connect', NULL, NULL),
  ('smart_edu', 'Smart Education', NULL, NULL),
  ('best_korea', 'Best Korea', NULL, NULL),
  ('new_wave', 'New Wave', NULL, NULL),
  ('top_class', 'Top Class', NULL, NULL),
  ('future_edu', 'Future Education', NULL, NULL),
  ('bright_path', 'Bright Path', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 상태값 설정
INSERT INTO activation_status_config (status_key, status_label, color, sort_order) VALUES
  ('pending', '대기', '#f59e0b', 1),
  ('completed', '개통완료', '#10b981', 2),
  ('cancelled', '개통취소', '#ef4444', 3)
ON CONFLICT (status_key) DO NOTHING;

-- ADMIN 계정은 Better Auth를 통해 회원가입 후
-- user_profiles에 직접 INSERT해야 합니다.
-- 예시:
-- INSERT INTO user_profiles (id, email, name, role, allowed_agencies)
-- VALUES ('<better-auth-user-id>', 'admin@activation-erp.kr', '관리자', 'ADMIN', ARRAY['ALL']);
