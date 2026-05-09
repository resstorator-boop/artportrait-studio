-- ArtPortrait Studio — initial schema
-- Generated manually; regenerate with: npm run db:generate

CREATE TYPE "credit_transaction_type" AS ENUM (
  'purchase',
  'usage',
  'refund',
  'bonus'
);

CREATE TYPE "session_status" AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
);

CREATE TYPE "webhook_source" AS ENUM (
  'stripe',
  'clerk'
);

CREATE TABLE "users" (
  "id"                 uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_id"           text        NOT NULL UNIQUE,
  "email"              text        NOT NULL,
  "name"               text,
  "credits_balance"    integer     NOT NULL DEFAULT 0,
  "stripe_customer_id" text,
  "created_at"         timestamp   NOT NULL DEFAULT now(),
  "updated_at"         timestamp   NOT NULL DEFAULT now()
);

CREATE TABLE "styles" (
  "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug"              text        NOT NULL UNIQUE,
  "name"              text        NOT NULL,
  "description"       text,
  "credit_cost"       integer     NOT NULL,
  "is_active"         boolean     NOT NULL DEFAULT true,
  "preview_image_url" text,
  "sort_order"        integer     NOT NULL DEFAULT 0,
  "created_at"        timestamp   NOT NULL DEFAULT now(),
  "updated_at"        timestamp   NOT NULL DEFAULT now()
);

CREATE TABLE "sessions" (
  "id"               uuid            PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"          uuid            NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "style_id"         uuid            NOT NULL REFERENCES "styles"("id"),
  "status"           session_status  NOT NULL DEFAULT 'pending',
  "credits_charged"  integer         NOT NULL,
  "input_image_key"  text,
  "prompt"           text,
  "error_message"    text,
  "inngest_run_id"   text,
  "created_at"       timestamp       NOT NULL DEFAULT now(),
  "updated_at"       timestamp       NOT NULL DEFAULT now()
);

CREATE TABLE "outputs" (
  "id"          uuid      PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id"  uuid      NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "r2_key"      text      NOT NULL,
  "public_url"  text      NOT NULL,
  "width"       integer,
  "height"      integer,
  "is_primary"  boolean   NOT NULL DEFAULT false,
  "created_at"  timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "credit_transactions" (
  "id"                       uuid                    PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"                  uuid                    NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount"                   integer                 NOT NULL,
  "type"                     credit_transaction_type NOT NULL,
  "description"              text,
  "stripe_payment_intent_id" text,
  "session_id"               uuid                    REFERENCES "sessions"("id") ON DELETE SET NULL,
  "created_at"               timestamp               NOT NULL DEFAULT now()
);

CREATE TABLE "webhook_events" (
  "id"           text          PRIMARY KEY NOT NULL,
  "source"       webhook_source NOT NULL,
  "type"         text          NOT NULL,
  "payload"      jsonb         NOT NULL,
  "processed_at" timestamp,
  "error"        text,
  "created_at"   timestamp     NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX "sessions_user_id_idx"              ON "sessions"("user_id");
CREATE INDEX "sessions_status_idx"               ON "sessions"("status");
CREATE INDEX "outputs_session_id_idx"            ON "outputs"("session_id");
CREATE INDEX "credit_transactions_user_id_idx"   ON "credit_transactions"("user_id");
CREATE INDEX "credit_transactions_session_id_idx" ON "credit_transactions"("session_id");
