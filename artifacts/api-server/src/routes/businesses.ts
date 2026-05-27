import { Router } from "express";
import { db } from "@workspace/db";
import {
  businessesTable,
  contentTable,
  campaignsTable,
  keywordsTable,
  competitorsTable,
} from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import {
  CreateBusinessBody,
  UpdateBusinessBody,
  GetBusinessParams,
  UpdateBusinessParams,
  DeleteBusinessParams,
  GetBusinessStatsParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/businesses", async (req, res) => {
  try {
    const businesses = await db.select().from(businessesTable).orderBy(businessesTable.createdAt);
    res.json(businesses);
  } catch (err) {
    req.log.error({ err }, "Failed to list businesses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/businesses", async (req, res) => {
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const [business] = await db
      .insert(businessesTable)
      .values({
        name: parsed.data.name,
        industry: parsed.data.industry,
        description: parsed.data.description,
        website: parsed.data.website,
        targetAudience: parsed.data.targetAudience,
      })
      .returning();
    res.status(201).json(business);
  } catch (err) {
    req.log.error({ err }, "Failed to create business");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/businesses/:id", async (req, res) => {
  const parsed = GetBusinessParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });
  try {
    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, parsed.data.id));
    if (!business) return res.status(404).json({ error: "Not found" });
    res.json(business);
  } catch (err) {
    req.log.error({ err }, "Failed to get business");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/businesses/:id", async (req, res) => {
  const paramsParsed = UpdateBusinessParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });
  const bodyParsed = UpdateBusinessBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.message });
  try {
    const [business] = await db
      .update(businessesTable)
      .set({ ...bodyParsed.data, updatedAt: new Date() })
      .where(eq(businessesTable.id, paramsParsed.data.id))
      .returning();
    if (!business) return res.status(404).json({ error: "Not found" });
    res.json(business);
  } catch (err) {
    req.log.error({ err }, "Failed to update business");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/businesses/:id", async (req, res) => {
  const parsed = DeleteBusinessParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.delete(businessesTable).where(eq(businessesTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete business");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/businesses/:id/stats", async (req, res) => {
  const parsed = GetBusinessStatsParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });
  const id = parsed.data.id;
  try {
    const [totalContentRow] = await db
      .select({ count: count() })
      .from(contentTable)
      .where(eq(contentTable.businessId, id));

    const [activeCampaignsRow] = await db
      .select({ count: count() })
      .from(campaignsTable)
      .where(eq(campaignsTable.businessId, id));

    const [totalKeywordsRow] = await db
      .select({ count: count() })
      .from(keywordsTable)
      .where(eq(keywordsTable.businessId, id));

    const [totalCompetitorsRow] = await db
      .select({ count: count() })
      .from(competitorsTable)
      .where(eq(competitorsTable.businessId, id));

    const contentByTypeRows = await db
      .select({ type: contentTable.type, count: count() })
      .from(contentTable)
      .where(eq(contentTable.businessId, id))
      .groupBy(contentTable.type);

    const contentByType: Record<string, number> = {};
    for (const row of contentByTypeRows) {
      contentByType[row.type] = row.count;
    }

    res.json({
      totalContent: totalContentRow?.count ?? 0,
      activeCampaigns: activeCampaignsRow?.count ?? 0,
      totalKeywords: totalKeywordsRow?.count ?? 0,
      totalCompetitors: totalCompetitorsRow?.count ?? 0,
      contentByType,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get business stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
