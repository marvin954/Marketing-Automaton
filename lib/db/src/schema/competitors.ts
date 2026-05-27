import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const competitorsTable = pgTable("competitors", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  website: text("website"),
  notes: text("notes"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompetitorSchema = createInsertSchema(competitorsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Competitor = typeof competitorsTable.$inferSelect;
