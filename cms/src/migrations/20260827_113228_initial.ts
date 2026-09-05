import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE SCHEMA IF NOT EXISTS "payload";
  CREATE TYPE "payload"."_locales" AS ENUM('de', 'en');
  CREATE TYPE "payload"."enum_pages_blocks_hero_quick_access_cards_variant" AS ENUM('brand', 'accent');
  CREATE TYPE "payload"."enum_pages_blocks_hero_quick_access_cards_position" AS ENUM('left', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_hero_quick_access_cards_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_pages_blocks_hero_primary_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_bento_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_prog_programs_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_prog_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_chal_challenges_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_chal_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_topics_topics_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_topics_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_prtnrs_logos_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_prtnrs_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_eco_layers_position" AS ENUM('left', 'right');
  CREATE TYPE "payload"."enum_eco_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_evt_events_color_theme" AS ENUM('pink', 'blue', 'light-blue');
  CREATE TYPE "payload"."enum_evt_events_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_evt_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_evt_selection_mode" AS ENUM('automatic', 'manual');
  CREATE TYPE "payload"."enum_cta_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__pages_v_blocks_hero_quick_access_cards_variant" AS ENUM('brand', 'accent');
  CREATE TYPE "payload"."enum__pages_v_blocks_hero_quick_access_cards_position" AS ENUM('left', 'right');
  CREATE TYPE "payload"."enum__pages_v_blocks_hero_quick_access_cards_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__pages_v_blocks_hero_primary_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__bento_v_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__prog_v_programs_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__prog_v_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__chal_v_challenges_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__chal_v_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__topics_v_topics_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__topics_v_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__prtnrs_v_logos_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__prtnrs_v_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__eco_v_layers_position" AS ENUM('left', 'right');
  CREATE TYPE "payload"."enum__eco_v_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__evt_v_events_color_theme" AS ENUM('pink', 'blue', 'light-blue');
  CREATE TYPE "payload"."enum__evt_v_events_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__evt_v_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__evt_v_selection_mode" AS ENUM('automatic', 'manual');
  CREATE TYPE "payload"."enum__cta_v_cta_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__pages_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "payload"."enum_partners_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__partners_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__partners_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "payload"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__events_v_published_locale" AS ENUM('de', 'en');
  CREATE TYPE "payload"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TYPE "payload"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "payload"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "payload"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  CREATE TYPE "payload"."enum_navigation_menu_items_dropdown_items_sub_items_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_navigation_menu_items_dropdown_items_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_navigation_menu_items_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_navigation_logo_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_navigation_cta_button_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "payload"."enum_navigation_cta_button_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_site_settings_footer_columns_links_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_site_settings_footer_legal_links_link_type" AS ENUM('internal', 'external');
  CREATE TYPE "payload"."enum_site_settings_footer_social_links_link_type" AS ENUM('internal', 'external');
  CREATE TABLE "payload"."pages_blocks_hero_quick_access_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"variant" "payload"."enum_pages_blocks_hero_quick_access_cards_variant",
  	"position" "payload"."enum_pages_blocks_hero_quick_access_cards_position",
  	"link_type" "payload"."enum_pages_blocks_hero_quick_access_cards_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"headline" jsonb,
  	"description" varchar,
  	"primary_cta_text" varchar,
  	"text_color" varchar,
  	"background_color" varchar,
  	"primary_cta_link_type" "payload"."enum_pages_blocks_hero_primary_cta_link_type" DEFAULT 'internal',
  	"primary_cta_link_page_id" integer,
  	"primary_cta_link_url" varchar,
  	"primary_cta_link_anchor" varchar,
  	"primary_cta_link_new_tab" boolean DEFAULT false,
  	"hero_image_id" integer,
  	"hero_image_tablet_id" integer,
  	"hero_image_mobile_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."bento_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"icon_id" integer,
  	"background_color" varchar,
  	"text_color" varchar
  );
  
  CREATE TABLE "payload"."bento" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum_bento_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."prog_programs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"stage_label" varchar,
  	"background_color" varchar,
  	"image_id" integer,
  	"image_tablet_id" integer,
  	"image_mobile_id" integer,
  	"link_type" "payload"."enum_prog_programs_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."prog" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"section_id" varchar,
  	"cta_link_type" "payload"."enum_prog_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."chal_challenges" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"category" varchar,
  	"description" jsonb,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum_chal_challenges_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"featured_image_id" integer,
  	"featured_image_tablet_id" integer,
  	"featured_image_mobile_id" integer
  );
  
  CREATE TABLE "payload"."chal" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum_chal_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."why_tab1_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"icon_id" integer
  );
  
  CREATE TABLE "payload"."why_tab2_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"icon_id" integer
  );
  
  CREATE TABLE "payload"."why" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"subtitle" varchar,
  	"description" varchar,
  	"background_style" varchar,
  	"tab1_label" varchar,
  	"tab2_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."topics_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"card_title" varchar,
  	"card_description" varchar,
  	"link_text" varchar,
  	"accent_color" varchar,
  	"link_type" "payload"."enum_topics_topics_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"image_id" integer,
  	"image_tablet_id" integer,
  	"image_mobile_id" integer
  );
  
  CREATE TABLE "payload"."topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"subtitle" varchar,
  	"description" jsonb,
  	"cta_text" varchar,
  	"slider_label" varchar,
  	"cta_link_type" "payload"."enum_topics_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."prtnrs_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"logo_id" integer,
  	"partner_id" integer,
  	"link_type" "payload"."enum_prtnrs_logos_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."prtnrs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"cta_text" varchar,
  	"row_count" varchar,
  	"background_color" varchar,
  	"cta_link_type" "payload"."enum_prtnrs_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."eco_layers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"position" "payload"."enum_eco_layers_position",
  	"text_color" varchar,
  	"background_color" varchar
  );
  
  CREATE TABLE "payload"."eco" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"text_color" varchar,
  	"cta_link_type" "payload"."enum_eco_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."evt_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"date" varchar,
  	"location" varchar,
  	"hosted_by" varchar,
  	"tags" varchar,
  	"color_theme" "payload"."enum_evt_events_color_theme",
  	"cta_text" varchar,
  	"image_id" integer,
  	"link_type" "payload"."enum_evt_events_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."evt" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"subtitle" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum_evt_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"max_events" numeric,
  	"selection_mode" "payload"."enum_evt_selection_mode" DEFAULT 'automatic',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum_cta_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"section_id" varchar,
  	"image_fit" varchar,
  	"image_position" varchar,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"seo_og_image_id" integer,
  	"slug" varchar,
  	"storyblok_uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."pages_locales" (
  	"title" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "payload"."_locales",
  	"events_id" integer
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_hero_quick_access_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"variant" "payload"."enum__pages_v_blocks_hero_quick_access_cards_variant",
  	"position" "payload"."enum__pages_v_blocks_hero_quick_access_cards_position",
  	"link_type" "payload"."enum__pages_v_blocks_hero_quick_access_cards_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"headline" jsonb,
  	"description" varchar,
  	"primary_cta_text" varchar,
  	"text_color" varchar,
  	"background_color" varchar,
  	"primary_cta_link_type" "payload"."enum__pages_v_blocks_hero_primary_cta_link_type" DEFAULT 'internal',
  	"primary_cta_link_page_id" integer,
  	"primary_cta_link_url" varchar,
  	"primary_cta_link_anchor" varchar,
  	"primary_cta_link_new_tab" boolean DEFAULT false,
  	"hero_image_id" integer,
  	"hero_image_tablet_id" integer,
  	"hero_image_mobile_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_bento_v_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"icon_id" integer,
  	"background_color" varchar,
  	"text_color" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_bento_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum__bento_v_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_prog_v_programs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"stage_label" varchar,
  	"background_color" varchar,
  	"image_id" integer,
  	"image_tablet_id" integer,
  	"image_mobile_id" integer,
  	"link_type" "payload"."enum__prog_v_programs_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_prog_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"section_id" varchar,
  	"cta_link_type" "payload"."enum__prog_v_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_chal_v_challenges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"category" varchar,
  	"description" jsonb,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum__chal_v_challenges_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"featured_image_id" integer,
  	"featured_image_tablet_id" integer,
  	"featured_image_mobile_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_chal_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum__chal_v_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_why_v_tab1_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"icon_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_why_v_tab2_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"icon_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_why_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"subtitle" varchar,
  	"description" varchar,
  	"background_style" varchar,
  	"tab1_label" varchar,
  	"tab2_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_topics_v_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"card_title" varchar,
  	"card_description" varchar,
  	"link_text" varchar,
  	"accent_color" varchar,
  	"link_type" "payload"."enum__topics_v_topics_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"image_id" integer,
  	"image_tablet_id" integer,
  	"image_mobile_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_topics_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"subtitle" varchar,
  	"description" jsonb,
  	"cta_text" varchar,
  	"slider_label" varchar,
  	"cta_link_type" "payload"."enum__topics_v_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_prtnrs_v_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"logo_id" integer,
  	"partner_id" integer,
  	"link_type" "payload"."enum__prtnrs_v_logos_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_prtnrs_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"cta_text" varchar,
  	"row_count" varchar,
  	"background_color" varchar,
  	"cta_link_type" "payload"."enum__prtnrs_v_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_eco_v_layers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"position" "payload"."enum__eco_v_layers_position",
  	"text_color" varchar,
  	"background_color" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_eco_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"text_color" varchar,
  	"cta_link_type" "payload"."enum__eco_v_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_evt_v_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"date" varchar,
  	"location" varchar,
  	"hosted_by" varchar,
  	"tags" varchar,
  	"color_theme" "payload"."enum__evt_v_events_color_theme",
  	"cta_text" varchar,
  	"image_id" integer,
  	"link_type" "payload"."enum__evt_v_events_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_evt_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"headline" varchar,
  	"subtitle" varchar,
  	"description" varchar,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum__evt_v_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"max_events" numeric,
  	"selection_mode" "payload"."enum__evt_v_selection_mode" DEFAULT 'automatic',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_cta_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible" boolean DEFAULT true,
  	"tagline" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"cta_text" varchar,
  	"cta_link_type" "payload"."enum__cta_v_cta_link_type" DEFAULT 'internal',
  	"cta_link_page_id" integer,
  	"cta_link_url" varchar,
  	"cta_link_anchor" varchar,
  	"cta_link_new_tab" boolean DEFAULT false,
  	"section_id" varchar,
  	"image_fit" varchar,
  	"image_position" varchar,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_seo_og_image_id" integer,
  	"version_slug" varchar,
  	"version_storyblok_uuid" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "payload"."enum__pages_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "payload"."_pages_v_locales" (
  	"version_title" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "payload"."_locales",
  	"events_id" integer
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_tablet_url" varchar,
  	"sizes_tablet_width" numeric,
  	"sizes_tablet_height" numeric,
  	"sizes_tablet_mime_type" varchar,
  	"sizes_tablet_filesize" numeric,
  	"sizes_tablet_filename" varchar,
  	"sizes_desktop_url" varchar,
  	"sizes_desktop_width" numeric,
  	"sizes_desktop_height" numeric,
  	"sizes_desktop_mime_type" varchar,
  	"sizes_desktop_filesize" numeric,
  	"sizes_desktop_filename" varchar
  );
  
  CREATE TABLE "payload"."media_locales" (
  	"alt" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."partners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"logo_id" integer,
  	"website" varchar,
  	"storyblok_uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_partners_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."partners_locales" (
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."_partners_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_logo_id" integer,
  	"version_website" varchar,
  	"version_storyblok_uuid" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__partners_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "payload"."enum__partners_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "payload"."_partners_v_locales" (
  	"version_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"date" varchar,
  	"location" varchar,
  	"hosted_by" varchar,
  	"tags" varchar,
  	"image_id" integer,
  	"storyblok_uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."events_locales" (
  	"title" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_date" varchar,
  	"version_location" varchar,
  	"version_hosted_by" varchar,
  	"version_tags" varchar,
  	"version_image_id" integer,
  	"version_storyblok_uuid" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "payload"."enum__events_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "payload"."_events_v_locales" (
  	"version_title" varchar,
  	"version_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "payload"."enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "payload"."enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "payload"."enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload"."payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "payload"."enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"media_id" integer,
  	"partners_id" integer,
  	"events_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."navigation_menu_items_dropdown_items_sub_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_navigation_menu_items_dropdown_items_sub_items_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."navigation_menu_items_dropdown_items_sub_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."navigation_menu_items_dropdown_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_navigation_menu_items_dropdown_items_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."navigation_menu_items_dropdown_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."navigation_menu_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_navigation_menu_items_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"has_dropdown" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."navigation_menu_items_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"logo_text" varchar,
  	"sticky" boolean DEFAULT true,
  	"show_language_switcher" boolean DEFAULT true,
  	"logo_link_type" "payload"."enum_navigation_logo_link_type" DEFAULT 'internal',
  	"logo_link_page_id" integer,
  	"logo_link_url" varchar,
  	"logo_link_anchor" varchar,
  	"logo_link_new_tab" boolean DEFAULT false,
  	"cta_button_variant" "payload"."enum_navigation_cta_button_variant" DEFAULT 'primary',
  	"cta_button_link_type" "payload"."enum_navigation_cta_button_link_type" DEFAULT 'internal',
  	"cta_button_link_page_id" integer,
  	"cta_button_link_url" varchar,
  	"cta_button_link_anchor" varchar,
  	"cta_button_link_new_tab" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."navigation_locales" (
  	"cta_button_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."site_settings_footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_site_settings_footer_columns_links_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."site_settings_footer_columns_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."site_settings_footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."site_settings_footer_columns_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."site_settings_footer_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_site_settings_footer_legal_links_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."site_settings_footer_legal_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."site_settings_footer_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_label" varchar,
  	"link_type" "payload"."enum_site_settings_footer_social_links_link_type" DEFAULT 'internal',
  	"link_page_id" integer,
  	"link_url" varchar,
  	"link_anchor" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_navbar" boolean DEFAULT true,
  	"show_footer" boolean DEFAULT true,
  	"hide_navbar_routes" varchar,
  	"hide_footer_routes" varchar,
  	"footer_logo_id" integer,
  	"footer_copyright_text" varchar,
  	"newsletter_show" boolean DEFAULT true,
  	"newsletter_embed_code" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."site_settings_locales" (
  	"newsletter_title" varchar,
  	"newsletter_text" varchar,
  	"newsletter_button_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload"."pages_blocks_hero_quick_access_cards" ADD CONSTRAINT "pages_blocks_hero_quick_access_cards_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero_quick_access_cards" ADD CONSTRAINT "pages_blocks_hero_quick_access_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_primary_cta_link_page_id_pages_id_fk" FOREIGN KEY ("primary_cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_hero_image_tablet_id_media_id_fk" FOREIGN KEY ("hero_image_tablet_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_hero_image_mobile_id_media_id_fk" FOREIGN KEY ("hero_image_mobile_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."bento_cards" ADD CONSTRAINT "bento_cards_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."bento_cards" ADD CONSTRAINT "bento_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."bento"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."bento" ADD CONSTRAINT "bento_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."bento" ADD CONSTRAINT "bento_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."prog_programs" ADD CONSTRAINT "prog_programs_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prog_programs" ADD CONSTRAINT "prog_programs_image_tablet_id_media_id_fk" FOREIGN KEY ("image_tablet_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prog_programs" ADD CONSTRAINT "prog_programs_image_mobile_id_media_id_fk" FOREIGN KEY ("image_mobile_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prog_programs" ADD CONSTRAINT "prog_programs_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prog_programs" ADD CONSTRAINT "prog_programs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."prog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."prog" ADD CONSTRAINT "prog_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prog" ADD CONSTRAINT "prog_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."chal_challenges" ADD CONSTRAINT "chal_challenges_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chal_challenges" ADD CONSTRAINT "chal_challenges_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chal_challenges" ADD CONSTRAINT "chal_challenges_featured_image_tablet_id_media_id_fk" FOREIGN KEY ("featured_image_tablet_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chal_challenges" ADD CONSTRAINT "chal_challenges_featured_image_mobile_id_media_id_fk" FOREIGN KEY ("featured_image_mobile_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chal_challenges" ADD CONSTRAINT "chal_challenges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."chal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."chal" ADD CONSTRAINT "chal_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."chal" ADD CONSTRAINT "chal_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."why_tab1_cards" ADD CONSTRAINT "why_tab1_cards_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."why_tab1_cards" ADD CONSTRAINT "why_tab1_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."why"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."why_tab2_cards" ADD CONSTRAINT "why_tab2_cards_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."why_tab2_cards" ADD CONSTRAINT "why_tab2_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."why"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."why" ADD CONSTRAINT "why_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."topics_topics" ADD CONSTRAINT "topics_topics_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."topics_topics" ADD CONSTRAINT "topics_topics_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."topics_topics" ADD CONSTRAINT "topics_topics_image_tablet_id_media_id_fk" FOREIGN KEY ("image_tablet_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."topics_topics" ADD CONSTRAINT "topics_topics_image_mobile_id_media_id_fk" FOREIGN KEY ("image_mobile_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."topics_topics" ADD CONSTRAINT "topics_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."topics" ADD CONSTRAINT "topics_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."topics" ADD CONSTRAINT "topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."prtnrs_logos" ADD CONSTRAINT "prtnrs_logos_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prtnrs_logos" ADD CONSTRAINT "prtnrs_logos_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "payload"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prtnrs_logos" ADD CONSTRAINT "prtnrs_logos_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prtnrs_logos" ADD CONSTRAINT "prtnrs_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."prtnrs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."prtnrs" ADD CONSTRAINT "prtnrs_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prtnrs" ADD CONSTRAINT "prtnrs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."eco_layers" ADD CONSTRAINT "eco_layers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."eco"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."eco" ADD CONSTRAINT "eco_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."eco" ADD CONSTRAINT "eco_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."evt_events" ADD CONSTRAINT "evt_events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."evt_events" ADD CONSTRAINT "evt_events_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."evt_events" ADD CONSTRAINT "evt_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."evt"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."evt" ADD CONSTRAINT "evt_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."evt" ADD CONSTRAINT "evt_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."cta" ADD CONSTRAINT "cta_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."cta" ADD CONSTRAINT "cta_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."cta" ADD CONSTRAINT "cta_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."cta" ADD CONSTRAINT "cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_hero_quick_access_cards" ADD CONSTRAINT "_pages_v_blocks_hero_quick_access_cards_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_hero_quick_access_cards" ADD CONSTRAINT "_pages_v_blocks_hero_quick_access_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_primary_cta_link_page_id_pages_id_fk" FOREIGN KEY ("primary_cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_hero_image_tablet_id_media_id_fk" FOREIGN KEY ("hero_image_tablet_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_hero_image_mobile_id_media_id_fk" FOREIGN KEY ("hero_image_mobile_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_bento_v_cards" ADD CONSTRAINT "_bento_v_cards_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_bento_v_cards" ADD CONSTRAINT "_bento_v_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_bento_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_bento_v" ADD CONSTRAINT "_bento_v_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_bento_v" ADD CONSTRAINT "_bento_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_prog_v_programs" ADD CONSTRAINT "_prog_v_programs_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prog_v_programs" ADD CONSTRAINT "_prog_v_programs_image_tablet_id_media_id_fk" FOREIGN KEY ("image_tablet_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prog_v_programs" ADD CONSTRAINT "_prog_v_programs_image_mobile_id_media_id_fk" FOREIGN KEY ("image_mobile_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prog_v_programs" ADD CONSTRAINT "_prog_v_programs_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prog_v_programs" ADD CONSTRAINT "_prog_v_programs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_prog_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_prog_v" ADD CONSTRAINT "_prog_v_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prog_v" ADD CONSTRAINT "_prog_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_chal_v_challenges" ADD CONSTRAINT "_chal_v_challenges_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_chal_v_challenges" ADD CONSTRAINT "_chal_v_challenges_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_chal_v_challenges" ADD CONSTRAINT "_chal_v_challenges_featured_image_tablet_id_media_id_fk" FOREIGN KEY ("featured_image_tablet_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_chal_v_challenges" ADD CONSTRAINT "_chal_v_challenges_featured_image_mobile_id_media_id_fk" FOREIGN KEY ("featured_image_mobile_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_chal_v_challenges" ADD CONSTRAINT "_chal_v_challenges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_chal_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_chal_v" ADD CONSTRAINT "_chal_v_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_chal_v" ADD CONSTRAINT "_chal_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_why_v_tab1_cards" ADD CONSTRAINT "_why_v_tab1_cards_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_why_v_tab1_cards" ADD CONSTRAINT "_why_v_tab1_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_why_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_why_v_tab2_cards" ADD CONSTRAINT "_why_v_tab2_cards_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_why_v_tab2_cards" ADD CONSTRAINT "_why_v_tab2_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_why_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_why_v" ADD CONSTRAINT "_why_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_topics_v_topics" ADD CONSTRAINT "_topics_v_topics_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_topics_v_topics" ADD CONSTRAINT "_topics_v_topics_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_topics_v_topics" ADD CONSTRAINT "_topics_v_topics_image_tablet_id_media_id_fk" FOREIGN KEY ("image_tablet_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_topics_v_topics" ADD CONSTRAINT "_topics_v_topics_image_mobile_id_media_id_fk" FOREIGN KEY ("image_mobile_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_topics_v_topics" ADD CONSTRAINT "_topics_v_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_topics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_topics_v" ADD CONSTRAINT "_topics_v_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_topics_v" ADD CONSTRAINT "_topics_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_prtnrs_v_logos" ADD CONSTRAINT "_prtnrs_v_logos_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prtnrs_v_logos" ADD CONSTRAINT "_prtnrs_v_logos_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "payload"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prtnrs_v_logos" ADD CONSTRAINT "_prtnrs_v_logos_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prtnrs_v_logos" ADD CONSTRAINT "_prtnrs_v_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_prtnrs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_prtnrs_v" ADD CONSTRAINT "_prtnrs_v_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_prtnrs_v" ADD CONSTRAINT "_prtnrs_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_eco_v_layers" ADD CONSTRAINT "_eco_v_layers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_eco_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_eco_v" ADD CONSTRAINT "_eco_v_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_eco_v" ADD CONSTRAINT "_eco_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_evt_v_events" ADD CONSTRAINT "_evt_v_events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_evt_v_events" ADD CONSTRAINT "_evt_v_events_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_evt_v_events" ADD CONSTRAINT "_evt_v_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_evt_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_evt_v" ADD CONSTRAINT "_evt_v_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_evt_v" ADD CONSTRAINT "_evt_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_cta_v" ADD CONSTRAINT "_cta_v_cta_link_page_id_pages_id_fk" FOREIGN KEY ("cta_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_cta_v" ADD CONSTRAINT "_cta_v_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_cta_v" ADD CONSTRAINT "_cta_v_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_cta_v" ADD CONSTRAINT "_cta_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v" ADD CONSTRAINT "_pages_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."partners_locales" ADD CONSTRAINT "partners_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_partners_v" ADD CONSTRAINT "_partners_v_parent_id_partners_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_partners_v" ADD CONSTRAINT "_partners_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_partners_v_locales" ADD CONSTRAINT "_partners_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_partners_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."events" ADD CONSTRAINT "events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_events_v" ADD CONSTRAINT "_events_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_events_v_locales" ADD CONSTRAINT "_events_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partners_fk" FOREIGN KEY ("partners_id") REFERENCES "payload"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "payload"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items_dropdown_items_sub_items" ADD CONSTRAINT "navigation_menu_items_dropdown_items_sub_items_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items_dropdown_items_sub_items" ADD CONSTRAINT "navigation_menu_items_dropdown_items_sub_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation_menu_items_dropdown_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items_dropdown_items_sub_items_locales" ADD CONSTRAINT "navigation_menu_items_dropdown_items_sub_items_locales_pa_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation_menu_items_dropdown_items_sub_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items_dropdown_items" ADD CONSTRAINT "navigation_menu_items_dropdown_items_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items_dropdown_items" ADD CONSTRAINT "navigation_menu_items_dropdown_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation_menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items_dropdown_items_locales" ADD CONSTRAINT "navigation_menu_items_dropdown_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation_menu_items_dropdown_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items" ADD CONSTRAINT "navigation_menu_items_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items" ADD CONSTRAINT "navigation_menu_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_menu_items_locales" ADD CONSTRAINT "navigation_menu_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation_menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation" ADD CONSTRAINT "navigation_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation" ADD CONSTRAINT "navigation_logo_link_page_id_pages_id_fk" FOREIGN KEY ("logo_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation" ADD CONSTRAINT "navigation_cta_button_link_page_id_pages_id_fk" FOREIGN KEY ("cta_button_link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation_locales" ADD CONSTRAINT "navigation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_columns_links" ADD CONSTRAINT "site_settings_footer_columns_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_columns_links" ADD CONSTRAINT "site_settings_footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings_footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_columns_links_locales" ADD CONSTRAINT "site_settings_footer_columns_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings_footer_columns_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_columns" ADD CONSTRAINT "site_settings_footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_columns_locales" ADD CONSTRAINT "site_settings_footer_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings_footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_legal_links" ADD CONSTRAINT "site_settings_footer_legal_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_legal_links" ADD CONSTRAINT "site_settings_footer_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_legal_links_locales" ADD CONSTRAINT "site_settings_footer_legal_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings_footer_legal_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_social_links" ADD CONSTRAINT "site_settings_footer_social_links_link_page_id_pages_id_fk" FOREIGN KEY ("link_page_id") REFERENCES "payload"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_footer_social_links" ADD CONSTRAINT "site_settings_footer_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_settings" ADD CONSTRAINT "site_settings_footer_logo_id_media_id_fk" FOREIGN KEY ("footer_logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_quick_access_cards_order_idx" ON "payload"."pages_blocks_hero_quick_access_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_quick_access_cards_parent_id_idx" ON "payload"."pages_blocks_hero_quick_access_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_quick_access_cards_locale_idx" ON "payload"."pages_blocks_hero_quick_access_cards" USING btree ("_locale");
  CREATE INDEX "pages_blocks_hero_quick_access_cards_link_link_page_idx" ON "payload"."pages_blocks_hero_quick_access_cards" USING btree ("link_page_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "payload"."pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "payload"."pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "payload"."pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_locale_idx" ON "payload"."pages_blocks_hero" USING btree ("_locale");
  CREATE INDEX "pages_blocks_hero_primary_cta_link_primary_cta_link_page_idx" ON "payload"."pages_blocks_hero" USING btree ("primary_cta_link_page_id");
  CREATE INDEX "pages_blocks_hero_hero_image_idx" ON "payload"."pages_blocks_hero" USING btree ("hero_image_id");
  CREATE INDEX "pages_blocks_hero_hero_image_tablet_idx" ON "payload"."pages_blocks_hero" USING btree ("hero_image_tablet_id");
  CREATE INDEX "pages_blocks_hero_hero_image_mobile_idx" ON "payload"."pages_blocks_hero" USING btree ("hero_image_mobile_id");
  CREATE INDEX "bento_cards_order_idx" ON "payload"."bento_cards" USING btree ("_order");
  CREATE INDEX "bento_cards_parent_id_idx" ON "payload"."bento_cards" USING btree ("_parent_id");
  CREATE INDEX "bento_cards_locale_idx" ON "payload"."bento_cards" USING btree ("_locale");
  CREATE INDEX "bento_cards_icon_idx" ON "payload"."bento_cards" USING btree ("icon_id");
  CREATE INDEX "bento_order_idx" ON "payload"."bento" USING btree ("_order");
  CREATE INDEX "bento_parent_id_idx" ON "payload"."bento" USING btree ("_parent_id");
  CREATE INDEX "bento_path_idx" ON "payload"."bento" USING btree ("_path");
  CREATE INDEX "bento_locale_idx" ON "payload"."bento" USING btree ("_locale");
  CREATE INDEX "bento_cta_link_cta_link_page_idx" ON "payload"."bento" USING btree ("cta_link_page_id");
  CREATE INDEX "prog_programs_order_idx" ON "payload"."prog_programs" USING btree ("_order");
  CREATE INDEX "prog_programs_parent_id_idx" ON "payload"."prog_programs" USING btree ("_parent_id");
  CREATE INDEX "prog_programs_locale_idx" ON "payload"."prog_programs" USING btree ("_locale");
  CREATE INDEX "prog_programs_image_idx" ON "payload"."prog_programs" USING btree ("image_id");
  CREATE INDEX "prog_programs_image_tablet_idx" ON "payload"."prog_programs" USING btree ("image_tablet_id");
  CREATE INDEX "prog_programs_image_mobile_idx" ON "payload"."prog_programs" USING btree ("image_mobile_id");
  CREATE INDEX "prog_programs_link_link_page_idx" ON "payload"."prog_programs" USING btree ("link_page_id");
  CREATE INDEX "prog_order_idx" ON "payload"."prog" USING btree ("_order");
  CREATE INDEX "prog_parent_id_idx" ON "payload"."prog" USING btree ("_parent_id");
  CREATE INDEX "prog_path_idx" ON "payload"."prog" USING btree ("_path");
  CREATE INDEX "prog_locale_idx" ON "payload"."prog" USING btree ("_locale");
  CREATE INDEX "prog_cta_link_cta_link_page_idx" ON "payload"."prog" USING btree ("cta_link_page_id");
  CREATE INDEX "chal_challenges_order_idx" ON "payload"."chal_challenges" USING btree ("_order");
  CREATE INDEX "chal_challenges_parent_id_idx" ON "payload"."chal_challenges" USING btree ("_parent_id");
  CREATE INDEX "chal_challenges_locale_idx" ON "payload"."chal_challenges" USING btree ("_locale");
  CREATE INDEX "chal_challenges_cta_link_cta_link_page_idx" ON "payload"."chal_challenges" USING btree ("cta_link_page_id");
  CREATE INDEX "chal_challenges_featured_image_idx" ON "payload"."chal_challenges" USING btree ("featured_image_id");
  CREATE INDEX "chal_challenges_featured_image_tablet_idx" ON "payload"."chal_challenges" USING btree ("featured_image_tablet_id");
  CREATE INDEX "chal_challenges_featured_image_mobile_idx" ON "payload"."chal_challenges" USING btree ("featured_image_mobile_id");
  CREATE INDEX "chal_order_idx" ON "payload"."chal" USING btree ("_order");
  CREATE INDEX "chal_parent_id_idx" ON "payload"."chal" USING btree ("_parent_id");
  CREATE INDEX "chal_path_idx" ON "payload"."chal" USING btree ("_path");
  CREATE INDEX "chal_locale_idx" ON "payload"."chal" USING btree ("_locale");
  CREATE INDEX "chal_cta_link_cta_link_page_idx" ON "payload"."chal" USING btree ("cta_link_page_id");
  CREATE INDEX "why_tab1_cards_order_idx" ON "payload"."why_tab1_cards" USING btree ("_order");
  CREATE INDEX "why_tab1_cards_parent_id_idx" ON "payload"."why_tab1_cards" USING btree ("_parent_id");
  CREATE INDEX "why_tab1_cards_locale_idx" ON "payload"."why_tab1_cards" USING btree ("_locale");
  CREATE INDEX "why_tab1_cards_icon_idx" ON "payload"."why_tab1_cards" USING btree ("icon_id");
  CREATE INDEX "why_tab2_cards_order_idx" ON "payload"."why_tab2_cards" USING btree ("_order");
  CREATE INDEX "why_tab2_cards_parent_id_idx" ON "payload"."why_tab2_cards" USING btree ("_parent_id");
  CREATE INDEX "why_tab2_cards_locale_idx" ON "payload"."why_tab2_cards" USING btree ("_locale");
  CREATE INDEX "why_tab2_cards_icon_idx" ON "payload"."why_tab2_cards" USING btree ("icon_id");
  CREATE INDEX "why_order_idx" ON "payload"."why" USING btree ("_order");
  CREATE INDEX "why_parent_id_idx" ON "payload"."why" USING btree ("_parent_id");
  CREATE INDEX "why_path_idx" ON "payload"."why" USING btree ("_path");
  CREATE INDEX "why_locale_idx" ON "payload"."why" USING btree ("_locale");
  CREATE INDEX "topics_topics_order_idx" ON "payload"."topics_topics" USING btree ("_order");
  CREATE INDEX "topics_topics_parent_id_idx" ON "payload"."topics_topics" USING btree ("_parent_id");
  CREATE INDEX "topics_topics_locale_idx" ON "payload"."topics_topics" USING btree ("_locale");
  CREATE INDEX "topics_topics_link_link_page_idx" ON "payload"."topics_topics" USING btree ("link_page_id");
  CREATE INDEX "topics_topics_image_idx" ON "payload"."topics_topics" USING btree ("image_id");
  CREATE INDEX "topics_topics_image_tablet_idx" ON "payload"."topics_topics" USING btree ("image_tablet_id");
  CREATE INDEX "topics_topics_image_mobile_idx" ON "payload"."topics_topics" USING btree ("image_mobile_id");
  CREATE INDEX "topics_order_idx" ON "payload"."topics" USING btree ("_order");
  CREATE INDEX "topics_parent_id_idx" ON "payload"."topics" USING btree ("_parent_id");
  CREATE INDEX "topics_path_idx" ON "payload"."topics" USING btree ("_path");
  CREATE INDEX "topics_locale_idx" ON "payload"."topics" USING btree ("_locale");
  CREATE INDEX "topics_cta_link_cta_link_page_idx" ON "payload"."topics" USING btree ("cta_link_page_id");
  CREATE INDEX "prtnrs_logos_order_idx" ON "payload"."prtnrs_logos" USING btree ("_order");
  CREATE INDEX "prtnrs_logos_parent_id_idx" ON "payload"."prtnrs_logos" USING btree ("_parent_id");
  CREATE INDEX "prtnrs_logos_locale_idx" ON "payload"."prtnrs_logos" USING btree ("_locale");
  CREATE INDEX "prtnrs_logos_logo_idx" ON "payload"."prtnrs_logos" USING btree ("logo_id");
  CREATE INDEX "prtnrs_logos_partner_idx" ON "payload"."prtnrs_logos" USING btree ("partner_id");
  CREATE INDEX "prtnrs_logos_link_link_page_idx" ON "payload"."prtnrs_logos" USING btree ("link_page_id");
  CREATE INDEX "prtnrs_order_idx" ON "payload"."prtnrs" USING btree ("_order");
  CREATE INDEX "prtnrs_parent_id_idx" ON "payload"."prtnrs" USING btree ("_parent_id");
  CREATE INDEX "prtnrs_path_idx" ON "payload"."prtnrs" USING btree ("_path");
  CREATE INDEX "prtnrs_locale_idx" ON "payload"."prtnrs" USING btree ("_locale");
  CREATE INDEX "prtnrs_cta_link_cta_link_page_idx" ON "payload"."prtnrs" USING btree ("cta_link_page_id");
  CREATE INDEX "eco_layers_order_idx" ON "payload"."eco_layers" USING btree ("_order");
  CREATE INDEX "eco_layers_parent_id_idx" ON "payload"."eco_layers" USING btree ("_parent_id");
  CREATE INDEX "eco_layers_locale_idx" ON "payload"."eco_layers" USING btree ("_locale");
  CREATE INDEX "eco_order_idx" ON "payload"."eco" USING btree ("_order");
  CREATE INDEX "eco_parent_id_idx" ON "payload"."eco" USING btree ("_parent_id");
  CREATE INDEX "eco_path_idx" ON "payload"."eco" USING btree ("_path");
  CREATE INDEX "eco_locale_idx" ON "payload"."eco" USING btree ("_locale");
  CREATE INDEX "eco_cta_link_cta_link_page_idx" ON "payload"."eco" USING btree ("cta_link_page_id");
  CREATE INDEX "evt_events_order_idx" ON "payload"."evt_events" USING btree ("_order");
  CREATE INDEX "evt_events_parent_id_idx" ON "payload"."evt_events" USING btree ("_parent_id");
  CREATE INDEX "evt_events_locale_idx" ON "payload"."evt_events" USING btree ("_locale");
  CREATE INDEX "evt_events_image_idx" ON "payload"."evt_events" USING btree ("image_id");
  CREATE INDEX "evt_events_link_link_page_idx" ON "payload"."evt_events" USING btree ("link_page_id");
  CREATE INDEX "evt_order_idx" ON "payload"."evt" USING btree ("_order");
  CREATE INDEX "evt_parent_id_idx" ON "payload"."evt" USING btree ("_parent_id");
  CREATE INDEX "evt_path_idx" ON "payload"."evt" USING btree ("_path");
  CREATE INDEX "evt_locale_idx" ON "payload"."evt" USING btree ("_locale");
  CREATE INDEX "evt_cta_link_cta_link_page_idx" ON "payload"."evt" USING btree ("cta_link_page_id");
  CREATE INDEX "cta_order_idx" ON "payload"."cta" USING btree ("_order");
  CREATE INDEX "cta_parent_id_idx" ON "payload"."cta" USING btree ("_parent_id");
  CREATE INDEX "cta_path_idx" ON "payload"."cta" USING btree ("_path");
  CREATE INDEX "cta_locale_idx" ON "payload"."cta" USING btree ("_locale");
  CREATE INDEX "cta_cta_link_cta_link_page_idx" ON "payload"."cta" USING btree ("cta_link_page_id");
  CREATE INDEX "cta_image_idx" ON "payload"."cta" USING btree ("image_id");
  CREATE INDEX "cta_mobile_image_idx" ON "payload"."cta" USING btree ("mobile_image_id");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "payload"."pages" USING btree ("seo_og_image_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "payload"."pages" USING btree ("slug");
  CREATE UNIQUE INDEX "pages_storyblok_uuid_idx" ON "payload"."pages" USING btree ("storyblok_uuid");
  CREATE INDEX "pages_updated_at_idx" ON "payload"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload"."pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "payload"."pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "payload"."pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_rels_order_idx" ON "payload"."pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "payload"."pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "payload"."pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_locale_idx" ON "payload"."pages_rels" USING btree ("locale");
  CREATE INDEX "pages_rels_events_id_idx" ON "payload"."pages_rels" USING btree ("events_id","locale");
  CREATE INDEX "_pages_v_blocks_hero_quick_access_cards_order_idx" ON "payload"."_pages_v_blocks_hero_quick_access_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_quick_access_cards_parent_id_idx" ON "payload"."_pages_v_blocks_hero_quick_access_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_quick_access_cards_locale_idx" ON "payload"."_pages_v_blocks_hero_quick_access_cards" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_hero_quick_access_cards_link_link_page_idx" ON "payload"."_pages_v_blocks_hero_quick_access_cards" USING btree ("link_page_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "payload"."_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "payload"."_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "payload"."_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_locale_idx" ON "payload"."_pages_v_blocks_hero" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_hero_primary_cta_link_primary_cta_link_p_idx" ON "payload"."_pages_v_blocks_hero" USING btree ("primary_cta_link_page_id");
  CREATE INDEX "_pages_v_blocks_hero_hero_image_idx" ON "payload"."_pages_v_blocks_hero" USING btree ("hero_image_id");
  CREATE INDEX "_pages_v_blocks_hero_hero_image_tablet_idx" ON "payload"."_pages_v_blocks_hero" USING btree ("hero_image_tablet_id");
  CREATE INDEX "_pages_v_blocks_hero_hero_image_mobile_idx" ON "payload"."_pages_v_blocks_hero" USING btree ("hero_image_mobile_id");
  CREATE INDEX "_bento_v_cards_order_idx" ON "payload"."_bento_v_cards" USING btree ("_order");
  CREATE INDEX "_bento_v_cards_parent_id_idx" ON "payload"."_bento_v_cards" USING btree ("_parent_id");
  CREATE INDEX "_bento_v_cards_locale_idx" ON "payload"."_bento_v_cards" USING btree ("_locale");
  CREATE INDEX "_bento_v_cards_icon_idx" ON "payload"."_bento_v_cards" USING btree ("icon_id");
  CREATE INDEX "_bento_v_order_idx" ON "payload"."_bento_v" USING btree ("_order");
  CREATE INDEX "_bento_v_parent_id_idx" ON "payload"."_bento_v" USING btree ("_parent_id");
  CREATE INDEX "_bento_v_path_idx" ON "payload"."_bento_v" USING btree ("_path");
  CREATE INDEX "_bento_v_locale_idx" ON "payload"."_bento_v" USING btree ("_locale");
  CREATE INDEX "_bento_v_cta_link_cta_link_page_idx" ON "payload"."_bento_v" USING btree ("cta_link_page_id");
  CREATE INDEX "_prog_v_programs_order_idx" ON "payload"."_prog_v_programs" USING btree ("_order");
  CREATE INDEX "_prog_v_programs_parent_id_idx" ON "payload"."_prog_v_programs" USING btree ("_parent_id");
  CREATE INDEX "_prog_v_programs_locale_idx" ON "payload"."_prog_v_programs" USING btree ("_locale");
  CREATE INDEX "_prog_v_programs_image_idx" ON "payload"."_prog_v_programs" USING btree ("image_id");
  CREATE INDEX "_prog_v_programs_image_tablet_idx" ON "payload"."_prog_v_programs" USING btree ("image_tablet_id");
  CREATE INDEX "_prog_v_programs_image_mobile_idx" ON "payload"."_prog_v_programs" USING btree ("image_mobile_id");
  CREATE INDEX "_prog_v_programs_link_link_page_idx" ON "payload"."_prog_v_programs" USING btree ("link_page_id");
  CREATE INDEX "_prog_v_order_idx" ON "payload"."_prog_v" USING btree ("_order");
  CREATE INDEX "_prog_v_parent_id_idx" ON "payload"."_prog_v" USING btree ("_parent_id");
  CREATE INDEX "_prog_v_path_idx" ON "payload"."_prog_v" USING btree ("_path");
  CREATE INDEX "_prog_v_locale_idx" ON "payload"."_prog_v" USING btree ("_locale");
  CREATE INDEX "_prog_v_cta_link_cta_link_page_idx" ON "payload"."_prog_v" USING btree ("cta_link_page_id");
  CREATE INDEX "_chal_v_challenges_order_idx" ON "payload"."_chal_v_challenges" USING btree ("_order");
  CREATE INDEX "_chal_v_challenges_parent_id_idx" ON "payload"."_chal_v_challenges" USING btree ("_parent_id");
  CREATE INDEX "_chal_v_challenges_locale_idx" ON "payload"."_chal_v_challenges" USING btree ("_locale");
  CREATE INDEX "_chal_v_challenges_cta_link_cta_link_page_idx" ON "payload"."_chal_v_challenges" USING btree ("cta_link_page_id");
  CREATE INDEX "_chal_v_challenges_featured_image_idx" ON "payload"."_chal_v_challenges" USING btree ("featured_image_id");
  CREATE INDEX "_chal_v_challenges_featured_image_tablet_idx" ON "payload"."_chal_v_challenges" USING btree ("featured_image_tablet_id");
  CREATE INDEX "_chal_v_challenges_featured_image_mobile_idx" ON "payload"."_chal_v_challenges" USING btree ("featured_image_mobile_id");
  CREATE INDEX "_chal_v_order_idx" ON "payload"."_chal_v" USING btree ("_order");
  CREATE INDEX "_chal_v_parent_id_idx" ON "payload"."_chal_v" USING btree ("_parent_id");
  CREATE INDEX "_chal_v_path_idx" ON "payload"."_chal_v" USING btree ("_path");
  CREATE INDEX "_chal_v_locale_idx" ON "payload"."_chal_v" USING btree ("_locale");
  CREATE INDEX "_chal_v_cta_link_cta_link_page_idx" ON "payload"."_chal_v" USING btree ("cta_link_page_id");
  CREATE INDEX "_why_v_tab1_cards_order_idx" ON "payload"."_why_v_tab1_cards" USING btree ("_order");
  CREATE INDEX "_why_v_tab1_cards_parent_id_idx" ON "payload"."_why_v_tab1_cards" USING btree ("_parent_id");
  CREATE INDEX "_why_v_tab1_cards_locale_idx" ON "payload"."_why_v_tab1_cards" USING btree ("_locale");
  CREATE INDEX "_why_v_tab1_cards_icon_idx" ON "payload"."_why_v_tab1_cards" USING btree ("icon_id");
  CREATE INDEX "_why_v_tab2_cards_order_idx" ON "payload"."_why_v_tab2_cards" USING btree ("_order");
  CREATE INDEX "_why_v_tab2_cards_parent_id_idx" ON "payload"."_why_v_tab2_cards" USING btree ("_parent_id");
  CREATE INDEX "_why_v_tab2_cards_locale_idx" ON "payload"."_why_v_tab2_cards" USING btree ("_locale");
  CREATE INDEX "_why_v_tab2_cards_icon_idx" ON "payload"."_why_v_tab2_cards" USING btree ("icon_id");
  CREATE INDEX "_why_v_order_idx" ON "payload"."_why_v" USING btree ("_order");
  CREATE INDEX "_why_v_parent_id_idx" ON "payload"."_why_v" USING btree ("_parent_id");
  CREATE INDEX "_why_v_path_idx" ON "payload"."_why_v" USING btree ("_path");
  CREATE INDEX "_why_v_locale_idx" ON "payload"."_why_v" USING btree ("_locale");
  CREATE INDEX "_topics_v_topics_order_idx" ON "payload"."_topics_v_topics" USING btree ("_order");
  CREATE INDEX "_topics_v_topics_parent_id_idx" ON "payload"."_topics_v_topics" USING btree ("_parent_id");
  CREATE INDEX "_topics_v_topics_locale_idx" ON "payload"."_topics_v_topics" USING btree ("_locale");
  CREATE INDEX "_topics_v_topics_link_link_page_idx" ON "payload"."_topics_v_topics" USING btree ("link_page_id");
  CREATE INDEX "_topics_v_topics_image_idx" ON "payload"."_topics_v_topics" USING btree ("image_id");
  CREATE INDEX "_topics_v_topics_image_tablet_idx" ON "payload"."_topics_v_topics" USING btree ("image_tablet_id");
  CREATE INDEX "_topics_v_topics_image_mobile_idx" ON "payload"."_topics_v_topics" USING btree ("image_mobile_id");
  CREATE INDEX "_topics_v_order_idx" ON "payload"."_topics_v" USING btree ("_order");
  CREATE INDEX "_topics_v_parent_id_idx" ON "payload"."_topics_v" USING btree ("_parent_id");
  CREATE INDEX "_topics_v_path_idx" ON "payload"."_topics_v" USING btree ("_path");
  CREATE INDEX "_topics_v_locale_idx" ON "payload"."_topics_v" USING btree ("_locale");
  CREATE INDEX "_topics_v_cta_link_cta_link_page_idx" ON "payload"."_topics_v" USING btree ("cta_link_page_id");
  CREATE INDEX "_prtnrs_v_logos_order_idx" ON "payload"."_prtnrs_v_logos" USING btree ("_order");
  CREATE INDEX "_prtnrs_v_logos_parent_id_idx" ON "payload"."_prtnrs_v_logos" USING btree ("_parent_id");
  CREATE INDEX "_prtnrs_v_logos_locale_idx" ON "payload"."_prtnrs_v_logos" USING btree ("_locale");
  CREATE INDEX "_prtnrs_v_logos_logo_idx" ON "payload"."_prtnrs_v_logos" USING btree ("logo_id");
  CREATE INDEX "_prtnrs_v_logos_partner_idx" ON "payload"."_prtnrs_v_logos" USING btree ("partner_id");
  CREATE INDEX "_prtnrs_v_logos_link_link_page_idx" ON "payload"."_prtnrs_v_logos" USING btree ("link_page_id");
  CREATE INDEX "_prtnrs_v_order_idx" ON "payload"."_prtnrs_v" USING btree ("_order");
  CREATE INDEX "_prtnrs_v_parent_id_idx" ON "payload"."_prtnrs_v" USING btree ("_parent_id");
  CREATE INDEX "_prtnrs_v_path_idx" ON "payload"."_prtnrs_v" USING btree ("_path");
  CREATE INDEX "_prtnrs_v_locale_idx" ON "payload"."_prtnrs_v" USING btree ("_locale");
  CREATE INDEX "_prtnrs_v_cta_link_cta_link_page_idx" ON "payload"."_prtnrs_v" USING btree ("cta_link_page_id");
  CREATE INDEX "_eco_v_layers_order_idx" ON "payload"."_eco_v_layers" USING btree ("_order");
  CREATE INDEX "_eco_v_layers_parent_id_idx" ON "payload"."_eco_v_layers" USING btree ("_parent_id");
  CREATE INDEX "_eco_v_layers_locale_idx" ON "payload"."_eco_v_layers" USING btree ("_locale");
  CREATE INDEX "_eco_v_order_idx" ON "payload"."_eco_v" USING btree ("_order");
  CREATE INDEX "_eco_v_parent_id_idx" ON "payload"."_eco_v" USING btree ("_parent_id");
  CREATE INDEX "_eco_v_path_idx" ON "payload"."_eco_v" USING btree ("_path");
  CREATE INDEX "_eco_v_locale_idx" ON "payload"."_eco_v" USING btree ("_locale");
  CREATE INDEX "_eco_v_cta_link_cta_link_page_idx" ON "payload"."_eco_v" USING btree ("cta_link_page_id");
  CREATE INDEX "_evt_v_events_order_idx" ON "payload"."_evt_v_events" USING btree ("_order");
  CREATE INDEX "_evt_v_events_parent_id_idx" ON "payload"."_evt_v_events" USING btree ("_parent_id");
  CREATE INDEX "_evt_v_events_locale_idx" ON "payload"."_evt_v_events" USING btree ("_locale");
  CREATE INDEX "_evt_v_events_image_idx" ON "payload"."_evt_v_events" USING btree ("image_id");
  CREATE INDEX "_evt_v_events_link_link_page_idx" ON "payload"."_evt_v_events" USING btree ("link_page_id");
  CREATE INDEX "_evt_v_order_idx" ON "payload"."_evt_v" USING btree ("_order");
  CREATE INDEX "_evt_v_parent_id_idx" ON "payload"."_evt_v" USING btree ("_parent_id");
  CREATE INDEX "_evt_v_path_idx" ON "payload"."_evt_v" USING btree ("_path");
  CREATE INDEX "_evt_v_locale_idx" ON "payload"."_evt_v" USING btree ("_locale");
  CREATE INDEX "_evt_v_cta_link_cta_link_page_idx" ON "payload"."_evt_v" USING btree ("cta_link_page_id");
  CREATE INDEX "_cta_v_order_idx" ON "payload"."_cta_v" USING btree ("_order");
  CREATE INDEX "_cta_v_parent_id_idx" ON "payload"."_cta_v" USING btree ("_parent_id");
  CREATE INDEX "_cta_v_path_idx" ON "payload"."_cta_v" USING btree ("_path");
  CREATE INDEX "_cta_v_locale_idx" ON "payload"."_cta_v" USING btree ("_locale");
  CREATE INDEX "_cta_v_cta_link_cta_link_page_idx" ON "payload"."_cta_v" USING btree ("cta_link_page_id");
  CREATE INDEX "_cta_v_image_idx" ON "payload"."_cta_v" USING btree ("image_id");
  CREATE INDEX "_cta_v_mobile_image_idx" ON "payload"."_cta_v" USING btree ("mobile_image_id");
  CREATE INDEX "_pages_v_parent_idx" ON "payload"."_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_seo_version_seo_og_image_idx" ON "payload"."_pages_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "payload"."_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_storyblok_uuid_idx" ON "payload"."_pages_v" USING btree ("version_storyblok_uuid");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "payload"."_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "payload"."_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "payload"."_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "payload"."_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "payload"."_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "payload"."_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "payload"."_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "payload"."_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "payload"."_pages_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "payload"."_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_rels_order_idx" ON "payload"."_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "payload"."_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "payload"."_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_locale_idx" ON "payload"."_pages_v_rels" USING btree ("locale");
  CREATE INDEX "_pages_v_rels_events_id_idx" ON "payload"."_pages_v_rels" USING btree ("events_id","locale");
  CREATE INDEX "media_source_url_idx" ON "payload"."media" USING btree ("source_url");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "payload"."media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "payload"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_tablet_sizes_tablet_filename_idx" ON "payload"."media" USING btree ("sizes_tablet_filename");
  CREATE INDEX "media_sizes_desktop_sizes_desktop_filename_idx" ON "payload"."media" USING btree ("sizes_desktop_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "payload"."media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "partners_slug_idx" ON "payload"."partners" USING btree ("slug");
  CREATE INDEX "partners_logo_idx" ON "payload"."partners" USING btree ("logo_id");
  CREATE UNIQUE INDEX "partners_storyblok_uuid_idx" ON "payload"."partners" USING btree ("storyblok_uuid");
  CREATE INDEX "partners_updated_at_idx" ON "payload"."partners" USING btree ("updated_at");
  CREATE INDEX "partners_created_at_idx" ON "payload"."partners" USING btree ("created_at");
  CREATE INDEX "partners__status_idx" ON "payload"."partners" USING btree ("_status");
  CREATE UNIQUE INDEX "partners_locales_locale_parent_id_unique" ON "payload"."partners_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_partners_v_parent_idx" ON "payload"."_partners_v" USING btree ("parent_id");
  CREATE INDEX "_partners_v_version_version_slug_idx" ON "payload"."_partners_v" USING btree ("version_slug");
  CREATE INDEX "_partners_v_version_version_logo_idx" ON "payload"."_partners_v" USING btree ("version_logo_id");
  CREATE INDEX "_partners_v_version_version_storyblok_uuid_idx" ON "payload"."_partners_v" USING btree ("version_storyblok_uuid");
  CREATE INDEX "_partners_v_version_version_updated_at_idx" ON "payload"."_partners_v" USING btree ("version_updated_at");
  CREATE INDEX "_partners_v_version_version_created_at_idx" ON "payload"."_partners_v" USING btree ("version_created_at");
  CREATE INDEX "_partners_v_version_version__status_idx" ON "payload"."_partners_v" USING btree ("version__status");
  CREATE INDEX "_partners_v_created_at_idx" ON "payload"."_partners_v" USING btree ("created_at");
  CREATE INDEX "_partners_v_updated_at_idx" ON "payload"."_partners_v" USING btree ("updated_at");
  CREATE INDEX "_partners_v_snapshot_idx" ON "payload"."_partners_v" USING btree ("snapshot");
  CREATE INDEX "_partners_v_published_locale_idx" ON "payload"."_partners_v" USING btree ("published_locale");
  CREATE INDEX "_partners_v_latest_idx" ON "payload"."_partners_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_partners_v_locales_locale_parent_id_unique" ON "payload"."_partners_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "events_slug_idx" ON "payload"."events" USING btree ("slug");
  CREATE INDEX "events_image_idx" ON "payload"."events" USING btree ("image_id");
  CREATE UNIQUE INDEX "events_storyblok_uuid_idx" ON "payload"."events" USING btree ("storyblok_uuid");
  CREATE INDEX "events_updated_at_idx" ON "payload"."events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "payload"."events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "payload"."events" USING btree ("_status");
  CREATE UNIQUE INDEX "events_locales_locale_parent_id_unique" ON "payload"."events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_events_v_parent_idx" ON "payload"."_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "payload"."_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_image_idx" ON "payload"."_events_v" USING btree ("version_image_id");
  CREATE INDEX "_events_v_version_version_storyblok_uuid_idx" ON "payload"."_events_v" USING btree ("version_storyblok_uuid");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "payload"."_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "payload"."_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "payload"."_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "payload"."_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "payload"."_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_snapshot_idx" ON "payload"."_events_v" USING btree ("snapshot");
  CREATE INDEX "_events_v_published_locale_idx" ON "payload"."_events_v" USING btree ("published_locale");
  CREATE INDEX "_events_v_latest_idx" ON "payload"."_events_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_events_v_locales_locale_parent_id_unique" ON "payload"."_events_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload"."payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload"."payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload"."payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload"."payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload"."payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload"."payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload"."payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload"."payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload"."payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload"."payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload"."payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_partners_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("partners_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "navigation_menu_items_dropdown_items_sub_items_order_idx" ON "payload"."navigation_menu_items_dropdown_items_sub_items" USING btree ("_order");
  CREATE INDEX "navigation_menu_items_dropdown_items_sub_items_parent_id_idx" ON "payload"."navigation_menu_items_dropdown_items_sub_items" USING btree ("_parent_id");
  CREATE INDEX "navigation_menu_items_dropdown_items_sub_items_link_link_idx" ON "payload"."navigation_menu_items_dropdown_items_sub_items" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "navigation_menu_items_dropdown_items_sub_items_locales_local" ON "payload"."navigation_menu_items_dropdown_items_sub_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_menu_items_dropdown_items_order_idx" ON "payload"."navigation_menu_items_dropdown_items" USING btree ("_order");
  CREATE INDEX "navigation_menu_items_dropdown_items_parent_id_idx" ON "payload"."navigation_menu_items_dropdown_items" USING btree ("_parent_id");
  CREATE INDEX "navigation_menu_items_dropdown_items_link_link_page_idx" ON "payload"."navigation_menu_items_dropdown_items" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "navigation_menu_items_dropdown_items_locales_locale_parent_i" ON "payload"."navigation_menu_items_dropdown_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_menu_items_order_idx" ON "payload"."navigation_menu_items" USING btree ("_order");
  CREATE INDEX "navigation_menu_items_parent_id_idx" ON "payload"."navigation_menu_items" USING btree ("_parent_id");
  CREATE INDEX "navigation_menu_items_link_link_page_idx" ON "payload"."navigation_menu_items" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "navigation_menu_items_locales_locale_parent_id_unique" ON "payload"."navigation_menu_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_logo_idx" ON "payload"."navigation" USING btree ("logo_id");
  CREATE INDEX "navigation_logo_link_logo_link_page_idx" ON "payload"."navigation" USING btree ("logo_link_page_id");
  CREATE INDEX "navigation_cta_button_link_cta_button_link_page_idx" ON "payload"."navigation" USING btree ("cta_button_link_page_id");
  CREATE UNIQUE INDEX "navigation_locales_locale_parent_id_unique" ON "payload"."navigation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_columns_links_order_idx" ON "payload"."site_settings_footer_columns_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_columns_links_parent_id_idx" ON "payload"."site_settings_footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_columns_links_link_link_page_idx" ON "payload"."site_settings_footer_columns_links" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "site_settings_footer_columns_links_locales_locale_parent_id_" ON "payload"."site_settings_footer_columns_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_columns_order_idx" ON "payload"."site_settings_footer_columns" USING btree ("_order");
  CREATE INDEX "site_settings_footer_columns_parent_id_idx" ON "payload"."site_settings_footer_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_footer_columns_locales_locale_parent_id_unique" ON "payload"."site_settings_footer_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_legal_links_order_idx" ON "payload"."site_settings_footer_legal_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_legal_links_parent_id_idx" ON "payload"."site_settings_footer_legal_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_legal_links_link_link_page_idx" ON "payload"."site_settings_footer_legal_links" USING btree ("link_page_id");
  CREATE UNIQUE INDEX "site_settings_footer_legal_links_locales_locale_parent_id_un" ON "payload"."site_settings_footer_legal_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_social_links_order_idx" ON "payload"."site_settings_footer_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_social_links_parent_id_idx" ON "payload"."site_settings_footer_social_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_social_links_link_link_page_idx" ON "payload"."site_settings_footer_social_links" USING btree ("link_page_id");
  CREATE INDEX "site_settings_footer_footer_logo_idx" ON "payload"."site_settings" USING btree ("footer_logo_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "payload"."site_settings_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_hero_quick_access_cards" CASCADE;
  DROP TABLE "payload"."pages_blocks_hero" CASCADE;
  DROP TABLE "payload"."bento_cards" CASCADE;
  DROP TABLE "payload"."bento" CASCADE;
  DROP TABLE "payload"."prog_programs" CASCADE;
  DROP TABLE "payload"."prog" CASCADE;
  DROP TABLE "payload"."chal_challenges" CASCADE;
  DROP TABLE "payload"."chal" CASCADE;
  DROP TABLE "payload"."why_tab1_cards" CASCADE;
  DROP TABLE "payload"."why_tab2_cards" CASCADE;
  DROP TABLE "payload"."why" CASCADE;
  DROP TABLE "payload"."topics_topics" CASCADE;
  DROP TABLE "payload"."topics" CASCADE;
  DROP TABLE "payload"."prtnrs_logos" CASCADE;
  DROP TABLE "payload"."prtnrs" CASCADE;
  DROP TABLE "payload"."eco_layers" CASCADE;
  DROP TABLE "payload"."eco" CASCADE;
  DROP TABLE "payload"."evt_events" CASCADE;
  DROP TABLE "payload"."evt" CASCADE;
  DROP TABLE "payload"."cta" CASCADE;
  DROP TABLE "payload"."pages" CASCADE;
  DROP TABLE "payload"."pages_locales" CASCADE;
  DROP TABLE "payload"."pages_rels" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_hero_quick_access_cards" CASCADE;
  DROP TABLE "payload"."_pages_v_blocks_hero" CASCADE;
  DROP TABLE "payload"."_bento_v_cards" CASCADE;
  DROP TABLE "payload"."_bento_v" CASCADE;
  DROP TABLE "payload"."_prog_v_programs" CASCADE;
  DROP TABLE "payload"."_prog_v" CASCADE;
  DROP TABLE "payload"."_chal_v_challenges" CASCADE;
  DROP TABLE "payload"."_chal_v" CASCADE;
  DROP TABLE "payload"."_why_v_tab1_cards" CASCADE;
  DROP TABLE "payload"."_why_v_tab2_cards" CASCADE;
  DROP TABLE "payload"."_why_v" CASCADE;
  DROP TABLE "payload"."_topics_v_topics" CASCADE;
  DROP TABLE "payload"."_topics_v" CASCADE;
  DROP TABLE "payload"."_prtnrs_v_logos" CASCADE;
  DROP TABLE "payload"."_prtnrs_v" CASCADE;
  DROP TABLE "payload"."_eco_v_layers" CASCADE;
  DROP TABLE "payload"."_eco_v" CASCADE;
  DROP TABLE "payload"."_evt_v_events" CASCADE;
  DROP TABLE "payload"."_evt_v" CASCADE;
  DROP TABLE "payload"."_cta_v" CASCADE;
  DROP TABLE "payload"."_pages_v" CASCADE;
  DROP TABLE "payload"."_pages_v_locales" CASCADE;
  DROP TABLE "payload"."_pages_v_rels" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."media_locales" CASCADE;
  DROP TABLE "payload"."partners" CASCADE;
  DROP TABLE "payload"."partners_locales" CASCADE;
  DROP TABLE "payload"."_partners_v" CASCADE;
  DROP TABLE "payload"."_partners_v_locales" CASCADE;
  DROP TABLE "payload"."events" CASCADE;
  DROP TABLE "payload"."events_locales" CASCADE;
  DROP TABLE "payload"."_events_v" CASCADE;
  DROP TABLE "payload"."_events_v_locales" CASCADE;
  DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_jobs_log" CASCADE;
  DROP TABLE "payload"."payload_jobs" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TABLE "payload"."navigation_menu_items_dropdown_items_sub_items" CASCADE;
  DROP TABLE "payload"."navigation_menu_items_dropdown_items_sub_items_locales" CASCADE;
  DROP TABLE "payload"."navigation_menu_items_dropdown_items" CASCADE;
  DROP TABLE "payload"."navigation_menu_items_dropdown_items_locales" CASCADE;
  DROP TABLE "payload"."navigation_menu_items" CASCADE;
  DROP TABLE "payload"."navigation_menu_items_locales" CASCADE;
  DROP TABLE "payload"."navigation" CASCADE;
  DROP TABLE "payload"."navigation_locales" CASCADE;
  DROP TABLE "payload"."site_settings_footer_columns_links" CASCADE;
  DROP TABLE "payload"."site_settings_footer_columns_links_locales" CASCADE;
  DROP TABLE "payload"."site_settings_footer_columns" CASCADE;
  DROP TABLE "payload"."site_settings_footer_columns_locales" CASCADE;
  DROP TABLE "payload"."site_settings_footer_legal_links" CASCADE;
  DROP TABLE "payload"."site_settings_footer_legal_links_locales" CASCADE;
  DROP TABLE "payload"."site_settings_footer_social_links" CASCADE;
  DROP TABLE "payload"."site_settings" CASCADE;
  DROP TABLE "payload"."site_settings_locales" CASCADE;
  DROP TYPE "payload"."_locales";
  DROP TYPE "payload"."enum_pages_blocks_hero_quick_access_cards_variant";
  DROP TYPE "payload"."enum_pages_blocks_hero_quick_access_cards_position";
  DROP TYPE "payload"."enum_pages_blocks_hero_quick_access_cards_link_type";
  DROP TYPE "payload"."enum_pages_blocks_hero_primary_cta_link_type";
  DROP TYPE "payload"."enum_bento_cta_link_type";
  DROP TYPE "payload"."enum_prog_programs_link_type";
  DROP TYPE "payload"."enum_prog_cta_link_type";
  DROP TYPE "payload"."enum_chal_challenges_cta_link_type";
  DROP TYPE "payload"."enum_chal_cta_link_type";
  DROP TYPE "payload"."enum_topics_topics_link_type";
  DROP TYPE "payload"."enum_topics_cta_link_type";
  DROP TYPE "payload"."enum_prtnrs_logos_link_type";
  DROP TYPE "payload"."enum_prtnrs_cta_link_type";
  DROP TYPE "payload"."enum_eco_layers_position";
  DROP TYPE "payload"."enum_eco_cta_link_type";
  DROP TYPE "payload"."enum_evt_events_color_theme";
  DROP TYPE "payload"."enum_evt_events_link_type";
  DROP TYPE "payload"."enum_evt_cta_link_type";
  DROP TYPE "payload"."enum_evt_selection_mode";
  DROP TYPE "payload"."enum_cta_cta_link_type";
  DROP TYPE "payload"."enum_pages_status";
  DROP TYPE "payload"."enum__pages_v_blocks_hero_quick_access_cards_variant";
  DROP TYPE "payload"."enum__pages_v_blocks_hero_quick_access_cards_position";
  DROP TYPE "payload"."enum__pages_v_blocks_hero_quick_access_cards_link_type";
  DROP TYPE "payload"."enum__pages_v_blocks_hero_primary_cta_link_type";
  DROP TYPE "payload"."enum__bento_v_cta_link_type";
  DROP TYPE "payload"."enum__prog_v_programs_link_type";
  DROP TYPE "payload"."enum__prog_v_cta_link_type";
  DROP TYPE "payload"."enum__chal_v_challenges_cta_link_type";
  DROP TYPE "payload"."enum__chal_v_cta_link_type";
  DROP TYPE "payload"."enum__topics_v_topics_link_type";
  DROP TYPE "payload"."enum__topics_v_cta_link_type";
  DROP TYPE "payload"."enum__prtnrs_v_logos_link_type";
  DROP TYPE "payload"."enum__prtnrs_v_cta_link_type";
  DROP TYPE "payload"."enum__eco_v_layers_position";
  DROP TYPE "payload"."enum__eco_v_cta_link_type";
  DROP TYPE "payload"."enum__evt_v_events_color_theme";
  DROP TYPE "payload"."enum__evt_v_events_link_type";
  DROP TYPE "payload"."enum__evt_v_cta_link_type";
  DROP TYPE "payload"."enum__evt_v_selection_mode";
  DROP TYPE "payload"."enum__cta_v_cta_link_type";
  DROP TYPE "payload"."enum__pages_v_version_status";
  DROP TYPE "payload"."enum__pages_v_published_locale";
  DROP TYPE "payload"."enum_partners_status";
  DROP TYPE "payload"."enum__partners_v_version_status";
  DROP TYPE "payload"."enum__partners_v_published_locale";
  DROP TYPE "payload"."enum_events_status";
  DROP TYPE "payload"."enum__events_v_version_status";
  DROP TYPE "payload"."enum__events_v_published_locale";
  DROP TYPE "payload"."enum_users_role";
  DROP TYPE "payload"."enum_payload_jobs_log_task_slug";
  DROP TYPE "payload"."enum_payload_jobs_log_state";
  DROP TYPE "payload"."enum_payload_jobs_task_slug";
  DROP TYPE "payload"."enum_navigation_menu_items_dropdown_items_sub_items_link_type";
  DROP TYPE "payload"."enum_navigation_menu_items_dropdown_items_link_type";
  DROP TYPE "payload"."enum_navigation_menu_items_link_type";
  DROP TYPE "payload"."enum_navigation_logo_link_type";
  DROP TYPE "payload"."enum_navigation_cta_button_variant";
  DROP TYPE "payload"."enum_navigation_cta_button_link_type";
  DROP TYPE "payload"."enum_site_settings_footer_columns_links_link_type";
  DROP TYPE "payload"."enum_site_settings_footer_legal_links_link_type";
  DROP TYPE "payload"."enum_site_settings_footer_social_links_link_type";`)
}
