import { Router } from "express";
import { db } from "@workspace/db";
import { contentTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  FetchContentParams,
  GenerateContentParams,
  GenerateContentBody,
  GetContentParams,
  DeleteContentParams,
  ListRecentContentParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/businesses/:businessId/content", async (req, res) => {
  const parsed = FetchContentParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  try {
    const content = await db
      .select()
      .from(contentTable)
      .where(eq(contentTable.businessId, parsed.data.businessId))
      .orderBy(desc(contentTable.createdAt));
    res.json(content);
  } catch (err) {
    req.log.error({ err }, "Failed to list content");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/businesses/:businessId/content/recent", async (req, res) => {
  const parsed = ListRecentContentParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  try {
    const content = await db
      .select()
      .from(contentTable)
      .where(eq(contentTable.businessId, parsed.data.businessId))
      .orderBy(desc(contentTable.createdAt))
      .limit(10);
    res.json(content);
  } catch (err) {
    req.log.error({ err }, "Failed to list recent content");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/businesses/:businessId/content", async (req, res) => {
  const paramsParsed = GenerateContentParams.safeParse({ businessId: Number(req.params.businessId) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid businessId" });
  const bodyParsed = GenerateContentBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.message });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const businessId = paramsParsed.data.businessId;
  const { type, topic, tone, platform, additionalContext } = bodyParsed.data;

  const typePrompts: Record<string, string> = {
    blog: `Write a comprehensive, well-structured blog post`,
    social: `Write engaging social media content`,
    email: `Write a compelling marketing email`,
    ad: `Write high-converting ad copy`,
    strategy: `Create a detailed marketing strategy document`,
  };

  const typeInstruction = typePrompts[type] ?? `Write marketing content`;

  const prompt = `You are an expert marketing copywriter and strategist. ${typeInstruction} about the following topic.

Topic: ${topic}
${tone ? `Tone: ${tone}` : ""}
${platform ? `Platform/Channel: ${platform}` : ""}
${additionalContext ? `Additional context: ${additionalContext}` : ""}

${type === "blog" ? "Include an engaging title, introduction, key sections with headers, and a conclusion." : ""}
${type === "social" ? "Make it concise, engaging, and platform-appropriate. Include relevant hashtag suggestions." : ""}
${type === "email" ? "Include a compelling subject line, preview text, body content, and a clear call-to-action." : ""}
${type === "ad" ? "Include headline options, body copy variations, and a strong call-to-action." : ""}
${type === "strategy" ? "Include situation analysis, target audience, key messages, channel strategy, and KPIs." : ""}

Start with a clear title on the first line, then the content.`;

  try {
    let fullContent = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
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

    // Save generated content to DB
    const lines = fullContent.split("\n");
    const title = lines[0]?.replace(/^#+ /, "").trim() || topic;
    const body = fullContent;

    const [saved] = await db
      .insert(contentTable)
      .values({
        businessId,
        type,
        title,
        body,
        platform: platform ?? null,
        tone: tone ?? null,
        status: "draft",
      })
      .returning();

    res.write(`data: ${JSON.stringify({ done: true, contentId: saved.id })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to generate content");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate content" })}\n\n`);
    res.end();
  }
});

router.get("/businesses/:businessId/content/:id", async (req, res) => {
  const parsed = GetContentParams.safeParse({
    businessId: Number(req.params.businessId),
    id: Number(req.params.id),
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });
  try {
    const [content] = await db
      .select()
      .from(contentTable)
      .where(and(eq(contentTable.id, parsed.data.id), eq(contentTable.businessId, parsed.data.businessId)));
    if (!content) return res.status(404).json({ error: "Not found" });
    res.json(content);
  } catch (err) {
    req.log.error({ err }, "Failed to get content");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/businesses/:businessId/content/:id", async (req, res) => {
  const parsed = DeleteContentParams.safeParse({
    businessId: Number(req.params.businessId),
    id: Number(req.params.id),
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });
  try {
    await db
      .delete(contentTable)
      .where(and(eq(contentTable.id, parsed.data.id), eq(contentTable.businessId, parsed.data.businessId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete content");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
