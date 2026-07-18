import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timelineTable = pgTable("timeline_entries", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimelineSchema = createInsertSchema(timelineTable).omit({
  id: true,
  timestamp: true,
});
export type InsertTimeline = z.infer<typeof insertTimelineSchema>;
export type TimelineEntry = typeof timelineTable.$inferSelect;
