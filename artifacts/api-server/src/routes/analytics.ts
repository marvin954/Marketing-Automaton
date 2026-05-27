import { Router } from "express";
import { db } from "@workspace/db";
import { contentTable, campaignsTable, keywordsTable, competitorsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { FetchAnalyticsParams, GetActivityFeedParams } from "@workspace/api-zod";

const router = Router();

router.get("/businesses/:businessId/analytics", async (req, res) => {
  const parsed = FetchAnalyticsParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  const businessId = parsed.data.businessId;
  try {
    const [contentCount] = await db.select({ count: count() }).from(contentTable).where(eq(contentTable.businessId, businessId));
    const [campaignCount] = await db.select({ count: count() }).from(campaignsTable).where(eq(campaignsTable.businessId, businessId));
    const [keywordCount] = await db.select({ count: count() }).from(keywordsTable).where(eq(keywordsTable.businessId, businessId));
    const [competitorCount] = await db.select({ count: count() }).from(competitorsTable).where(eq(competitorsTable.businessId, businessId));

    const contentByTypeRows = await db
      .select({ type: contentTable.type, count: count() })
      .from(contentTable)
      .where(eq(contentTable.businessId, businessId))
      .groupBy(contentTable.type);

    const campaignByChannelRows = await db
      .select({ channel: campaignsTable.channel, count: count() })
      .from(campaignsTable)
      .where(eq(campaignsTable.businessId, businessId))
      .groupBy(campaignsTable.channel);

    res.json({
      period: "30d",
      contentGenerated: contentCount?.count ?? 0,
      campaignsRun: campaignCount?.count ?? 0,
      keywordsTracked: keywordCount?.count ?? 0,
      competitorsAnalyzed: competitorCount?.count ?? 0,
      contentByType: contentByTypeRows.map(r => ({ label: r.type, value: r.count })),
      campaignActivity: campaignByChannelRows.map(r => ({ label: r.channel, value: r.count })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get analytics");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/businesses/:businessId/analytics/activity", async (req, res) => {
  const parsed = GetActivityFeedParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  const businessId = parsed.data.businessId;
  try {
    const recentContent = await db
      .select()
      .from(contentTable)
      .where(eq(contentTable.businessId, businessId))
      .orderBy(contentTable.createdAt)
      .limit(5);

    const recentCampaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.businessId, businessId))
      .orderBy(campaignsTable.createdAt)
      .limit(5);

    const activities = [
      ...recentContent.map(c => ({
        id: c.id,
        type: "content",
        description: `Generated ${c.type} content: "${c.title}"`,
        createdAt: c.createdAt,
      })),
      ...recentCampaigns.map(c => ({
        id: c.id + 10000,
        type: "campaign",
        description: `Campaign created: "${c.name}" (${c.channel})`,
        createdAt: c.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    res.json(activities);
  } catch (err) {
    req.log.error({ err }, "Failed to get activity feed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
