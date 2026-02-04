-- This migration was pulled from remote
-- HTTP extension and types already exist from previous migrations
-- Skipping duplicate creation

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."http_header" AS ("field" character varying, "value" character varying);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."http_request" AS ("method" http_method, "uri" character varying, "headers" http_header[], "content_type" character varying, "content" character varying);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."http_response" AS ("status" integer, "content_type" character varying, "headers" http_header[], "content" character varying);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


