import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  rawText: text("raw_text").notNull(),
  originalLanguage: text("original_language"),
  translatedText: text("translated_text"),
  needType: text("need_type").notNull().default("other"),
  urgency: text("urgency").notNull().default("low"),
  peopleAffected: integer("people_affected"),
  summary: text("summary"),
  priorityScore: integer("priority_score").notNull().default(0),
  aiConfidence: real("ai_confidence"),
  aiExplanation: text("ai_explanation"),
  aiReasoningFactors: text("ai_reasoning_factors"), // JSON string array
  status: text("status").notNull().default("pending"),
  lat: real("lat"),
  lng: real("lng"),
  address: text("address"),
  contactInfo: text("contact_info"),
  imageUrl: text("image_url"),
  assignedResourceId: integer("assigned_resource_id"),
  assignedResourceName: text("assigned_resource_name"),
  dispatchJustification: text("dispatch_justification"),
  disasterType: text("disaster_type"),
  incidentCategory: text("incident_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
