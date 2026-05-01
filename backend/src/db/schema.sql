CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('creator', 'admin', 'worker');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  location VARCHAR(255) NOT NULL,
  land_size NUMERIC(12, 2) NOT NULL CHECK (land_size >= 0),
  package_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE farms ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS logo_storage_key TEXT;

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  price_monthly NUMERIC(12, 2) NOT NULL DEFAULT 0,
  has_marketplace BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'farms_package_id_fkey'
  ) THEN
    ALTER TABLE farms
      ADD CONSTRAINT farms_package_id_fkey
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  duty VARCHAR(160),
  qr_token UUID UNIQUE,
  employment_start_date DATE,
  pay_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin_per_farm
  ON users (farm_id)
  WHERE role = 'admin' AND farm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE INDEX IF NOT EXISTS users_farm_idx ON users (farm_id);

CREATE TABLE IF NOT EXISTS worker_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  due_date DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'assigned',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_assignments_worker_idx ON worker_assignments (worker_id, due_date DESC);
CREATE INDEX IF NOT EXISTS worker_assignments_farm_idx ON worker_assignments (farm_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(40) NOT NULL DEFAULT 'general',
  target_id UUID,
  target_label VARCHAR(200),
  task TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_logs_worker_idx ON daily_logs (worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS daily_logs_farm_idx ON daily_logs (farm_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_log_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS daily_log_images_log_idx ON daily_log_images (log_id);

CREATE TABLE IF NOT EXISTS uploaded_assets (
  storage_key TEXT PRIMARY KEY,
  content_type VARCHAR(120) NOT NULL,
  image_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farm_activity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES daily_logs(id) ON DELETE SET NULL,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(40) NOT NULL,
  target_id UUID,
  target_label VARCHAR(200),
  record_type VARCHAR(40) NOT NULL,
  material_type VARCHAR(80) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity >= 0),
  unit VARCHAR(40) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS farm_activity_records_farm_idx ON farm_activity_records (farm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS farm_activity_records_worker_idx ON farm_activity_records (worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS farm_activity_records_target_idx ON farm_activity_records (target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  type VARCHAR(160) NOT NULL,
  qr_token UUID NOT NULL DEFAULT gen_random_uuid(),
  image_url TEXT,
  storage_key TEXT,
  planting_date DATE NOT NULL,
  expected_harvest_date DATE NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity >= 0),
  expected_yield NUMERIC(12, 2) NOT NULL CHECK (expected_yield >= 0),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crops_farm_harvest_idx ON crops (farm_id, expected_harvest_date);
CREATE UNIQUE INDEX IF NOT EXISTS crops_qr_token_idx ON crops (qr_token);

CREATE TABLE IF NOT EXISTS livestock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  type VARCHAR(160) NOT NULL,
  qr_token UUID NOT NULL DEFAULT gen_random_uuid(),
  image_url TEXT,
  storage_key TEXT,
  count INTEGER NOT NULL CHECK (count >= 0),
  production_metric VARCHAR(80) NOT NULL,
  latest_metric_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS livestock_farm_idx ON livestock (farm_id);
CREATE UNIQUE INDEX IF NOT EXISTS livestock_qr_token_idx ON livestock (qr_token);

CREATE TABLE IF NOT EXISTS livestock_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livestock_id UUID NOT NULL REFERENCES livestock(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metric_value NUMERIC(12, 2) NOT NULL CHECK (metric_value >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS livestock_updates_livestock_idx ON livestock_updates (livestock_id, created_at DESC);

CREATE TABLE IF NOT EXISTS education_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  storage_key TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS education_posts_farm_idx ON education_posts (farm_id, created_at DESC);

CREATE TABLE IF NOT EXISTS signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_name VARCHAR(160) NOT NULL,
  requested_email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  requested_farm_name VARCHAR(160) NOT NULL,
  requested_location VARCHAR(255) NOT NULL,
  requested_land_size NUMERIC(12, 2) NOT NULL CHECK (requested_land_size >= 0),
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS signup_requests_status_idx ON signup_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  contact_person VARCHAR(160) NOT NULL,
  location VARCHAR(255) NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  phone_number VARCHAR(40) NOT NULL,
  image_url TEXT,
  storage_key TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketplace_ads_farm_idx ON marketplace_ads (farm_id, created_at DESC);

CREATE TABLE IF NOT EXISTS finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  entry_type VARCHAR(20) NOT NULL,
  category VARCHAR(120) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  entry_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS finance_entries_farm_idx ON finance_entries (farm_id, entry_date DESC, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS farms_set_updated_at ON farms;
CREATE TRIGGER farms_set_updated_at
BEFORE UPDATE ON farms
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS crops_set_updated_at ON crops;
CREATE TRIGGER crops_set_updated_at
BEFORE UPDATE ON crops
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS livestock_set_updated_at ON livestock;
CREATE TRIGGER livestock_set_updated_at
BEFORE UPDATE ON livestock
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
