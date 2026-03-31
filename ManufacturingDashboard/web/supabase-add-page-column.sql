-- 이미 테이블을 생성한 경우, 이것만 SQL Editor에서 실행
ALTER TABLE posts ADD COLUMN IF NOT EXISTS page TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_posts_page_created ON posts (page, created_at DESC);
