import { Router } from "express";
import { db } from "@workspace/db";
import { competitorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListCompetitorsParams,
  CreateCompetitorParams,
  CreateCompetitorBody,
  DeleteCompetitorParams,
  AnalyzeCompetitorParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/businesses/:businessId/competitors", async (req, res) => {
  const parsed = ListCompetitorsParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  try {
    const competitors = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.businessId, parsed.data.businessId))
      .orderBy(competitorsTable.createdAt);
    res.json(competitors);
  } catch (err) {
    req.log.error({ err }, "Failed to list competitors");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/businesses/:businessId/competitors", async (req, res) => {
  const paramsParsed = CreateCompetitorParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid businessId" });
  const bodyParsed = CreateCompetitorBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.message });
  try {
    const [competitor] = await db
      .insert(competitorsTable)
      .values({
        businessId: paramsParsed.data.businessId,
        name: bodyParsed.data.name,
        website: bodyParsed.data.website,
        notes: bodyParsed.data.notes,
      })
      .returning();
    res.status(201).json(competitor);
  } catch (err) {
    req.log.error({ err }, "Failed to create competitor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/businesses/:businessId/competitors/:id", async (req, res) => {
  const parsed = DeleteCompetitorParams.safeParse({
    businessId: Number(req.params.businessId),
    id: Number(req.params.id),
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });
  try {
    await db
      .delete(competitorsTable)
      .where(and(eq(competitorsTable.id, parsed.data.id), eq(competitorsTable.businessId, parsed.data.businessId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete competitor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/businesses/:businessId/competitors/:id/analyze", async (req, res) => {
  const parsed = AnalyzeCompetitorParams.safeParse({
    businessId: Number(req.params.businessId),
    id: Number(req.params.id),
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const [competitor] = await db
      .select()
      .from(competitorsTable)
      .where(and(eq(competitorsTable.id, parsed.data.id), eq(competitorsTable.businessId, parsed.data.businessId)));

    if (!competitor) {
      res.write(`data: ${JSON.stringify({ error: "Competitor not found" })}\n\n`);
      res.end();
      return;
    }

    const prompt = `You are a strategic marketing analyst. Provide a comprehensive competitor analysis for:

Company: ${competitor.name}
${competitor.website ? `Website: ${competitor.website}` : ""}
${competitor.notes ? `Notes: ${competitor.notes}` : ""}

Analyze the following areas:
1. **Market Positioning** — How they position themselves and their unique value proposition
2. **Strengths** — Key advantages and what they do well
3. **Weaknesses** — Gaps, limitations, and vulnerabilities
4. **Marketing Strategy** — Content strategy, social presence, advertising approach, SEO strategy
5. **Opportunities** — Where you can outperform or differentiate from them
6. **Threats** — Risks they pose to your business
7. **Actionable Recommendations** — Specific steps to compete more effectively against them

Be specific, strategic, and actionable. Focus on insights that drive marketing decisions.`;

    let strengths = "";
    let weaknesses = "";
    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Extract strengths/weaknesses for storage
    const strengthsMatch = fullResponse.match(/Strengths[^]*?(?=Weaknesses)/i);
    const weaknessesMatch = fullResponse.match(/Weaknesses[^]*?(?=Marketing|Opportunities|$)/i);
    if (strengthsMatch) strengths = strengthsMatch[0].slice(0, 500);
    if (weaknessesMatch) weaknesses = weaknessesMatch[0].slice(0, 500);

    await db
      .update(competitorsTable)
      .set({ strengths, weaknesses, lastAnalyzedAt: new Date() })
      .where(eq(competitorsTable.id, parsed.data.id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to analyze competitor");
    res.write(`data: ${JSON.stringify({ error: "Failed to analyze competitor" })}\n\n`);
    res.end();
  }
});

export default router;
