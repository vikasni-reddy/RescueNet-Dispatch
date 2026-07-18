import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, activityTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/activity", async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) ?? "30", 10);

  const rows = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.timestamp))
    .limit(limit);

  res.json(
    rows.map((r) => ({
      id: r.id,
      action: r.action,
      resourceName: r.resourceName,
      incidentId: r.incidentId,
      incidentSummary: r.incidentSummary,
      urgency: r.urgency,
      timestamp: r.timestamp.toISOString(),
    }))
  );
});

export default router;
