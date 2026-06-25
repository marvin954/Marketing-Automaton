import { db } from "@workspace/db";
import { funnelPagesTable, funnelsTable, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

// ---------------------------------------------------------------------------
// Render a published funnel page as a real HTML landing page
// ---------------------------------------------------------------------------

export async function renderPublicPage(req: Request, res: Response) {
  const slug = req.params.slug as string;
  if (!slug || typeof slug !== "string") return res.status(404).send("<h1>Page not found</h1>");

  const [page] = await db
    .select()
    .from(funnelPagesTable)
    .where(eq(funnelPagesTable.publicSlug, slug));

  if (!page) return res.status(404).send("<h1>Page not found</h1>");

  const [funnel] = await db
    .select()
    .from(funnelsTable)
    .where(eq(funnelsTable.id, page.funnelId));

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, funnel?.businessId ?? 0));

  const sections = (page.sections ?? []) as Array<{
    id: string;
    type: string;
    content: Record<string, any>;
  }>;

  const html = buildPageHtml({
    pageName: page.name,
    businessName: business?.name ?? "OMNI MARK",
    description: funnel?.description ?? "",
    sections,
  });

  res.setHeader("Content-Type", "text/html");
  res.send(html);
}

// ---------------------------------------------------------------------------
// Preview endpoint — renders current draft sections without publishing
// ---------------------------------------------------------------------------

export async function previewPage(req: Request, res: Response) {
  const pageId = Number(req.params.id);
  if (Number.isNaN(pageId)) return res.status(400).json({ error: "Invalid page ID" });

  const [page] = await db
    .select()
    .from(funnelPagesTable)
    .where(eq(funnelPagesTable.id, pageId));

  if (!page) return res.status(404).json({ error: "Page not found" });

  const [funnel] = await db
    .select()
    .from(funnelsTable)
    .where(eq(funnelsTable.id, page.funnelId));

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, funnel?.businessId ?? 0));

  const sections = (req.body.sections ?? page.sections ?? []) as Array<{
    id: string;
    type: string;
    content: Record<string, any>;
  }>;

  const html = buildPageHtml({
    pageName: page.name,
    businessName: business?.name ?? "OMNI MARK",
    description: funnel?.description ?? "",
    sections,
    previewBanner: true,
  });

  res.setHeader("Content-Type", "text/html");
  res.send(html);
}

// ---------------------------------------------------------------------------
// Shared HTML builder
// ---------------------------------------------------------------------------

interface PageHtmlParams {
  pageName: string;
  businessName: string;
  description: string;
  sections: Array<{ id?: string; type: string; content: Record<string, any> }>;
  previewBanner?: boolean;
}

function buildPageHtml({ pageName, businessName, description, sections, previewBanner }: PageHtmlParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageName)} | ${escapeHtml(businessName)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <style>
    :root {
      --bg: #0a0a0a;
      --fg: #fafafa;
      --muted: #a1a1aa;
      --card: #111111;
      --border: #27272a;
      --primary: #f97316;
      --primary-text: #fff;
      --radius: 0.75rem;
      --max-w: 1100px;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Source Code Pro", monospace;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff;
        --fg: #18181b;
        --muted: #71717a;
        --card: #f4f4f5;
        --border: #e4e4e7;
        --primary: #f97316;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: var(--max-w); margin: 0 auto; padding: 0 1.5rem; }
    section { padding: 4rem 0; }
    section + section { border-top: 1px solid var(--border); }

    /* Preview banner */
    .preview-banner {
      background: linear-gradient(90deg, #f97316, #ea580c);
      color: #fff;
      text-align: center;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      font-family: var(--font-mono);
    }

    /* Hero */
    .hero { text-align: center; padding: 6rem 0 4rem; }
    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin-bottom: 1rem;
    }
    .hero p {
      font-size: clamp(1rem, 2vw, 1.25rem);
      color: var(--muted);
      max-width: 600px;
      margin: 0 auto 1.5rem;
    }
    .btn {
      display: inline-block;
      background: var(--primary);
      color: var(--primary-text);
      font-weight: 600;
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius);
      text-decoration: none;
      font-size: 0.95rem;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-secondary {
      background: transparent;
      color: var(--fg);
      border: 1.5px solid var(--border);
    }
    .btn-secondary:hover { background: var(--card); }

    /* Features */
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; }
    .feature-card {
      padding: 1.5rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .feature-card h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .feature-card p { color: var(--muted); font-size: 0.95rem; }

    /* Social proof */
    .testimonials { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
    .testimonial {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
    }
    .testimonial blockquote {
      font-style: italic;
      color: var(--muted);
      margin-bottom: 1rem;
      font-size: 0.95rem;
    }
    .testimonial .author { font-weight: 600; font-size: 0.9rem; }
    .testimonial .role { font-size: 0.8rem; color: var(--muted); }

    /* Pricing */
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
    .plan {
      background: var(--card);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: 2rem;
      text-align: center;
    }
    .plan.highlight {
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary);
    }
    .plan .price { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; }
    .plan .period { font-size: 0.85rem; color: var(--muted); }
    .plan ul { list-style: none; text-align: left; margin: 1.25rem 0; }
    .plan ul li { padding: 0.3rem 0; font-size: 0.9rem; color: var(--muted); }
    .plan ul li::before { content: "\\2713"; margin-right: 0.5rem; color: var(--primary); }

    /* FAQ */
    .faq-list { max-width: 700px; margin: 0 auto; }
    .faq-item { padding: 1.25rem 0; border-bottom: 1px solid var(--border); }
    .faq-item:last-child { border-bottom: none; }
    .faq-item h4 { font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem; }
    .faq-item p { color: var(--muted); font-size: 0.95rem; }

    /* CTA */
    .cta { text-align: center; }
    .cta h2 { font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 700; margin-bottom: 0.75rem; }
    .cta p { color: var(--muted); max-width: 500px; margin: 0 auto 1.5rem; }

    /* Opt-in */
    .optin { text-align: center; }
    .optin h2 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
    .optin p { color: var(--muted); margin-bottom: 1.5rem; }
    .optin form {
      display: flex; flex-wrap: wrap; gap: 0.75rem;
      justify-content: center; max-width: 500px; margin: 0 auto;
    }
    .optin input {
      flex: 1;
      min-width: 200px;
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      background: var(--card);
      color: var(--fg);
      font-size: 0.95rem;
    }
    .optin input::placeholder { color: var(--muted); }
    .optin button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: var(--radius);
      background: var(--primary);
      color: var(--primary-text);
      font-weight: 600;
      cursor: pointer;
      font-size: 0.95rem;
    }
    .optin button:hover { opacity: 0.85; }

    /* Video */
    .video-section { text-align: center; }
    .video-section h2 { margin-bottom: 1rem; font-size: 1.25rem; }
    .video-wrapper {
      position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;
      border-radius: var(--radius); border: 1px solid var(--border);
      max-width: 800px; margin: 0 auto;
    }
    .video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }

    /* Section title */
    .section-title {
      font-size: clamp(1.25rem, 3vw, 1.75rem);
      font-weight: 700;
      text-align: center;
      margin-bottom: 2rem;
    }

    /* Footer */
    .footer {
      border-top: 1px solid var(--border);
      padding: 2rem 0;
      text-align: center;
      color: var(--muted);
      font-size: 0.85rem;
    }
    .footer a { color: var(--muted); }
  </style>
