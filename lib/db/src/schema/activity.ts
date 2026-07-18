import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  resourceName: text("resource_name"),
  incidentId: integer("incident_id"),
  incidentSummary: text("incident_summary"),
  urgency: text("urgency"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activityTable).omit({
  id: true,
  timestamp: true,
});
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ActivityEntry = typeof activityTable.$inferSelect;
