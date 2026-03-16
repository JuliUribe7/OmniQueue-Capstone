CREATE TABLE IF NOT EXISTS "Service" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Ticket" (
  "id"            TEXT PRIMARY KEY,
  "position"      INTEGER NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'Waiting',
  "serviceId"     TEXT NOT NULL REFERENCES "Service"("id"),
  "customerToken" TEXT,
  "phoneNumber"   TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Event" (
  "id"        TEXT PRIMARY KEY,
  "ticketId"  TEXT NOT NULL REFERENCES "Ticket"("id"),
  "type"      TEXT NOT NULL,
  "metadata"  JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