</head>
<body>
  ${previewBanner ? '<div class="preview-banner">PREVIEW MODE — This page has not been published yet</div>' : ''}
  ${sections.map(renderSection).join("\n")}
  <footer class="footer">
    <div class="container">
      <p>Powered by ${escapeHtml(businessName)}</p>
    </div>
  </footer>
</body>
</html>`;
}

function renderSection(s: { type: string; content: Record<string, any> }): string {
  const c = s.content;
  switch (s.type) {
    case "hero":
      return `<section class="hero"><div class="container"><h1>${escapeHtml(c.headline ?? "")}</h1><p>${escapeHtml(c.subheadline ?? "")}</p><a href="${escapeHtml(c.ctaUrl ?? "#")}" class="btn">${escapeHtml(c.ctaText ?? "Get Started")}</a></div></section>`;
    case "features":
      return `<section><div class="container"><h2 class="section-title">${escapeHtml(c.title ?? "Features")}</h2><div class="features-grid">${(c.items ?? []).map((item: any) => `<div class="feature-card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join("")}</div></div></section>`;
    case "social_proof":
      return `<section><div class="container"><h2 class="section-title">${escapeHtml(c.title ?? "Testimonials")}</h2><div class="testimonials">${(c.testimonials ?? []).map((t: any) => `<div class="testimonial"><blockquote>&ldquo;${escapeHtml(t.quote)}&rdquo;</blockquote><div class="author">${escapeHtml(t.name)}</div><div class="role">${escapeHtml(t.role)}${t.company ? `, ${escapeHtml(t.company)}` : ""}</div></div>`).join("")}</div></div></section>`;
    case "pricing":
      return `<section><div class="container"><h2 class="section-title">${escapeHtml(c.title ?? "Pricing")}</h2><div class="pricing-grid">${(c.plans ?? []).map((plan: any) => `<div class="plan ${plan.highlighted ? "highlight" : ""}"><h3>${escapeHtml(plan.name)}</h3><div class="price">${escapeHtml(plan.price)}</div><div class="period">${escapeHtml(plan.period ?? "month")}</div><ul>${(plan.features ?? []).map((f: string) => `<li>${escapeHtml(f)}</li>`).join("")}</ul><a href="#" class="btn">${escapeHtml(plan.ctaText ?? "Get Started")}</a></div>`).join("")}</div></div></section>`;
    case "faq":
      return `<section><div class="container"><h2 class="section-title">${escapeHtml(c.title ?? "FAQ")}</h2><div class="faq-list">${(c.faqs ?? []).map((faq: any) => `<div class="faq-item"><h4>${escapeHtml(faq.question)}</h4><p>${escapeHtml(faq.answer)}</p></div>`).join("")}</div></div></section>`;
    case "cta":
      return `<section class="cta"><div class="container"><h2>${escapeHtml(c.headline ?? "Take Action")}</h2><p>${escapeHtml(c.subheadline ?? "")}</p><a href="${escapeHtml(c.ctaUrl ?? "#")}" class="btn">${escapeHtml(c.ctaText ?? "Get Started")}</a></div></section>`;
    case "optin":
      return `<section class="optin"><div class="container"><h2>${escapeHtml(c.formTitle ?? "Sign Up")}</h2><p>${escapeHtml(c.formSubtitle ?? "")}</p><form onsubmit="event.preventDefault();alert('Thanks!');"><input type="email" placeholder="${escapeHtml(c.fields?.[0]?.placeholder ?? "you@example.com")}" required /><button type="submit">${escapeHtml(c.buttonText ?? "Subscribe")}</button></form></div></section>`;
    case "video":
      return `<section class="video-section"><div class="container"><h2>${escapeHtml(c.videoTitle ?? "Video")}</h2>${c.videoUrl ? `<div class="video-wrapper"><iframe src="${embedUrl(c.videoUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : ""}</div></section>`;
    default:
      return "";
  }
}

function escapeHtml(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function embedUrl(url: string): string {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}
