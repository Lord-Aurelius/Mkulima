ALTER TABLE users
  ADD COLUMN IF NOT EXISTS employment_start_date DATE,
  ADD COLUMN IF NOT EXISTS pay_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40) NOT NULL DEFAULT 'pending';

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS target_type VARCHAR(40) NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS target_id UUID,
  ADD COLUMN IF NOT EXISTS target_label VARCHAR(200);

ALTER TABLE crops
  ADD COLUMN IF NOT EXISTS qr_token UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE livestock
  ADD COLUMN IF NOT EXISTS qr_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS crops_qr_token_idx ON crops (qr_token);
CREATE UNIQUE INDEX IF NOT EXISTS livestock_qr_token_idx ON livestock (qr_token);

ALTER TABLE crops
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_key TEXT;

ALTER TABLE livestock
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_key TEXT;

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

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  price_monthly NUMERIC(12, 2) NOT NULL DEFAULT 0,
  has_marketplace BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE farms ADD COLUMN IF NOT EXISTS package_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'farms_package_id_fkey'
  ) THEN
    ALTER TABLE farms
      ADD CONSTRAINT farms_package_id_fkey
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;
  END IF;
END $$;

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
