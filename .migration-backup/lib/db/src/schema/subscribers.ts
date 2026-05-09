import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  verified: boolean("verified").notNull().default(false),
  verifyCode: text("verify_code"),
  verifyExpires: timestamp("verify_expires"),
  agentmailMessageId: text("agentmail_message_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriberSchema = createInsertSchema(subscribersTable).omit({
  id: true,
  createdAt: true,
  verified: true,
  verifyCode: true,
  verifyExpires: true,
  agentmailMessageId: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribersTable.$inferSelect;
