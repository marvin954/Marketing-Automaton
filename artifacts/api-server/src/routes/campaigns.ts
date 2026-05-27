import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import {
  ListCampaignsParams,
  CreateCampaignParams,
  CreateCampaignBody,
  GetCampaignParams,
  UpdateCampaignParams,
  UpdateCampaignBody,
  DeleteCampaignParams,
  GetCampaignsSummaryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/businesses/:businessId/campaigns", async (req, res) => {
  const parsed = ListCampaignsParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  try {
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.businessId, parsed.data.businessId))
      .orderBy(campaignsTable.createdAt);
    res.json(campaigns);
  } catch (err) {
    req.log.error({ err }, "Failed to list campaigns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/businesses/:businessId/campaigns", async (req, res) => {
  const paramsParsed = CreateCampaignParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid businessId" });
  const bodyParsed = CreateCampaignBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.message });
  try {
    const [campaign] = await db
      .insert(campaignsTable)
      .values({
        businessId: paramsParsed.data.businessId,
        name: bodyParsed.data.name,
        description: bodyParsed.data.description,
        channel: bodyParsed.data.channel,
        status: "draft",
        startDate: bodyParsed.data.startDate,
        endDate: bodyParsed.data.endDate,
        budget: bodyParsed.data.budget,
      })
      .returning();
    res.status(201).json(campaign);
  } catch (err) {
    req.log.error({ err }, "Failed to create campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/businesses/:businessId/campaigns/summary", async (req, res) => {
  const parsed = GetCampaignsSummaryParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  try {
    const rows = await db
      .select({ status: campaignsTable.status, count: count() })
      .from(campaignsTable)
      .where(eq(campaignsTable.businessId, parsed.data.businessId))
      .groupBy(campaignsTable.status);

    const summary = { draft: 0, active: 0, paused: 0, completed: 0, total: 0 };
    for (const row of rows) {
      const s = row.status as keyof typeof summary;
      if (s in summary) summary[s] = row.count;
      summary.total += row.count;
    }
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to get campaigns summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/businesses/:businessId/campaigns/:id", async (req, res) => {
  const parsed = GetCampaignParams.safeParse({
    businessId: Number(req.params.businessId),
    id: Number(req.params.id),
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });
  try {
    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(and(eq(campaignsTable.id, parsed.data.id), eq(campaignsTable.businessId, parsed.data.businessId)));
    if (!campaign) return res.status(404).json({ error: "Not found" });
    res.json(campaign);
  } catch (err) {
    req.log.error({ err }, "Failed to get campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/businesses/:businessId/campaigns/:id", async (req, res) => {
  const paramsParsed = UpdateCampaignParams.safeParse({
    businessId: Number(req.params.businessId),
    id: Number(req.params.id),
  });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid params" });
  const bodyParsed = UpdateCampaignBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.message });
  try {
    const [campaign] = await db
      .update(campaignsTable)
      .set(bodyParsed.data)
      .where(and(eq(campaignsTable.id, paramsParsed.data.id), eq(campaignsTable.businessId, paramsParsed.data.businessId)))
      .returning();
    if (!campaign) return res.status(404).json({ error: "Not found" });
    res.json(campaign);
  } catch (err) {
    req.log.error({ err }, "Failed to update campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/businesses/:businessId/campaigns/:id", async (req, res) => {
  const parsed = DeleteCampaignParams.safeParse({
    businessId: Number(req.params.businessId),
    id: Number(req.params.id),
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });
  try {
    await db
      .delete(campaignsTable)
      .where(and(eq(campaignsTable.id, parsed.data.id), eq(campaignsTable.businessId, parsed.data.businessId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
