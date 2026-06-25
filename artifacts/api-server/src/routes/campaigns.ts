import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable, businessesTable, funnelPagesTable } from "@workspace/db";
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
import { openai } from "@workspace/integrations-openai-ai-server";

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

// ---------------------------------------------------------------------------
// AI generate email campaign content (SSE)
// ---------------------------------------------------------------------------

router.post("/businesses/:businessId/campaigns/:id/generate-email", async (req, res) => {
  const params = GetCampaignParams.safeParse({
    businessId: Number(req.params.businessId),
    id: Number(req.params.id),
  });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });
  const { businessId, id } = params.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
    if (!business) { res.write(`data: ${JSON.stringify({ error: "Business not found" })}\n\n`); res.end(); return; }

    const [campaign] = await db.select().from(campaignsTable).where(and(eq(campaignsTable.id, id), eq(campaignsTable.businessId, businessId)));
    if (!campaign) { res.write(`data: ${JSON.stringify({ error: "Campaign not found" })}\n\n`); res.end(); return; }

    let pageInfo = "";
    if (campaign.funnelPageId) {
      const [page] = await db.select().from(funnelPagesTable).where(eq(funnelPagesTable.id, campaign.funnelPageId));
      if (page?.publicSlug) {
        pageInfo = `LANDING PAGE URL: ${req.protocol}://${req.get("host")}/p/${page.publicSlug}`;
      }
    }

    const prompt = `Write a marketing email campaign for this business.

BUSINESS:
- Name: ${business.name}
- Industry: ${business.industry}
- Description: ${business.description}
- Target Audience: ${business.targetAudience ?? "General audience"}

CAMPAIGN:
- Name: ${campaign.name}
- Description: ${campaign.description}
- Channel: ${campaign.channel}
${pageInfo ? "\n" + pageInfo : ""}

Write a compelling email subject line (max 60 chars) and a full marketing email body.

Return ONLY this exact JSON structure, no markdown, no explanation:

{"subject": "<subject line>", "body": "<email body with paragraphs separated by newlines>", "html": "<minimal HTML version of the email with <p> tags for paragraphs and <a> tags for any CTA>"}

Rules:
- Subject line should be irresistible and curiosity-driven
- Body should be 3-5 short paragraphs maximum
- Include a clear single CTA at the end
- Write in a ${campaign.channel === "email" ? "professional" : "engaging"} tone
- Tailor to the business's target audience
- Return valid JSON only`;

    let fullContent = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    try {
      const jsonStart = fullContent.indexOf("{");
      const jsonEnd = fullContent.lastIndexOf("}") + 1;
      const result = JSON.parse(fullContent.slice(jsonStart, jsonEnd));

      const [updated] = await db
        .update(campaignsTable)
        .set({
          emailSubject: result.subject ?? "",
          emailBody: result.body ?? "",
          emailHtml: result.html ?? "",
        })
        .where(and(eq(campaignsTable.id, id), eq(campaignsTable.businessId, businessId)))
        .returning();

      res.write(`data: ${JSON.stringify({ done: true, campaign: updated })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ done: true, parseError: true })}\n\n`);
    }
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to generate email campaign");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

export default router;
