import { Router } from "express";
import { db } from "@workspace/db";
import { keywordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListKeywordsParams, RunSeoResearchParams, RunSeoResearchBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/businesses/:businessId/seo/keywords", async (req, res) => {
  const parsed = ListKeywordsParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  try {
    const keywords = await db
      .select()
      .from(keywordsTable)
      .where(eq(keywordsTable.businessId, parsed.data.businessId))
      .orderBy(keywordsTable.createdAt);
    res.json(keywords);
  } catch (err) {
    req.log.error({ err }, "Failed to list keywords");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/businesses/:businessId/seo/research", async (req, res) => {
  const paramsParsed = RunSeoResearchParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid businessId" });
  const bodyParsed = RunSeoResearchBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.message });
  const businessId = paramsParsed.data.businessId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const prompt = `You are an expert SEO strategist. Perform comprehensive keyword research for the following topic.

Topic: ${bodyParsed.data.topic}
${bodyParsed.data.additionalContext ? `Context: ${bodyParsed.data.additionalContext}` : ""}

Provide:
1. A list of 10-15 primary and long-tail keywords with estimated search volume (monthly), difficulty (1-100), and search intent (informational/navigational/commercial/transactional).
2. A brief analysis of the competitive landscape for this topic.
3. Content recommendations to rank for these keywords.

Format the keyword list as JSON at the end of your response in this exact format:
\`\`\`json
[
  { "keyword": "example keyword", "searchVolume": 1000, "difficulty": 45, "intent": "informational", "notes": "brief note" }
]
\`\`\``;

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

    // Extract and save keywords from response
    try {
      const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const keywords = JSON.parse(jsonMatch[1]);
        for (const kw of keywords) {
          await db.insert(keywordsTable).values({
            businessId,
            keyword: kw.keyword,
            searchVolume: kw.searchVolume,
            difficulty: kw.difficulty,
            intent: kw.intent,
            notes: kw.notes,
          }).onConflictDoNothing();
        }
      }
    } catch {
      // silently ignore parsing errors
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to run SEO research");
    res.write(`data: ${JSON.stringify({ error: "Failed to run SEO research" })}\n\n`);
    res.end();
  }
});

export default router;
