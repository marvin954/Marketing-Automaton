import * as zod from "zod/v4";

export const FunnelSectionContent = zod.object({
  headline: zod.string().optional(),
  subheadline: zod.string().optional(),
  ctaText: zod.string().optional(),
  ctaUrl: zod.string().optional(),
  title: zod.string().optional(),
  subtitle: zod.string().optional(),
  buttonText: zod.string().optional(),
  items: zod.array(zod.object({
    title: zod.string(),
    description: zod.string(),
    icon: zod.string().optional(),
  })).optional(),
  testimonials: zod.array(zod.object({
    name: zod.string(),
    role: zod.string(),
    company: zod.string().optional(),
    quote: zod.string(),
    rating: zod.number().optional(),
  })).optional(),
  plans: zod.array(zod.object({
    name: zod.string(),
    price: zod.string(),
    period: zod.string().optional(),
    features: zod.array(zod.string()),
    highlighted: zod.boolean().optional(),
    ctaText: zod.string().optional(),
  })).optional(),
  faqs: zod.array(zod.object({
    question: zod.string(),
    answer: zod.string(),
  })).optional(),
  videoUrl: zod.string().optional(),
  videoTitle: zod.string().optional(),
  formTitle: zod.string().optional(),
  formSubtitle: zod.string().optional(),
  fields: zod.array(zod.object({
    label: zod.string(),
    type: zod.string(),
    placeholder: zod.string().optional(),
  })).optional(),
});

export const FunnelSectionSchema = zod.object({
  id: zod.string(),
  type: zod.enum(["hero", "features", "social_proof", "pricing", "faq", "cta", "optin", "video"]),
  content: FunnelSectionContent,
});

export const ListFunnelsParams = zod.object({ businessId: zod.coerce.number() });
export const CreateFunnelParams = zod.object({ businessId: zod.coerce.number() });
export const CreateFunnelBody = zod.object({
  name: zod.string().min(1),
  description: zod.string().optional(),
  templateType: zod.string().min(1),
});
export const GetFunnelParams = zod.object({ businessId: zod.coerce.number(), id: zod.coerce.number() });
export const DeleteFunnelParams = zod.object({ businessId: zod.coerce.number(), id: zod.coerce.number() });
export const UpdateFunnelPageParams = zod.object({
  businessId: zod.coerce.number(),
  funnelId: zod.coerce.number(),
  id: zod.coerce.number(),
});
export const UpdateFunnelPageBody = zod.object({
  name: zod.string().optional(),
  sections: zod.array(FunnelSectionSchema),
});
export const GenerateFunnelPageParams = zod.object({
  businessId: zod.coerce.number(),
  funnelId: zod.coerce.number(),
  id: zod.coerce.number(),
});

export const GenerateSectionParams = zod.object({
  businessId: zod.coerce.number(),
  funnelId: zod.coerce.number(),
  pageId: zod.coerce.number(),
});
