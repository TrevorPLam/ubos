CREATE TYPE "public"."crm_contact_status" AS ENUM('active', 'inactive', 'hot');--> statement-breakpoint
CREATE TYPE "public"."crm_deal_stage" AS ENUM('pipeline', 'proposal', 'negotiation', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."crm_lead_stage" AS ENUM('new', 'contacted', 'qualified');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT (current_setting('app.current_tenant', true))::uuid NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"industry" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT (current_setting('app.current_tenant', true))::uuid NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"status" "crm_contact_status" DEFAULT 'active' NOT NULL,
	"last_contact_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT (current_setting('app.current_tenant', true))::uuid NOT NULL,
	"company_id" uuid,
	"contact_id" uuid,
	"name" text NOT NULL,
	"value_cents" integer DEFAULT 0 NOT NULL,
	"stage" "crm_deal_stage" DEFAULT 'pipeline' NOT NULL,
	"close_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_deals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT (current_setting('app.current_tenant', true))::uuid NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text NOT NULL,
	"value" text NOT NULL,
	"source" text NOT NULL,
	"notes" text,
	"stage" "crm_lead_stage" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_organization_id_organizations_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_company_id_crm_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitations_organization_id_idx" ON "invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "members_organization_user_unique" ON "members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "members_organization_id_idx" ON "members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "members_user_id_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_unique" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_active_organization_id_idx" ON "sessions" USING btree ("active_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_membership_unique" ON "user_roles" USING btree ("user_id","role_id","organization_id");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_id_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "crm_companies_organization_id_idx" ON "crm_companies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_organization_id_idx" ON "crm_contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_company_id_idx" ON "crm_contacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "crm_deals_organization_id_idx" ON "crm_deals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_deals_company_id_idx" ON "crm_deals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "crm_deals_contact_id_idx" ON "crm_deals" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "crm_leads_organization_id_idx" ON "crm_leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_leads_company_id_idx" ON "crm_leads" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "crm_leads_stage_idx" ON "crm_leads" USING btree ("stage");--> statement-breakpoint
CREATE POLICY "crm_companies_bypass_rls" ON "crm_companies" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.bypass_rls', true), 'false') = 'true') WITH CHECK (coalesce(current_setting('app.bypass_rls', true), 'false') = 'true');--> statement-breakpoint
CREATE POLICY "crm_companies_tenant_scope" ON "crm_companies" AS PERMISSIVE FOR ALL TO public USING ("crm_companies"."organization_id" = (current_setting('app.current_tenant', true))::uuid) WITH CHECK ("crm_companies"."organization_id" = (current_setting('app.current_tenant', true))::uuid);--> statement-breakpoint
CREATE POLICY "crm_contacts_bypass_rls" ON "crm_contacts" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.bypass_rls', true), 'false') = 'true') WITH CHECK (coalesce(current_setting('app.bypass_rls', true), 'false') = 'true');--> statement-breakpoint
CREATE POLICY "crm_contacts_tenant_scope" ON "crm_contacts" AS PERMISSIVE FOR ALL TO public USING ("crm_contacts"."organization_id" = (current_setting('app.current_tenant', true))::uuid) WITH CHECK ("crm_contacts"."organization_id" = (current_setting('app.current_tenant', true))::uuid);--> statement-breakpoint
CREATE POLICY "crm_deals_bypass_rls" ON "crm_deals" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.bypass_rls', true), 'false') = 'true') WITH CHECK (coalesce(current_setting('app.bypass_rls', true), 'false') = 'true');--> statement-breakpoint
CREATE POLICY "crm_deals_tenant_scope" ON "crm_deals" AS PERMISSIVE FOR ALL TO public USING ("crm_deals"."organization_id" = (current_setting('app.current_tenant', true))::uuid) WITH CHECK ("crm_deals"."organization_id" = (current_setting('app.current_tenant', true))::uuid);--> statement-breakpoint
CREATE POLICY "crm_leads_bypass_rls" ON "crm_leads" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.bypass_rls', true), 'false') = 'true') WITH CHECK (coalesce(current_setting('app.bypass_rls', true), 'false') = 'true');--> statement-breakpoint
CREATE POLICY "crm_leads_tenant_scope" ON "crm_leads" AS PERMISSIVE FOR ALL TO public USING ("crm_leads"."organization_id" = (current_setting('app.current_tenant', true))::uuid) WITH CHECK ("crm_leads"."organization_id" = (current_setting('app.current_tenant', true))::uuid);--> statement-breakpoint
CREATE POLICY "organizations_public_read" ON "organizations" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "organizations_public_insert" ON "organizations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "organizations_scoped_update" ON "organizations" AS PERMISSIVE FOR UPDATE TO public USING ((coalesce(current_setting('app.bypass_rls', true), 'false') = 'true') or ("organizations"."id" = (current_setting('app.current_tenant', true))::uuid)) WITH CHECK ((coalesce(current_setting('app.bypass_rls', true), 'false') = 'true') or ("organizations"."id" = (current_setting('app.current_tenant', true))::uuid));--> statement-breakpoint
CREATE POLICY "organizations_scoped_delete" ON "organizations" AS PERMISSIVE FOR DELETE TO public USING ((coalesce(current_setting('app.bypass_rls', true), 'false') = 'true') or ("organizations"."id" = (current_setting('app.current_tenant', true))::uuid));