/**
 * Background re-analysis task.
 * Runs once on server startup and updates all incidents that were created
 * before the AI triage pipeline was in place (analysis_mode IS NULL).
 * Uses heuristic analysis only — does not call OpenAI.
 */
import { isNull, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { incidentsTable, timelineTable } from "@workspace/db";
import { heuristicAnalysis, computePriorityScore } from "./ai";
import { logger } from "./logger";

export async function reanalyzeOldIncidents(): Promise<void> {
  try {
    const stale = await db
      .select({
        id: incidentsTable.id,
        rawText: incidentsTable.rawText,
        createdAt: incidentsTable.createdAt,
      })
      .from(incidentsTable)
      .where(isNull(incidentsTable.analysisMode));

    if (stale.length === 0) {
      logger.info("reanalyze: all incidents already have analysis_mode set — skipping");
      return;
    }

    logger.info({ count: stale.length }, "reanalyze: re-running heuristic on stale incidents");

    for (const row of stale) {
      try {
        const analysis = heuristicAnalysis(row.rawText);
        const priorityScore = computePriorityScore(
          analysis.urgency,
          row.rawText,
          analysis.peopleAffected,
          row.createdAt.getTime()
        );

        await db
          .update(incidentsTable)
          .set({
            needType: analysis.needType,
            urgency: analysis.urgency,
            ...(analysis.peopleAffected !== null ? { peopleAffected: analysis.peopleAffected } : {}),
            summary: analysis.summary,
            priorityScore,
            aiConfidence: analysis.aiConfidence,
            aiExplanation: analysis.aiExplanation,
            aiReasoningFactors: JSON.stringify(analysis.reasoningFactors),
            aiRequiredResources: JSON.stringify(analysis.requiredResources),
            ...(analysis.disasterType ? { disasterType: analysis.disasterType } : {}),
            ...(analysis.incidentCategory ? { incidentCategory: analysis.incidentCategory } : {}),
            analysisMode: "heuristic",
          })
          .where(eq(incidentsTable.id, row.id));

        // Add a backfill timeline entry only if no "Report Received" entry exists yet
        const existing = await db
          .select({ id: timelineTable.id })
          .from(timelineTable)
          .where(eq(timelineTable.incidentId, row.id));

        if (existing.length === 0) {
          await db.insert(timelineTable).values([
            {
              incidentId: row.id,
              action: "Report Received",
              details: "Emergency report submitted",
              timestamp: row.createdAt,
            },
            {
              incidentId: row.id,
              action: "Heuristic Analysis Applied",
              details: `Backfill: Priority ${priorityScore}/100 | Urgency: ${analysis.urgency} | Need: ${analysis.needType} | Confidence: ${analysis.aiConfidence}%`,
            },
          ]);
        }

        logger.debug({ id: row.id, urgency: analysis.urgency, needType: analysis.needType }, "reanalyze: updated");
      } catch (err) {
        logger.warn({ err, incidentId: row.id }, "reanalyze: failed for incident — skipping");
      }
    }

    logger.info({ count: stale.length }, "reanalyze: complete");
  } catch (err) {
    logger.error({ err }, "reanalyze: startup task failed");
  }
}
