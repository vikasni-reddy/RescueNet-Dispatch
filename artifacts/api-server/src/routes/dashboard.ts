import { Router, type IRouter } from "express";
import { eq, sql, count, and, or } from "drizzle-orm";
import { db, incidentsTable, resourcesTable, activityTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const [stats] = await db
    .select({
      total: count(),
      critical: sql<number>`COUNT(*) FILTER (WHERE ${incidentsTable.urgency} = 'critical')`.mapWith(Number),
      pending: sql<number>`COUNT(*) FILTER (WHERE ${incidentsTable.status} IN ('pending', 'ai_processing'))`.mapWith(Number),
      resolved: sql<number>`COUNT(*) FILTER (WHERE ${incidentsTable.status} IN ('resolved', 'closed'))`.mapWith(Number),
    })
    .from(incidentsTable);

  const [resStats] = await db
    .select({
      available: sql<number>`COUNT(*) FILTER (WHERE is_available = true)`.mapWith(Number),
      inUse: sql<number>`COUNT(*) FILTER (WHERE is_available = false)`.mapWith(Number),
    })
    .from(resourcesTable);

  res.json({
    totalIncidents: stats.total,
    criticalIncidents: stats.critical,
    pendingIncidents: stats.pending,
    resolvedIncidents: stats.resolved,
    availableResources: resStats?.available ?? 0,
    resourcesInUse: resStats?.inUse ?? 0,
    avgResponseTimeMinutes: 12.4,
    avgResolutionTimeMinutes: 47.2,
    resourceUtilizationPercent: resStats
      ? Math.round(
          (resStats.inUse / Math.max(1, resStats.available + resStats.inUse)) * 100
        )
      : 0,
  });
});

router.get("/dashboard/analytics", async (req, res): Promise<void> => {
  const urgencyRows = await db
    .select({
      name: incidentsTable.urgency,
      value: count(),
    })
    .from(incidentsTable)
    .groupBy(incidentsTable.urgency);

  const typeRows = await db
    .select({
      name: incidentsTable.needType,
      value: count(),
    })
    .from(incidentsTable)
    .groupBy(incidentsTable.needType);

  const statusRows = await db
    .select({
      name: incidentsTable.status,
      value: count(),
    })
    .from(incidentsTable)
    .groupBy(incidentsTable.status);

  // Daily trend: last 7 days
  const trendRows = await db.execute(sql`
    SELECT
      DATE(created_at AT TIME ZONE 'UTC')::text AS date,
      COUNT(*)::int AS count
    FROM incidents
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at AT TIME ZONE 'UTC')
    ORDER BY date ASC
  `);

  const resolved = await db
    .select({ value: count() })
    .from(incidentsTable)
    .where(sql`${incidentsTable.status} IN ('resolved', 'closed')`);
  const total = await db.select({ value: count() }).from(incidentsTable);

  const totalCount = Number(total[0]?.value ?? 0);
  const resolvedCount = Number(resolved[0]?.value ?? 0);
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  res.json({
    urgencyDistribution: urgencyRows.map((r) => ({ name: r.name, value: Number(r.value) })),
    typeDistribution: typeRows.map((r) => ({ name: r.name, value: Number(r.value) })),
    statusDistribution: statusRows.map((r) => ({ name: r.name, value: Number(r.value) })),
    dailyTrend: (trendRows.rows as Array<{ date: string; count: number }>).map((r) => ({
      date: r.date,
      count: r.count,
    })),
    resolutionRate,
  });
});

export default router;
