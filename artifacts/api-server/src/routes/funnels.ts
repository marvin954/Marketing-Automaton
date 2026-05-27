import { Router } from "express";
import { db } from "@workspace/db";
import { businessesTable, funnelsTable, funnelPagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListFunnelsParams,
  CreateFunnelParams,
  CreateFunnelBody,
  GetFunnelParams,
  DeleteFunnelParams,
  UpdateFunnelPageParams,
  UpdateFunnelPageBody,
  GenerateFunnelPageParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

type SectionType = "hero" | "features" | "social_proof" | "pricing" | "faq" | "cta" | "optin" | "video";

interface TemplatePageDef {
  name: string;
  type: string;
  sectionTypes: SectionType[];
}

const FUNNEL_TEMPLATES: Record<string, { label: string; pages: TemplatePageDef[] }> = {
  lead_generation: {
    label: "Lead Generation",
    pages: [
      { name: "Landing Page", type: "landing", sectionTypes: ["hero", "features", "social_proof", "cta"] },
      { name: "Opt-in Form", type: "optin", sectionTypes: ["hero", "optin"] },
      { name: "Thank You", type: "thankyou", sectionTypes: ["hero", "cta"] },
    ],
  },
  product_launch: {
    label: "Product Launch",
    pages: [
      { name: "Hero Page", type: "landing", sectionTypes: ["hero", "features"] },
      { name: "Social Proof", type: "proof", sectionTypes: ["social_proof", "features"] },
      { name: "Pricing Page", type: "pricing", sectionTypes: ["pricing", "faq", "cta"] },
      { name: "Checkout", type: "checkout", sectionTypes: ["optin", "cta"] },
    ],
  },
  webinar: {
    label: "Webinar Registration",
    pages: [
      { name: "Registration", type: "registration", sectionTypes: ["hero", "features", "optin"] },
      { name: "Confirmation", type: "confirmation", sectionTypes: ["hero", "social_proof"] },
      { name: "Reminder", type: "reminder", sectionTypes: ["hero", "cta"] },
    ],
  },
  free_trial: {
    label: "Free Trial",
    pages: [
      { name: "Landing Page", type: "landing", sectionTypes: ["hero", "features", "pricing"] },
      { name: "Signup Form", type: "signup", sectionTypes: ["hero", "optin"] },
      { name: "Welcome", type: "welcome", sectionTypes: ["hero", "features", "cta"] },
    ],
  },
  sales_letter: {
    label: "Sales Letter",
    pages: [
      { name: "Sales Page", type: "sales", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Order Page", type: "order", sectionTypes: ["optin", "cta"] },
    ],
  },
  content_upgrade: {
    label: "Content Upgrade",
    pages: [
      { name: "Blog CTA", type: "blog_cta", sectionTypes: ["hero", "cta"] },
      { name: "Opt-in Page", type: "optin", sectionTypes: ["hero", "optin"] },
      { name: "Download Page", type: "download", sectionTypes: ["hero", "cta"] },
    ],
  },
  event_registration: {
    label: "Event Registration",
    pages: [
      { name: "Event Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "optin"] },
      { name: "Confirmation", type: "confirmation", sectionTypes: ["hero", "cta"] },
    ],
  },
  ebook_download: {
    label: "eBook / Guide",
    pages: [
      { name: "Book Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "optin"] },
      { name: "Download Page", type: "download", sectionTypes: ["hero", "cta"] },
    ],
  },
  consultation_booking: {
    label: "Book a Consultation",
    pages: [
      { name: "Booking Page", type: "landing", sectionTypes: ["hero", "features", "social_proof", "optin"] },
      { name: "Confirmation", type: "confirmation", sectionTypes: ["hero", "cta"] },
    ],
  },
  flash_sale: {
    label: "Flash Sale",
    pages: [
      { name: "Sale Page", type: "landing", sectionTypes: ["hero", "pricing", "social_proof", "faq", "cta"] },
      { name: "Order Page", type: "order", sectionTypes: ["optin", "cta"] },
      { name: "Thank You", type: "thankyou", sectionTypes: ["hero", "cta"] },
    ],
  },
  app_download: {
    label: "App Download",
    pages: [
      { name: "App Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "cta"] },
      { name: "App Store Page", type: "appstore", sectionTypes: ["hero", "pricing", "cta"] },
    ],
  },
  membership: {
    label: "Membership / Community",
    pages: [
      { name: "Membership Page", type: "landing", sectionTypes: ["hero", "features", "pricing", "social_proof", "faq", "cta"] },
      { name: "Join Form", type: "join", sectionTypes: ["optin", "cta"] },
      { name: "Welcome", type: "welcome", sectionTypes: ["hero", "cta"] },
    ],
  },
  course_enrollment: {
    label: "Course Enrollment",
    pages: [
      { name: "Course Landing", type: "landing", sectionTypes: ["hero", "video", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Enrollment Form", type: "enrollment", sectionTypes: ["optin", "cta"] },
      { name: "Student Welcome", type: "welcome", sectionTypes: ["hero", "cta"] },
    ],
  },
  referral: {
    label: "Referral Program",
    pages: [
      { name: "Referral Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "optin"] },
      { name: "Reward Page", type: "reward", sectionTypes: ["hero", "pricing", "cta"] },
    ],
  },
  quiz_funnel: {
    label: "Quiz / Survey",
    pages: [
      { name: "Quiz Start", type: "quiz", sectionTypes: ["hero", "cta"] },
      { name: "Results Page", type: "results", sectionTypes: ["hero", "social_proof", "optin"] },
      { name: "Offer Page", type: "offer", sectionTypes: ["pricing", "faq", "cta"] },
    ],
  },
  waitlist: {
    label: "Product Waitlist",
    pages: [
      { name: "Coming Soon", type: "waitlist", sectionTypes: ["hero", "features", "optin"] },
      { name: "Confirmed", type: "confirmation", sectionTypes: ["hero", "social_proof"] },
    ],
  },
  // ── Business-type templates ──────────────────────────────────────────────
  restaurant: {
    label: "Restaurant / Dining",
    pages: [
      { name: "Menu Showcase", type: "landing", sectionTypes: ["hero", "video", "features", "social_proof", "cta"] },
      { name: "Reservation Form", type: "reservation", sectionTypes: ["hero", "optin"] },
    ],
  },
  ecommerce: {
    label: "Online Store",
    pages: [
      { name: "Store Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "cta"] },
      { name: "Featured Product", type: "product", sectionTypes: ["hero", "video", "features", "pricing", "faq", "cta"] },
      { name: "Checkout", type: "checkout", sectionTypes: ["optin", "cta"] },
    ],
  },
  real_estate: {
    label: "Real Estate",
    pages: [
      { name: "Agency Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "cta"] },
      { name: "Property Listings", type: "listings", sectionTypes: ["features", "pricing"] },
      { name: "Buyer Inquiry", type: "inquiry", sectionTypes: ["hero", "optin"] },
    ],
  },
  law_firm: {
    label: "Law Firm",
    pages: [
      { name: "Practice Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "faq", "cta"] },
      { name: "Case Intake", type: "intake", sectionTypes: ["hero", "optin"] },
    ],
  },
  healthcare: {
    label: "Healthcare / Clinic",
    pages: [
      { name: "Practice Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "faq", "cta"] },
      { name: "Appointment Booking", type: "booking", sectionTypes: ["hero", "optin"] },
      { name: "Confirmation", type: "confirmation", sectionTypes: ["hero", "cta"] },
    ],
  },
  fitness: {
    label: "Gym / Fitness Studio",
    pages: [
      { name: "Studio Landing", type: "landing", sectionTypes: ["hero", "video", "features", "pricing", "social_proof", "cta"] },
      { name: "Free Trial Signup", type: "signup", sectionTypes: ["hero", "optin"] },
      { name: "Welcome", type: "welcome", sectionTypes: ["hero", "features", "cta"] },
    ],
  },
  beauty_salon: {
    label: "Beauty Salon / Spa",
    pages: [
      { name: "Salon Showcase", type: "landing", sectionTypes: ["hero", "features", "pricing", "social_proof", "cta"] },
      { name: "Online Booking", type: "booking", sectionTypes: ["hero", "optin"] },
    ],
  },
  photography: {
    label: "Photography / Creative",
    pages: [
      { name: "Portfolio Showcase", type: "landing", sectionTypes: ["hero", "video", "features", "social_proof", "cta"] },
      { name: "Package Pricing", type: "pricing", sectionTypes: ["pricing", "faq"] },
      { name: "Project Inquiry", type: "inquiry", sectionTypes: ["hero", "optin"] },
    ],
  },
  saas: {
    label: "SaaS / Tech Product",
    pages: [
      { name: "Product Landing", type: "landing", sectionTypes: ["hero", "video", "features", "pricing", "social_proof", "faq", "cta"] },
      { name: "Signup / Trial", type: "signup", sectionTypes: ["hero", "optin"] },
      { name: "Onboarding Welcome", type: "welcome", sectionTypes: ["hero", "features", "cta"] },
    ],
  },
  consulting: {
    label: "Consulting / Coaching",
    pages: [
      { name: "Expert Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Strategy Call", type: "booking", sectionTypes: ["hero", "optin"] },
    ],
  },
  nonprofit: {
    label: "Non-profit / Charity",
    pages: [
      { name: "Mission Page", type: "landing", sectionTypes: ["hero", "video", "features", "social_proof", "cta"] },
      { name: "Donate / Volunteer", type: "donate", sectionTypes: ["hero", "pricing", "optin"] },
      { name: "Thank You", type: "thankyou", sectionTypes: ["hero", "cta"] },
    ],
  },
  local_service: {
    label: "Local Service Business",
    pages: [
      { name: "Service Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Free Quote Request", type: "quote", sectionTypes: ["hero", "optin"] },
    ],
  },
  hotel: {
    label: "Hotel / Hospitality",
    pages: [
      { name: "Property Showcase", type: "landing", sectionTypes: ["hero", "video", "features", "pricing", "social_proof", "cta"] },
      { name: "Room Booking", type: "booking", sectionTypes: ["hero", "pricing", "optin"] },
      { name: "Booking Confirmed", type: "confirmation", sectionTypes: ["hero", "cta"] },
    ],
  },
  financial: {
    label: "Financial Services",
    pages: [
      { name: "Advisory Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Consultation Request", type: "inquiry", sectionTypes: ["hero", "optin"] },
    ],
  },
  tutoring: {
    label: "Education / Tutoring",
    pages: [
      { name: "Program Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Enrollment Form", type: "enrollment", sectionTypes: ["hero", "optin"] },
      { name: "Student Welcome", type: "welcome", sectionTypes: ["hero", "cta"] },
    ],
  },
  wedding: {
    label: "Wedding / Event Planning",
    pages: [
      { name: "Planner Showcase", type: "landing", sectionTypes: ["hero", "video", "features", "social_proof", "pricing", "cta"] },
      { name: "Venue Inquiry", type: "inquiry", sectionTypes: ["hero", "optin"] },
    ],
  },
  pet_services: {
    label: "Pet Services",
    pages: [
      { name: "Service Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "cta"] },
      { name: "Appointment Booking", type: "booking", sectionTypes: ["hero", "optin"] },
    ],
  },
  interior_design: {
    label: "Interior Design",
    pages: [
      { name: "Studio Portfolio", type: "landing", sectionTypes: ["hero", "video", "features", "social_proof", "pricing", "cta"] },
      { name: "Project Inquiry", type: "inquiry", sectionTypes: ["hero", "optin"] },
    ],
  },
  automotive: {
    label: "Automotive / Dealership",
    pages: [
      { name: "Dealership Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Test Drive Booking", type: "booking", sectionTypes: ["hero", "optin"] },
      { name: "Confirmed", type: "confirmation", sectionTypes: ["hero", "cta"] },
    ],
  },
  dental: {
    label: "Dental Practice",
    pages: [
      { name: "Practice Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "New Patient Form", type: "intake", sectionTypes: ["hero", "optin"] },
      { name: "Appointment Confirmed", type: "confirmation", sectionTypes: ["hero", "cta"] },
    ],
  },
  lawn_service: {
    label: "Lawn & Landscaping",
    pages: [
      { name: "Service Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "cta"] },
      { name: "Free Estimate", type: "estimate", sectionTypes: ["hero", "optin"] },
    ],
  },
  podcast: {
    label: "Podcast / Audio Show",
    pages: [
      { name: "Show Landing", type: "landing", sectionTypes: ["hero", "video", "features", "social_proof", "cta"] },
      { name: "Subscribe & Listen", type: "subscribe", sectionTypes: ["hero", "optin"] },
    ],
  },
  blockchain: {
    label: "Blockchain / Web3 Infrastructure",
    pages: [
      { name: "Protocol Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Developer Signup", type: "signup", sectionTypes: ["hero", "optin"] },
      { name: "Welcome", type: "welcome", sectionTypes: ["hero", "features", "cta"] },
    ],
  },
  courier: {
    label: "Courier / Delivery Service",
    pages: [
      { name: "Service Landing", type: "landing", sectionTypes: ["hero", "features", "pricing", "social_proof", "faq", "cta"] },
      { name: "Shipment Quote", type: "quote", sectionTypes: ["hero", "optin"] },
      { name: "Booking Confirmed", type: "confirmation", sectionTypes: ["hero", "cta"] },
    ],
  },
  b2b: {
    label: "B2B / Enterprise Sales",
    pages: [
      { name: "Enterprise Landing", type: "landing", sectionTypes: ["hero", "features", "social_proof", "pricing", "faq", "cta"] },
      { name: "Demo Request", type: "demo", sectionTypes: ["hero", "optin"] },
      { name: "Onboarding Welcome", type: "welcome", sectionTypes: ["hero", "features", "cta"] },
    ],
  },
  telecom: {
    label: "Telecom / ISP Provider",
    pages: [
      { name: "Provider Landing", type: "landing", sectionTypes: ["hero", "features", "pricing", "social_proof", "faq", "cta"] },
      { name: "Plan Selection", type: "plans", sectionTypes: ["pricing", "optin"] },
      { name: "Account Setup", type: "setup", sectionTypes: ["hero", "cta"] },
    ],
  },
  travel: {
    label: "Travel / Tourism",
    pages: [
      { name: "Destination Landing", type: "landing", sectionTypes: ["hero", "video", "features", "social_proof", "pricing", "cta"] },
      { name: "Trip Inquiry", type: "inquiry", sectionTypes: ["hero", "optin"] },
      { name: "Booking Confirmed", type: "confirmation", sectionTypes: ["hero", "cta"] },
    ],
  },
};

function makeEmptySection(type: SectionType, index: number) {
  const id = `${type}-${index}`;
  const contentMap: Record<SectionType, object> = {
    hero: { headline: "", subheadline: "", ctaText: "Get Started", ctaUrl: "#" },
    features: { title: "", items: [] },
    social_proof: { title: "", testimonials: [] },
    pricing: { title: "", plans: [] },
    faq: { title: "", faqs: [] },
    cta: { headline: "", subheadline: "", ctaText: "Take Action", ctaUrl: "#" },
    optin: { formTitle: "", formSubtitle: "", buttonText: "Subscribe", fields: [{ label: "Email Address", type: "email", placeholder: "you@example.com" }] },
    video: { videoUrl: "", videoTitle: "" },
  };
  return { id, type, content: contentMap[type] ?? {} };
}

// ---------------------------------------------------------------------------
// List funnels
// ---------------------------------------------------------------------------

router.get("/businesses/:businessId/funnels", async (req, res) => {
  const parsed = ListFunnelsParams.safeParse({ businessId: req.params.businessId });
  if (!parsed.success) return res.status(400).json({ error: "Invalid businessId" });
  try {
    const funnels = await db
      .select()
      .from(funnelsTable)
      .where(eq(funnelsTable.businessId, parsed.data.businessId))
      .orderBy(funnelsTable.createdAt);
    res.json(funnels);
  } catch (err) {
    req.log.error({ err }, "Failed to list funnels");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Create funnel from template
// ---------------------------------------------------------------------------

router.post("/businesses/:businessId/funnels", async (req, res) => {
  const paramsParsed = CreateFunnelParams.safeParse({ businessId: req.params.businessId });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid businessId" });
  const bodyParsed = CreateFunnelBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.message });

  const { businessId } = paramsParsed.data;
  const { name, description, templateType } = bodyParsed.data;

  const template = FUNNEL_TEMPLATES[templateType];
  if (!template) return res.status(400).json({ error: `Unknown template: ${templateType}` });

  try {
    const [funnel] = await db.insert(funnelsTable).values({ businessId, name, description, templateType, status: "draft" }).returning();

    const pages = await Promise.all(
      template.pages.map((pageDef, position) => {
        const sections = pageDef.sectionTypes.map((type, i) => makeEmptySection(type, i));
        return db
          .insert(funnelPagesTable)
          .values({ funnelId: funnel.id, name: pageDef.name, type: pageDef.type, position, sections })
          .returning()
          .then((rows) => rows[0]);
      })
    );

    res.status(201).json({ ...funnel, pages });
  } catch (err) {
    req.log.error({ err }, "Failed to create funnel");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Get funnel with pages
// ---------------------------------------------------------------------------

router.get("/businesses/:businessId/funnels/:id", async (req, res) => {
  const parsed = GetFunnelParams.safeParse({ businessId: req.params.businessId, id: req.params.id });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });

  try {
    const [funnel] = await db
      .select()
      .from(funnelsTable)
      .where(and(eq(funnelsTable.id, parsed.data.id), eq(funnelsTable.businessId, parsed.data.businessId)));
    if (!funnel) return res.status(404).json({ error: "Funnel not found" });

    const pages = await db
      .select()
      .from(funnelPagesTable)
      .where(eq(funnelPagesTable.funnelId, funnel.id))
      .orderBy(funnelPagesTable.position);

    res.json({ ...funnel, pages });
  } catch (err) {
    req.log.error({ err }, "Failed to get funnel");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Delete funnel
// ---------------------------------------------------------------------------

router.delete("/businesses/:businessId/funnels/:id", async (req, res) => {
  const parsed = DeleteFunnelParams.safeParse({ businessId: req.params.businessId, id: req.params.id });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });

  try {
    await db.delete(funnelsTable).where(and(eq(funnelsTable.id, parsed.data.id), eq(funnelsTable.businessId, parsed.data.businessId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete funnel");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Update funnel page sections
// ---------------------------------------------------------------------------

router.put("/businesses/:businessId/funnels/:funnelId/pages/:id", async (req, res) => {
  const parsed = UpdateFunnelPageParams.safeParse({
    businessId: req.params.businessId,
    funnelId: req.params.funnelId,
    id: req.params.id,
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });
  const bodyParsed = UpdateFunnelPageBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.message });

  try {
    const [updated] = await db
      .update(funnelPagesTable)
      .set({ sections: bodyParsed.data.sections, ...(bodyParsed.data.name ? { name: bodyParsed.data.name } : {}) })
      .where(and(eq(funnelPagesTable.id, parsed.data.id), eq(funnelPagesTable.funnelId, parsed.data.funnelId)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Page not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update funnel page");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// AI generate page copy (SSE)
// ---------------------------------------------------------------------------

router.post("/businesses/:businessId/funnels/:funnelId/pages/:id/generate", async (req, res) => {
  const parsed = GenerateFunnelPageParams.safeParse({
    businessId: req.params.businessId,
    funnelId: req.params.funnelId,
    id: req.params.id,
  });
  if (!parsed.success) return res.status(400).json({ error: "Invalid params" });

  const { businessId, funnelId, id } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
    if (!business) { res.write(`data: ${JSON.stringify({ error: "Business not found" })}\n\n`); res.end(); return; }

    const [funnel] = await db.select().from(funnelsTable).where(and(eq(funnelsTable.id, funnelId), eq(funnelsTable.businessId, businessId)));
    if (!funnel) { res.write(`data: ${JSON.stringify({ error: "Funnel not found" })}\n\n`); res.end(); return; }

    const [page] = await db.select().from(funnelPagesTable).where(and(eq(funnelPagesTable.id, id), eq(funnelPagesTable.funnelId, funnelId)));
    if (!page) { res.write(`data: ${JSON.stringify({ error: "Page not found" })}\n\n`); res.end(); return; }

    const existingSections = page.sections as Array<{ id: string; type: string; content: object }>;
    const sectionTypes = existingSections.map((s) => s.type);

    const sectionSchemas: Record<string, string> = {
      hero: `{"id":"hero-0","type":"hero","content":{"headline":"<compelling headline>","subheadline":"<supporting subheadline>","ctaText":"<button text>","ctaUrl":"#"}}`,
      features: `{"id":"features-1","type":"features","content":{"title":"<section title>","items":[{"title":"<feature>","description":"<benefit description>","icon":"star"},{"title":"<feature>","description":"<benefit description>","icon":"zap"},{"title":"<feature>","description":"<benefit description>","icon":"shield"}]}}`,
      social_proof: `{"id":"social_proof-2","type":"social_proof","content":{"title":"What Our Customers Say","testimonials":[{"name":"<Name>","role":"<Job Title>","company":"<Company>","quote":"<compelling testimonial>","rating":5},{"name":"<Name>","role":"<Job Title>","company":"<Company>","quote":"<compelling testimonial>","rating":5}]}}`,
      pricing: `{"id":"pricing-3","type":"pricing","content":{"title":"Simple, Transparent Pricing","plans":[{"name":"Starter","price":"$29","period":"month","features":["<feature>","<feature>","<feature>"],"highlighted":false,"ctaText":"Get Started"},{"name":"Pro","price":"$79","period":"month","features":["<feature>","<feature>","<feature>","<feature>"],"highlighted":true,"ctaText":"Start Free Trial"}]}}`,
      faq: `{"id":"faq-4","type":"faq","content":{"title":"Frequently Asked Questions","faqs":[{"question":"<common question>","answer":"<clear answer>"},{"question":"<common question>","answer":"<clear answer>"},{"question":"<common question>","answer":"<clear answer>"}]}}`,
      cta: `{"id":"cta-5","type":"cta","content":{"headline":"<action-oriented headline>","subheadline":"<urgency or value reinforcement>","ctaText":"<button text>","ctaUrl":"#"}}`,
      optin: `{"id":"optin-6","type":"optin","content":{"formTitle":"<compelling form headline>","formSubtitle":"<value proposition>","buttonText":"<CTA button text>","fields":[{"label":"Email Address","type":"email","placeholder":"you@example.com"}]}}`,
      video: `{"id":"video-7","type":"video","content":{"videoUrl":"","videoTitle":"<compelling video title>"}}`,
    };

    const sectionsToGenerate = sectionTypes.map((type, i) => sectionSchemas[type]?.replace(/-(0|1|2|3|4|5|6|7)/, `-${i}`) ?? `{"id":"${type}-${i}","type":"${type}","content":{}}`).join(",\n  ");

    const prompt = `You are an expert conversion copywriter. Generate compelling landing page copy for the following business and page.

BUSINESS:
- Name: ${business.name}
- Industry: ${business.industry}
- Description: ${business.description}
- Target Audience: ${business.targetAudience ?? "General audience"}

FUNNEL: ${funnel.name} (${FUNNEL_TEMPLATES[funnel.templateType]?.label ?? funnel.templateType})
PAGE: ${page.name} (type: ${page.type})

Generate copy for a JSON array of sections. Return ONLY a valid JSON array, no markdown, no explanation.
Each section must exactly match this structure (replace placeholder values with real copy):

[
  ${sectionsToGenerate}
]

Rules:
- Write copy specifically tailored to ${business.name} and their audience
- Each headline should be benefit-focused and attention-grabbing
- CTAs should be action-oriented and specific
- Testimonials should feel genuine and specific
- Features/benefits should address pain points of the target audience
- Keep copy concise but impactful
- Return valid JSON only`;

    let fullContent = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 4096,
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

    // Parse and save
    try {
      const jsonStart = fullContent.indexOf("[");
      const jsonEnd = fullContent.lastIndexOf("]") + 1;
      const jsonStr = fullContent.slice(jsonStart, jsonEnd);
      const sections = JSON.parse(jsonStr);

      const [updated] = await db
        .update(funnelPagesTable)
        .set({ sections })
        .where(and(eq(funnelPagesTable.id, id), eq(funnelPagesTable.funnelId, funnelId)))
        .returning();

      res.write(`data: ${JSON.stringify({ done: true, page: updated })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ done: true, parseError: true })}\n\n`);
    }

    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to generate funnel page copy");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

export default router;
