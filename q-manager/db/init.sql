-- Better Auth tables
CREATE TABLE IF NOT EXISTS "user" (
  "id"            TEXT PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"        TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "token"     TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                     TEXT PRIMARY KEY,
  "accountId"              TEXT NOT NULL,
  "providerId"             TEXT NOT NULL,
  "userId"                 TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken"            TEXT,
  "refreshToken"           TEXT,
  "idToken"                TEXT,
  "accessTokenExpiresAt"   TIMESTAMPTZ,
  "refreshTokenExpiresAt"  TIMESTAMPTZ,
  "scope"                  TEXT,
  "password"               TEXT,
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Business table (links a user to a business profile)
CREATE TABLE IF NOT EXISTS "Business" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"             TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "name"               TEXT NOT NULL,
  "type"               TEXT,
  "stripeCustomerId"    TEXT,
  "subscriptionStatus"  TEXT NOT NULL DEFAULT 'inactive',
  "plan"                TEXT NOT NULL DEFAULT 'basic',
  "notificationChannel" TEXT NOT NULL DEFAULT 'sms',
  "googleTokens"        TEXT,
  "smsSentTotal"        INTEGER NOT NULL DEFAULT 0,
  "emailSentTotal"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service table (belongs to a business)
CREATE TABLE IF NOT EXISTS "Service" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "avgTime"    INTEGER NOT NULL DEFAULT 15,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Ticket table (queue entry)
CREATE TABLE IF NOT EXISTS "Ticket" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "position"      INTEGER NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'Waiting',
  "serviceId"     TEXT NOT NULL REFERENCES "Service"("id") ON DELETE CASCADE,
  "staffId"       TEXT REFERENCES "Staff"("id") ON DELETE SET NULL,
  "customerName"  TEXT,
  "customerEmail" TEXT,
  "customerToken" TEXT,
  "phoneNumber"   TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "staffId" TEXT REFERENCES "Staff"("id") ON DELETE SET NULL;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "allowStaffSelection" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "smsSentTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "emailSentTotal" INTEGER NOT NULL DEFAULT 0;

-- Staff table
CREATE TABLE IF NOT EXISTS "Staff" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "role"       TEXT NOT NULL DEFAULT 'Staff',
  "phone"      TEXT,
  "photoUrl"   TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointment table
CREATE TABLE IF NOT EXISTS "Appointment" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId"   TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "serviceId"    TEXT REFERENCES "Service"("id"),
  "staffId"      TEXT REFERENCES "Staff"("id"),
  "customerName"  TEXT NOT NULL,
  "customerEmail" TEXT,
  "phoneNumber"   TEXT NOT NULL,
  "date"          TEXT NOT NULL,
  "time"         TEXT NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Event" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticketId"  TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "type"      TEXT NOT NULL,
  "metadata"  JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Review" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId"   TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "ticketId"     TEXT REFERENCES "Ticket"("id") ON DELETE SET NULL,
  "customerName" TEXT,
  "rating"       INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "comment"      TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "FunnelEvent" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "type"       TEXT NOT NULL,
  "metadata"   JSONB,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
