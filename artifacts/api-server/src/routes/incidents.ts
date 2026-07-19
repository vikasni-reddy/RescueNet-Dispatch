import { Router, type IRouter } from "express";
import { eq, desc, asc, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  incidentsTable,
  resourcesTable,
  timelineTable,
  activityTable,
} from "@workspace/db";
import { analyzeIncident, haversineKm, etaMinutes } from "../lib/ai";
import { broadcast } from "../lib/broadcaster";

const router: IRouter = Router();

// List incidents
router.get("/incidents", async (req, res): Promise<void> => {
  const { status, urgency, needType, sortBy, limit } = req.query as Record<string, string>;

  const conditions = [];
  if (status) conditions.push(eq(incidentsTable.status, status));
  if (urgency) conditions.push(eq(incidentsTable.urgency, urgency));
  if (needType) conditions.push(eq(incidentsTable.needType, needType));

  const limitNum = limit ? parseInt(limit, 10) : 200;

  let orderCol;
  if (sortBy === "newest") orderCol = desc(incidentsTable.createdAt);
  else if (sortBy === "oldest") orderCol = asc(incidentsTable.createdAt);
  else orderCol = desc(incidentsTable.priorityScore); // default: priority

  const rows = await db
    .select()
    .from(incidentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderCol)
    .limit(limitNum);

  res.json(rows.map(serializeIncident));
});

// Create incident (triggers AI analysis)
router.post("/incidents", async (req, res): Promise<void> => {
  const { rawText, address, lat, lng, contactInfo, imageUrl } = req.body;

  if (!rawText || typeof rawText !== "string") {
    res.status(400).json({ error: "rawText is required" });
    return;
  }

  // Insert with processing status
  const [created] = await db
    .insert(incidentsTable)
    .values({
      rawText,
      address: address ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      contactInfo: contactInfo ?? null,
      imageUrl: imageUrl ?? null,
      status: "ai_processing",
    })
    .returning();

  // Timeline: report received
  await db.insert(timelineTable).values({
    incidentId: created.id,
    action: "Report Received",
    details: "Emergency report submitted by citizen and queued for AI triage",
  });

  // Run AI analysis (full GPT-4o-mini or heuristic fallback)
  const analysis = await analyzeIncident(rawText);

  const [updated] = await db
    .update(incidentsTable)
    .set({
      originalLanguage: analysis.languageDetected,
      translatedText: analysis.translatedText,
      needType: analysis.needType,
      urgency: analysis.urgency,
      peopleAffected: analysis.peopleAffected,
      summary: analysis.summary,
      priorityScore: analysis.priorityScore,
      aiConfidence: analysis.aiConfidence,
      aiExplanation: analysis.aiExplanation,
      aiReasoningFactors: JSON.stringify(analysis.reasoningFactors),
      aiRequiredResources: JSON.stringify(analysis.requiredResources),
      analysisMode: analysis.analysisMode,
      disasterType: analysis.disasterType,
      incidentCategory: analysis.incidentCategory,
      status: "pending",
    })
    .where(eq(incidentsTable.id, created.id))
    .returning();

  // Timeline: AI analysis
  const modeLabel = analysis.analysisMode === "full_ai" ? "AI Analysis Complete" : "Heuristic Analysis Applied";
  await db.insert(timelineTable).values({
    incidentId: updated.id,
    action: modeLabel,
    details: `Priority: ${updated.priorityScore}/100 | Urgency: ${updated.urgency} | Need: ${updated.needType} | Confidence: ${updated.aiConfidence}%`,
  });

  // Timeline: resource recommendation (based on required resource types)
  if (analysis.requiredResources.length > 0) {
    await db.insert(timelineTable).values({
      incidentId: updated.id,
      action: "Resource Recommendation Generated",
      details: `Recommended resource types: ${analysis.requiredResources.join(", ")}`,
    });
  }

  await db.insert(activityTable).values({
    action: `New ${updated.urgency} emergency reported`,
    incidentId: updated.id,
    incidentSummary: updated.summary,
    urgency: updated.urgency,
  });

  // Broadcast to all connected operator dashboards immediately
  broadcast("incident:new", {
    id: updated.id,
    urgency: updated.urgency,
    priorityScore: updated.priorityScore,
    summary: updated.summary,
  });

  res.status(201).json(serializeIncident(updated));
});

