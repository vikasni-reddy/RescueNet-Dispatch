import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, resourcesTable } from "@workspace/db";

const router: IRouter = Router();

// List resources
router.get("/resources", async (req, res): Promise<void> => {
  const { type, isAvailable } = req.query as Record<string, string>;

  const conditions = [];
  if (type) conditions.push(eq(resourcesTable.type, type));
  if (isAvailable !== undefined) {
    conditions.push(eq(resourcesTable.isAvailable, isAvailable === "true"));
  }

  const rows = await db
    .select()
    .from(resourcesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(resourcesTable.name);

  res.json(rows.map(serialize));
});

// Create resource
router.post("/resources", async (req, res): Promise<void> => {
  const { name, type, capacity, lat, lng } = req.body;
  if (!name || !type || lat === undefined || lng === undefined) {
    res.status(400).json({ error: "name, type, lat, lng required" });
    return;
  }
  const [created] = await db
    .insert(resourcesTable)
    .values({ name, type, capacity: capacity ?? null, lat, lng })
    .returning();
  res.status(201).json(serialize(created));
});

// Get resource
router.get("/resources/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [row] = await db.select().from(resourcesTable).where(eq(resourcesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

// Update resource
router.patch("/resources/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status, isAvailable, lat, lng, assignedIncidentId } = req.body;
  const patch: Record<string, unknown> = {};
  if (status !== undefined) patch.status = status;
  if (isAvailable !== undefined) patch.isAvailable = isAvailable;
  if (lat !== undefined) patch.lat = lat;
  if (lng !== undefined) patch.lng = lng;
  if (assignedIncidentId !== undefined) patch.assignedIncidentId = assignedIncidentId;

  const [updated] = await db
    .update(resourcesTable)
    .set(patch as Parameters<typeof db.update>[0])
    .where(eq(resourcesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(updated));
});

// Delete resource
router.delete("/resources/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(resourcesTable).where(eq(resourcesTable.id, id));
  res.status(204).send();
});

function parseId(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

function serialize(r: typeof resourcesTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export default router;
