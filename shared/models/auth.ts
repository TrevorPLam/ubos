// AI-META-BEGIN
// AI-META: Shared module - auth.ts
// OWNERSHIP: shared
// ENTRYPOINTS: client and server
// DEPENDENCIES: zod
// DANGER: Breaking changes affect both sides
// CHANGE-SAFETY: Review changes carefully - analyze imports and usage before modifying
// TESTS: npm run check
// AI-META-END

import { sql } from "drizzle-orm";
import { pgTable, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

// User storage table.
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone", { length: 50 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  notificationPreferences: jsonb("notification_preferences").$type<{
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    projectUpdates?: boolean;
    taskReminders?: boolean;
    invoiceNotifications?: boolean;
  }>(),
  passwordHash: varchar("password_hash"), // 2026 security: Argon2id hashed passwords
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