// Get incident by ID
router.get("/incidents/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeIncident(row));
});

// Update incident
router.patch("/incidents/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status, assignedResourceId, lat, lng, address } = req.body;
  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (assignedResourceId !== undefined) updateData.assignedResourceId = assignedResourceId;
  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (address !== undefined) updateData.address = address;

  const [updated] = await db
    .update(incidentsTable)
    .set(updateData as Parameters<typeof db.update>[0])
    .where(eq(incidentsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  if (status) {
    const statusLabels: Record<string, string> = {
      pending: "Awaiting Dispatch",
      dispatched: "Resource Dispatched",
      en_route: "Unit En Route",
      in_progress: "Response In Progress",
      resolved: "Incident Resolved",
      closed: "Incident Closed",
    };
    await db.insert(timelineTable).values({
      incidentId: id,
      action: statusLabels[status] ?? `Status: ${status}`,
      details: `Status updated to "${status.replace(/_/g, " ")}"`,
    });
    broadcast("incident:updated", { id, status });
  }

  res.json(serializeIncident(updated));
});

// Delete incident
router.delete("/incidents/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(incidentsTable).where(eq(incidentsTable.id, id));
  res.status(204).send();
});

// Assign resource to incident
router.post("/incidents/:id/assign", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { resourceId, justification } = req.body;
  if (!resourceId) { res.status(400).json({ error: "resourceId required" }); return; }

  const [incident] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, id));
  if (!incident) { res.status(404).json({ error: "Incident not found" }); return; }

  const [resource] = await db.select().from(resourcesTable).where(eq(resourcesTable.id, resourceId));
  if (!resource) { res.status(404).json({ error: "Resource not found" }); return; }

  const [updated] = await db
    .update(incidentsTable)
    .set({
      assignedResourceId: resourceId,
      assignedResourceName: resource.name,
      dispatchJustification: justification ?? null,
      status: "dispatched",
    })
    .where(eq(incidentsTable.id, id))
    .returning();

  await db
    .update(resourcesTable)
    .set({
      isAvailable: false,
      status: "en_route",
      assignedIncidentId: id,
    })
    .where(eq(resourcesTable.id, resourceId));

  await db.insert(timelineTable).values([
    {
      incidentId: id,
      action: "Resource Dispatched",
      details: `${resource.name} (${resource.type}) assigned to incident — ${justification ?? "dispatched by operator"}`,
    },
    {
      incidentId: id,
      action: `${resource.name} En Route`,
      details: `Unit is traveling to the incident location`,
    },
  ]);

  await db.insert(activityTable).values({
    action: `${resource.name} dispatched`,
    resourceName: resource.name,
    incidentId: id,
    incidentSummary: incident.summary,
    urgency: incident.urgency,
  });

  broadcast("incident:dispatched", { id, resourceName: resource.name });

  res.json(serializeIncident(updated));
});

