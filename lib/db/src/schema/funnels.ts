import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const funnelsTable = pgTable("funnels", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const funnelPagesTable = pgTable("funnel_pages", {
  id: serial("id").primaryKey(),
  funnelId: integer("funnel_id").notNull().references(() => funnelsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  position: integer("position").notNull().default(0),
  sections: jsonb("sections").notNull().default([]),
  publicSlug: text("public_slug"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Funnel = typeof funnelsTable.$inferSelect;
export type FunnelPageRow = typeof funnelPagesTable.$inferSelect;