// Get resource recommendations for an incident
router.get("/incidents/:id/recommendations", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [incident] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, id));
  if (!incident) { res.status(404).json({ error: "Incident not found" }); return; }

  const resources = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.isAvailable, true));

  // Parse AI-recommended resource types (may be JSON array)
  let aiRecommendedTypes: string[] = [];
  if (incident.aiRequiredResources) {
    try {
      const parsed = JSON.parse(incident.aiRequiredResources);
      if (Array.isArray(parsed)) aiRecommendedTypes = parsed;
    } catch { /* ignore */ }
  }

  if (!incident.lat || !incident.lng) {
    // No coordinates — rank by type match only, no distance/ETA
    const scored = resources
      .map((r) => {
        const aiMatch = aiRecommendedTypes.includes(r.type);
        const typeScore = typeMatch(r.type, incident.needType) ? 40 : 0;
        const aiBonus = aiMatch ? 20 : 0;
        const totalScore = typeScore + aiBonus;
        return {
          resource: serializeResource(r),
          distance: null as number | null,
          reason: buildReason(r, null, incident.needType, aiRecommendedTypes),
          eta: "N/A — no coordinates",
          confidence: Math.min(95, 45 + totalScore / 2),
          _score: totalScore,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score, ...rest }) => rest);

    res.json(scored);
    return;
  }

  const scored = resources
    .map((r) => {
      const dist = haversineKm(incident.lat!, incident.lng!, r.lat, r.lng);
      const aiMatch = aiRecommendedTypes.includes(r.type);
      const typeScore = typeMatch(r.type, incident.needType) ? 40 : 0;
      const aiBonus = aiMatch ? 20 : 0;
      const distScore = Math.max(0, 40 - dist * 4);
      const capScore = r.capacity ? Math.min(20, r.capacity) : 10;
      const totalScore = typeScore + aiBonus + distScore + capScore;
      const eta = etaMinutes(dist);
      return {
        resource: serializeResource(r),
        distance: Math.round(dist * 10) / 10,
        reason: buildReason(r, dist, incident.needType, aiRecommendedTypes),
        eta: `${eta} minute${eta !== 1 ? "s" : ""}`,
        confidence: Math.min(98, 42 + totalScore / 2),
        _score: totalScore,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)
    .map(({ _score, ...rest }) => rest);

  res.json(scored);
});

// Get incident timeline
router.get("/incidents/:id/timeline", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const entries = await db
    .select()
    .from(timelineTable)
    .where(eq(timelineTable.incidentId, id))
    .orderBy(asc(timelineTable.timestamp));

  res.json(entries.map((e) => ({
    id: e.id,
    incidentId: e.incidentId,
    action: e.action,
    details: e.details,
    timestamp: e.timestamp.toISOString(),
  })));
});

// --- Helpers ---
function parseId(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

function serializeIncident(r: typeof incidentsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function serializeResource(r: typeof resourcesTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// Maps resource types to compatible emergency need types
function typeMatch(resourceType: string, needType: string | null | undefined): boolean {
  const map: Record<string, string[]> = {
    medical:  ["medical", "rescue"],
    rescue:   ["rescue", "medical", "other"],
    fire:     ["fire", "rescue"],
    police:   ["police", "other"],
    boat:     ["rescue", "flood"],
    food:     ["food", "water", "shelter"],
    shelter:  ["shelter", "other"],
    water:    ["water", "food"],
  };
  return (map[resourceType] ?? []).includes(needType ?? "other");
}

const RESOURCE_DESCRIPTIONS: Record<string, string> = {
  medical:  "Medical team with emergency care capability",
  rescue:   "Rescue squad for extraction and evacuation",
  fire:     "Fire suppression and hazmat unit",
  police:   "Law enforcement and crowd control unit",
  boat:     "Water rescue vessel for flood/drowning response",
  food:     "Food supply and distribution unit",
  shelter:  "Emergency shelter and temporary housing unit",
  water:    "Clean water supply and sanitation unit",
};

function buildReason(
  r: typeof resourcesTable.$inferSelect,
  distKm: number | null,
  needType: string | null | undefined,
  aiRecommendedTypes: string[]
): string {
  const parts: string[] = [];

  const isAiRecommended = aiRecommendedTypes.includes(r.type);
  const isTypeMatch = typeMatch(r.type, needType);

  if (isAiRecommended) {
    parts.push(`AI-recommended resource type for this incident`);
  } else if (isTypeMatch) {
    parts.push(`Compatible with ${needType ?? "this"} emergency`);
  } else {
    parts.push(`General-purpose resource — type may not be ideal for ${needType ?? "this"} emergency`);
  }

  const desc = RESOURCE_DESCRIPTIONS[r.type];
  if (desc) parts.push(desc);

  if (distKm !== null) {
    const eta = etaMinutes(distKm);
    parts.push(`${distKm.toFixed(1)} km away — ETA ~${eta} min at emergency speed`);
  }

  if (r.capacity && r.capacity > 0) {
    parts.push(`capacity: ${r.capacity} persons`);
  }

  return parts.join(". ") + ".";
}

export default router;
