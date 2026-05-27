import { useState } from "react";
import { useBusiness } from "@/lib/business-context";
import {
  useListFunnels, useCreateFunnel, useDeleteFunnel, useGetFunnel, useUpdateFunnelPage,
  getListFunnelsQueryKey, getGetFunnelQueryKey,
  type FunnelRecord, type FunnelWithPages, type FunnelPage, type FunnelSection, type FunnelSectionType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, Plus, ChevronRight, ArrowLeft, Trash2, Wand2, Save,
  Zap, Rocket, Video, FlaskConical, FileText, ArrowUpFromLine,
  ChevronDown, ChevronUp, Check, Loader2, AlertCircle,
  Calendar, BookOpen, CalendarCheck, Tag, Smartphone, Users,
  GraduationCap, Share2, HelpCircle, Clock,
  UtensilsCrossed, ShoppingBag, Home, Scale, HeartPulse,
  Dumbbell, Scissors, Camera, Monitor, Briefcase,
  HandHeart, Wrench, BedDouble, Landmark, School,
  Gem, PawPrint, Paintbrush, Car, Smile,
} from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

// ---------------------------------------------------------------------------
// Template definitions (mirrors backend)
// ---------------------------------------------------------------------------

const FUNNEL_TEMPLATES = [
  {
    key: "lead_generation",
    label: "Lead Generation",
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
    description: "Capture qualified leads with a compelling offer and opt-in sequence.",
    steps: ["Landing Page", "Opt-in Form", "Thank You"],
  },
  {
    key: "product_launch",
    label: "Product Launch",
    icon: Rocket,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    description: "Build anticipation, showcase features, and convert buyers at launch.",
    steps: ["Hero Page", "Social Proof", "Pricing Page", "Checkout"],
  },
  {
    key: "webinar",
    label: "Webinar Registration",
    icon: Video,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    description: "Fill your webinar seats with a high-converting registration funnel.",
    steps: ["Registration", "Confirmation", "Reminder"],
  },
  {
    key: "free_trial",
    label: "Free Trial",
    icon: FlaskConical,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    description: "Drive SaaS signups with a frictionless free trial onboarding flow.",
    steps: ["Landing Page", "Signup Form", "Welcome"],
  },
  {
    key: "sales_letter",
    label: "Sales Letter",
    icon: FileText,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    description: "Long-form persuasion page for high-ticket products and services.",
    steps: ["Sales Page", "Order Page"],
  },
  {
    key: "content_upgrade",
    label: "Content Upgrade",
    icon: ArrowUpFromLine,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    description: "Convert blog readers into subscribers with a targeted content offer.",
    steps: ["Blog CTA", "Opt-in Page", "Download Page"],
  },
  {
    key: "event_registration",
    label: "Event Registration",
    icon: Calendar,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    description: "Fill seats for your conference, workshop, or live event.",
    steps: ["Event Landing", "Confirmation"],
  },
  {
    key: "ebook_download",
    label: "eBook / Guide",
    icon: BookOpen,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    description: "Grow your list by giving away a high-value guide or eBook.",
    steps: ["Book Landing", "Download Page"],
  },
  {
    key: "consultation_booking",
    label: "Book a Consultation",
    icon: CalendarCheck,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "border-indigo-400/20",
    description: "Book discovery calls and consultations for service businesses.",
    steps: ["Booking Page", "Confirmation"],
  },
  {
    key: "flash_sale",
    label: "Flash Sale",
    icon: Tag,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/20",
    description: "Drive urgency and revenue with a time-limited discount offer.",
    steps: ["Sale Page", "Order Page", "Thank You"],
  },
  {
    key: "app_download",
    label: "App Download",
    icon: Smartphone,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    description: "Drive installs for your mobile app with a dedicated landing page.",
    steps: ["App Landing", "App Store Page"],
  },
  {
    key: "membership",
    label: "Membership / Community",
    icon: Users,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    description: "Attract and convert members to your paid community or subscription.",
    steps: ["Membership Page", "Join Form", "Welcome"],
  },
  {
    key: "course_enrollment",
    label: "Course Enrollment",
    icon: GraduationCap,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    description: "Enroll students into your online course with a full conversion funnel.",
    steps: ["Course Landing", "Enrollment Form", "Student Welcome"],
  },
  {
    key: "referral",
    label: "Referral Program",
    icon: Share2,
    color: "text-teal-400",
    bg: "bg-teal-400/10",
    border: "border-teal-400/20",
    description: "Turn your customers into advocates with a structured referral funnel.",
    steps: ["Referral Landing", "Reward Page"],
  },
  {
    key: "quiz_funnel",
    label: "Quiz / Survey",
    icon: HelpCircle,
    color: "text-lime-400",
    bg: "bg-lime-400/10",
    border: "border-lime-400/20",
    description: "Qualify and segment leads with an interactive quiz that drives conversions.",
    steps: ["Quiz Start", "Results Page", "Offer Page"],
  },
  {
    key: "waitlist",
    label: "Product Waitlist",
    icon: Clock,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/20",
    description: "Build pre-launch buzz and capture early adopters before you go live.",
    steps: ["Coming Soon", "Confirmed"],
  },
  // ── Business-type templates ─────────────────────────────────────────────
  {
    key: "restaurant",
    label: "Restaurant / Dining",
    icon: UtensilsCrossed,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    description: "Showcase your menu, ambiance, and drive online reservations.",
    steps: ["Menu Showcase", "Reservation Form"],
  },
  {
    key: "ecommerce",
    label: "Online Store",
    icon: ShoppingBag,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/20",
    description: "Turn visitors into buyers with a compelling product and checkout flow.",
    steps: ["Store Landing", "Featured Product", "Checkout"],
  },
  {
    key: "real_estate",
    label: "Real Estate",
    icon: Home,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    description: "Generate buyer and seller leads with property listings and inquiry forms.",
    steps: ["Agency Landing", "Property Listings", "Buyer Inquiry"],
  },
  {
    key: "law_firm",
    label: "Law Firm",
    icon: Scale,
    color: "text-gray-300",
    bg: "bg-gray-300/10",
    border: "border-gray-300/20",
    description: "Build trust and convert visitors into consultation requests.",
    steps: ["Practice Landing", "Case Intake"],
  },
  {
    key: "healthcare",
    label: "Healthcare / Clinic",
    icon: HeartPulse,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    description: "Attract patients and drive appointment bookings for your practice.",
    steps: ["Practice Landing", "Appointment Booking", "Confirmation"],
  },
  {
    key: "fitness",
    label: "Gym / Fitness Studio",
    icon: Dumbbell,
    color: "text-lime-500",
    bg: "bg-lime-500/10",
    border: "border-lime-500/20",
    description: "Grow membership and fill classes with a high-energy studio funnel.",
    steps: ["Studio Landing", "Free Trial Signup", "Welcome"],
  },
  {
    key: "beauty_salon",
    label: "Beauty Salon / Spa",
    icon: Scissors,
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-400/10",
    border: "border-fuchsia-400/20",
    description: "Showcase services and book appointments for your salon or spa.",
    steps: ["Salon Showcase", "Online Booking"],
  },
  {
    key: "photography",
    label: "Photography / Creative",
    icon: Camera,
    color: "text-stone-300",
    bg: "bg-stone-300/10",
    border: "border-stone-300/20",
    description: "Display your portfolio and convert visitors into booked clients.",
    steps: ["Portfolio Showcase", "Package Pricing", "Project Inquiry"],
  },
  {
    key: "saas",
    label: "SaaS / Tech Product",
    icon: Monitor,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    description: "Drive signups and trials with a feature-rich product landing page.",
    steps: ["Product Landing", "Signup / Trial", "Onboarding Welcome"],
  },
  {
    key: "consulting",
    label: "Consulting / Coaching",
    icon: Briefcase,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/20",
    description: "Position your expertise and book strategy calls or engagements.",
    steps: ["Expert Landing", "Strategy Call"],
  },
  {
    key: "nonprofit",
    label: "Non-profit / Charity",
    icon: HandHeart,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    description: "Tell your mission story and drive donations or volunteer sign-ups.",
    steps: ["Mission Page", "Donate / Volunteer", "Thank You"],
  },
  {
    key: "local_service",
    label: "Local Service Business",
    icon: Wrench,
    color: "text-zinc-400",
    bg: "bg-zinc-400/10",
    border: "border-zinc-400/20",
    description: "Generate local leads for plumbing, HVAC, cleaning, and more.",
    steps: ["Service Landing", "Free Quote Request"],
  },
  {
    key: "hotel",
    label: "Hotel / Hospitality",
    icon: BedDouble,
    color: "text-amber-300",
    bg: "bg-amber-300/10",
    border: "border-amber-300/20",
    description: "Showcase your property and drive direct room bookings.",
    steps: ["Property Showcase", "Room Booking", "Booking Confirmed"],
  },
  {
    key: "financial",
    label: "Financial Services",
    icon: Landmark,
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    description: "Build credibility and capture leads for financial or insurance services.",
    steps: ["Advisory Landing", "Consultation Request"],
  },
  {
    key: "tutoring",
    label: "Education / Tutoring",
    icon: School,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    description: "Enroll students into programs, tutoring, or training services.",
    steps: ["Program Landing", "Enrollment Form", "Student Welcome"],
  },
  {
    key: "wedding",
    label: "Wedding / Event Planning",
    icon: Gem,
    color: "text-pink-300",
    bg: "bg-pink-300/10",
    border: "border-pink-300/20",
    description: "Showcase your planning portfolio and capture venue or vendor inquiries.",
    steps: ["Planner Showcase", "Venue Inquiry"],
  },
  {
    key: "pet_services",
    label: "Pet Services",
    icon: PawPrint,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
    description: "Drive grooming, boarding, and vet appointment bookings.",
    steps: ["Service Landing", "Appointment Booking"],
  },
  {
    key: "interior_design",
    label: "Interior Design",
    icon: Paintbrush,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    description: "Showcase your design work and generate high-value project inquiries.",
    steps: ["Studio Portfolio", "Project Inquiry"],
  },
  {
    key: "automotive",
    label: "Automotive / Dealership",
    icon: Car,
    color: "text-gray-500",
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
    description: "Showcase inventory and book test drives for your dealership.",
    steps: ["Dealership Landing", "Test Drive Booking", "Confirmed"],
  },
  {
    key: "dental",
    label: "Dental Practice",
    icon: Smile,
    color: "text-sky-300",
    bg: "bg-sky-300/10",
    border: "border-sky-300/20",
    description: "Attract new patients and streamline appointment booking for your practice.",
    steps: ["Practice Landing", "New Patient Form", "Appointment Confirmed"],
  },
];

const SECTION_LABELS: Record<FunnelSectionType, string> = {
  hero: "Hero / Banner",
  features: "Features & Benefits",
  social_proof: "Testimonials",
  pricing: "Pricing",
  faq: "FAQ",
  cta: "Call to Action",
  optin: "Opt-in Form",
  video: "Video",
};

const SECTION_COLORS: Record<FunnelSectionType, string> = {
  hero: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  features: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  social_proof: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  pricing: "bg-green-500/15 text-green-400 border-green-500/25",
  faq: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  cta: "bg-red-500/15 text-red-400 border-red-500/25",
  optin: "bg-pink-500/15 text-pink-400 border-pink-500/25",
  video: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type View = "list" | "template-picker" | "detail";

export default function Funnels() {
  const { activeBusinessId } = useBusiness();
  const [view, setView] = useState<View>("list");
  const [selectedFunnelId, setSelectedFunnelId] = useState<number | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: funnels, isLoading } = useListFunnels(activeBusinessId ?? 0, {
    query: { enabled: !!activeBusinessId },
  });

  const createMutation = useCreateFunnel({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getListFunnelsQueryKey(activeBusinessId ?? 0) });
      setSelectedFunnelId(data.id);
      setView("detail");
      setShowCreateDialog(false);
      setCreateName("");
      setCreateDesc("");
      toast({ title: "Funnel created!", description: `${data.name} is ready to edit.` });
    },
    onError: () => toast({ title: "Failed to create funnel", variant: "destructive" }),
  });

  const deleteMutation = useDeleteFunnel({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListFunnelsQueryKey(activeBusinessId ?? 0) });
      setView("list");
      setSelectedFunnelId(null);
      toast({ title: "Funnel deleted" });
    },
  });

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
        <Layers className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold font-mono">No Active Context</h2>
        <p className="text-muted-foreground text-sm max-w-sm">Select a business from the sidebar to manage its funnels.</p>
      </div>
    );
  }

  // --- Detail view ---
  if (view === "detail" && selectedFunnelId) {
    return (
      <FunnelDetail
        businessId={activeBusinessId}
        funnelId={selectedFunnelId}
        onBack={() => { setView("list"); setSelectedFunnelId(null); }}
        onDelete={() => deleteMutation.mutate({ businessId: activeBusinessId, id: selectedFunnelId })}
      />
    );
  }

  // --- Template picker ---
  if (view === "template-picker") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono">Choose a Template</h1>
            <p className="text-muted-foreground text-sm">Pick a funnel template — AI will fill in the copy based on your business.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FUNNEL_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              onClick={() => { setPendingTemplate(tpl.key); setShowCreateDialog(true); }}
              className={`text-left p-5 rounded-lg border ${tpl.border} ${tpl.bg} hover:brightness-110 transition-all group`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-md bg-background/40`}>
                  <tpl.icon className={`h-5 w-5 ${tpl.color}`} />
                </div>
                <span className={`font-semibold font-mono text-sm ${tpl.color}`}>{tpl.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{tpl.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.steps.map((step, i) => (
                  <div key={step} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground border border-border/50">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono">Name Your Funnel</DialogTitle>
              <DialogDescription>
                {pendingTemplate && FUNNEL_TEMPLATES.find((t) => t.key === pendingTemplate)?.label} template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Funnel Name *</label>
                <Input
                  placeholder="e.g. Summer Campaign Lead Gen"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Description (optional)</label>
                <Textarea
                  placeholder="What is this funnel for?"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  rows={2}
                  className="font-mono text-sm"
                />
              </div>
              <Button
                className="w-full"
                disabled={!createName.trim() || createMutation.isPending}
                onClick={() => {
                  if (!pendingTemplate || !createName.trim()) return;
                  createMutation.mutate({ businessId: activeBusinessId, body: { name: createName.trim(), description: createDesc || undefined, templateType: pendingTemplate } });
                }}
              >
                {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Plus className="h-4 w-4 mr-2" /> Create Funnel</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Funnel Builder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Build AI-powered landing pages and conversion funnels.</p>
        </div>
        <Button onClick={() => setView("template-picker")} className="gap-2">
          <Plus className="h-4 w-4" /> New Funnel
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      ) : !funnels?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4 border border-dashed border-border rounded-lg">
          <Layers className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="font-semibold text-muted-foreground">No funnels yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create your first funnel from a template to get started.</p>
          </div>
          <Button size="sm" onClick={() => setView("template-picker")} className="mt-2 gap-2">
            <Plus className="h-3.5 w-3.5" /> Choose Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {funnels.map((funnel) => (
            <FunnelCard
              key={funnel.id}
              funnel={funnel}
              onClick={() => { setSelectedFunnelId(funnel.id); setView("detail"); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funnel card (list item)
// ---------------------------------------------------------------------------

function FunnelCard({ funnel, onClick }: { funnel: FunnelRecord; onClick: () => void }) {
  const tpl = FUNNEL_TEMPLATES.find((t) => t.key === funnel.templateType);
  const Icon = tpl?.icon ?? Layers;
  return (
    <button
      onClick={onClick}
      className="text-left p-5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${tpl?.bg ?? "bg-muted"}`}>
            <Icon className={`h-4 w-4 ${tpl?.color ?? "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-semibold text-sm font-mono">{funnel.name}</p>
            {funnel.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{funnel.description}</p>}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1 shrink-0" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {tpl && <Badge variant="outline" className={`text-[10px] font-mono ${tpl.color} border-current/30`}>{tpl.label}</Badge>}
        <Badge variant="outline" className="text-[10px] font-mono capitalize">{funnel.status}</Badge>
        <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(funnel.createdAt), "MMM d, yyyy")}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Funnel detail view
// ---------------------------------------------------------------------------

function FunnelDetail({ businessId, funnelId, onBack, onDelete }: {
  businessId: number;
  funnelId: number;
  onBack: () => void;
  onDelete: () => void;
}) {
  const { data: funnel, isLoading } = useGetFunnel(businessId, funnelId);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!funnel) return <div className="text-muted-foreground">Funnel not found.</div>;

  const tpl = FUNNEL_TEMPLATES.find((t) => t.key === funnel.templateType);
  const selectedPage = funnel.pages.find((p) => p.id === selectedPageId) ?? funnel.pages[0] ?? null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono">{funnel.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {tpl && <Badge variant="outline" className={`text-[10px] font-mono ${tpl.color} border-current/30`}>{tpl.label}</Badge>}
              <Badge variant="outline" className="text-[10px] font-mono capitalize">{funnel.status}</Badge>
              {funnel.description && <span className="text-xs text-muted-foreground">{funnel.description}</span>}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive hover:border-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {/* Page stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {funnel.pages.map((page, i) => {
          const isSelected = page.id === (selectedPage?.id);
          const hasContent = (page.sections as FunnelSection[]).some((s) => {
            const c = s.content as Record<string, unknown>;
            return Object.values(c).some((v) => typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : false);
          });
          return (
            <div key={page.id} className="flex items-center gap-2 shrink-0">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
              <button
                onClick={() => setSelectedPageId(page.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-mono font-medium transition-all ${
                  isSelected
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {hasContent ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {page.name}
              </button>
            </div>
          );
        })}
      </div>

      {/* Page editor */}
      {selectedPage && (
        <PageEditor
          businessId={businessId}
          funnel={funnel}
          page={selectedPage}
          key={selectedPage.id}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Delete Funnel?</DialogTitle>
            <DialogDescription>This will permanently delete "{funnel.name}" and all its pages. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={onDelete}>Delete Funnel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page editor
// ---------------------------------------------------------------------------

function PageEditor({ businessId, funnel, page }: { businessId: number; funnel: FunnelWithPages; page: FunnelPage }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<FunnelSection[]>((page.sections as FunnelSection[]) ?? []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(sections[0]?.id ?? null);
  const [isDirty, setIsDirty] = useState(false);

  const updateMutation = useUpdateFunnelPage({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetFunnelQueryKey(businessId, funnel.id) });
      toast({ title: "Page saved!" });
      setIsDirty(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const handleSave = () => {
    updateMutation.mutate({ businessId, funnelId: funnel.id, id: page.id, body: { sections } });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedText("");

    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${BASE}/api/businesses/${businessId}/funnels/${funnel.id}/pages/${page.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!resp.body) throw new Error("No stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              accumulated += parsed.content;
              setGeneratedText(accumulated);
            }
            if (parsed.done && parsed.page) {
              const newSections = (parsed.page.sections as FunnelSection[]) ?? sections;
              setSections(newSections);
              setIsDirty(false);
              setGeneratedText("");
              toast({ title: "AI copy generated!", description: "Your page sections have been filled in." });
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch { /* ignore parse errors in individual chunks */ }
        }
      }
    } catch (err) {
      toast({ title: "Generation failed", description: String(err), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSection = (sectionId: string, newContent: Partial<FunnelSection["content"]>) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, content: { ...s.content, ...newContent } } : s));
    setIsDirty(true);
  };

  return (
    <div className="space-y-4">
      {/* Page action bar */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
        <div>
          <p className="font-semibold font-mono text-sm">{page.name}</p>
          <p className="text-xs text-muted-foreground">{sections.length} sections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</> : <><Wand2 className="h-3.5 w-3.5 text-primary" /> Generate with AI</>}
          </Button>
          {isDirty && (
            <Button size="sm" className="gap-2" disabled={updateMutation.isPending} onClick={handleSave}>
              {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* AI stream preview */}
      {isGenerating && generatedText && (
        <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 font-mono text-xs text-muted-foreground overflow-hidden max-h-32">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[10px] uppercase tracking-wider">AI Writing...</span>
          </div>
          <div className="overflow-hidden text-[11px] leading-relaxed line-clamp-4 whitespace-pre-wrap">{generatedText}</div>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => (
        <SectionEditor
          key={section.id}
          section={section}
          expanded={expandedSection === section.id}
          onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
          onChange={(content) => updateSection(section.id, content)}
        />
      ))}

      {/* Save bar */}
      {isDirty && (
        <div className="sticky bottom-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-card/95 backdrop-blur shadow-lg">
            <span className="text-sm text-muted-foreground font-mono flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400" /> Unsaved changes
            </span>
            <Button size="sm" disabled={updateMutation.isPending} onClick={handleSave} className="gap-2">
              {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Page
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section editor
// ---------------------------------------------------------------------------

function SectionEditor({ section, expanded, onToggle, onChange }: {
  section: FunnelSection;
  expanded: boolean;
  onToggle: () => void;
  onChange: (content: Partial<FunnelSection["content"]>) => void;
}) {
  const c = section.content;
  const colorClass = SECTION_COLORS[section.type] ?? "bg-muted text-muted-foreground border-border";
  const label = SECTION_LABELS[section.type] ?? section.type;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <Badge className={`text-[10px] font-mono border ${colorClass} px-2 py-0.5`}>{label}</Badge>
          <span className="text-sm text-muted-foreground font-mono">{getSectionPreview(section)}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-border space-y-3">
          {/* Hero / CTA fields */}
          {(section.type === "hero" || section.type === "cta") && (
            <>
              <Field label="Headline" value={c.headline ?? ""} onChange={(v) => onChange({ headline: v })} />
              <Field label="Sub-headline" value={c.subheadline ?? ""} onChange={(v) => onChange({ subheadline: v })} multiline />
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA Button Text" value={c.ctaText ?? ""} onChange={(v) => onChange({ ctaText: v })} />
                <Field label="CTA URL" value={c.ctaUrl ?? ""} onChange={(v) => onChange({ ctaUrl: v })} />
              </div>
            </>
          )}

          {/* Features */}
          {section.type === "features" && (
            <>
              <Field label="Section Title" value={c.title ?? ""} onChange={(v) => onChange({ title: v })} />
              <div className="space-y-3">
                {(c.items ?? []).map((item, i) => (
                  <div key={i} className="p-3 rounded border border-border/60 bg-muted/20 space-y-2">
                    <Field label={`Feature ${i + 1} Title`} value={item.title} onChange={(v) => {
                      const items = [...(c.items ?? [])];
                      items[i] = { ...items[i], title: v };
                      onChange({ items });
                    }} />
                    <Field label="Description" value={item.description} onChange={(v) => {
                      const items = [...(c.items ?? [])];
                      items[i] = { ...items[i], description: v };
                      onChange({ items });
                    }} multiline />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Social Proof */}
          {section.type === "social_proof" && (
            <>
              <Field label="Section Title" value={c.title ?? ""} onChange={(v) => onChange({ title: v })} />
              {(c.testimonials ?? []).map((t, i) => (
                <div key={i} className="p-3 rounded border border-border/60 bg-muted/20 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Name" value={t.name} onChange={(v) => {
                      const ts = [...(c.testimonials ?? [])]; ts[i] = { ...ts[i], name: v }; onChange({ testimonials: ts });
                    }} />
                    <Field label="Role" value={t.role} onChange={(v) => {
                      const ts = [...(c.testimonials ?? [])]; ts[i] = { ...ts[i], role: v }; onChange({ testimonials: ts });
                    }} />
                  </div>
                  <Field label="Quote" value={t.quote} onChange={(v) => {
                    const ts = [...(c.testimonials ?? [])]; ts[i] = { ...ts[i], quote: v }; onChange({ testimonials: ts });
                  }} multiline />
                </div>
              ))}
            </>
          )}

          {/* Pricing */}
          {section.type === "pricing" && (
            <>
              <Field label="Section Title" value={c.title ?? ""} onChange={(v) => onChange({ title: v })} />
              {(c.plans ?? []).map((plan, i) => (
                <div key={i} className="p-3 rounded border border-border/60 bg-muted/20 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Plan Name" value={plan.name} onChange={(v) => {
                      const ps = [...(c.plans ?? [])]; ps[i] = { ...ps[i], name: v }; onChange({ plans: ps });
                    }} />
                    <Field label="Price" value={plan.price} onChange={(v) => {
                      const ps = [...(c.plans ?? [])]; ps[i] = { ...ps[i], price: v }; onChange({ plans: ps });
                    }} />
                    <Field label="Period" value={plan.period ?? ""} onChange={(v) => {
                      const ps = [...(c.plans ?? [])]; ps[i] = { ...ps[i], period: v }; onChange({ plans: ps });
                    }} />
                  </div>
                  <Field label="Features (one per line)" value={(plan.features ?? []).join("\n")} onChange={(v) => {
                    const ps = [...(c.plans ?? [])]; ps[i] = { ...ps[i], features: v.split("\n").filter(Boolean) }; onChange({ plans: ps });
                  }} multiline />
                </div>
              ))}
            </>
          )}

          {/* FAQ */}
          {section.type === "faq" && (
            <>
              <Field label="Section Title" value={c.title ?? ""} onChange={(v) => onChange({ title: v })} />
              {(c.faqs ?? []).map((faq, i) => (
                <div key={i} className="p-3 rounded border border-border/60 bg-muted/20 space-y-2">
                  <Field label={`Q${i + 1}`} value={faq.question} onChange={(v) => {
                    const fs = [...(c.faqs ?? [])]; fs[i] = { ...fs[i], question: v }; onChange({ faqs: fs });
                  }} />
                  <Field label="Answer" value={faq.answer} onChange={(v) => {
                    const fs = [...(c.faqs ?? [])]; fs[i] = { ...fs[i], answer: v }; onChange({ faqs: fs });
                  }} multiline />
                </div>
              ))}
            </>
          )}

          {/* Opt-in */}
          {section.type === "optin" && (
            <>
              <Field label="Form Headline" value={c.formTitle ?? ""} onChange={(v) => onChange({ formTitle: v })} />
              <Field label="Form Sub-text" value={c.formSubtitle ?? ""} onChange={(v) => onChange({ formSubtitle: v })} multiline />
              <Field label="Button Text" value={c.buttonText ?? ""} onChange={(v) => onChange({ buttonText: v })} />
            </>
          )}

          {/* Video */}
          {section.type === "video" && (
            <>
              <Field label="Video Title" value={c.videoTitle ?? ""} onChange={(v) => onChange({ videoTitle: v })} />
              <Field label="Video URL (YouTube embed)" value={c.videoUrl ?? ""} onChange={(v) => onChange({ videoUrl: v })} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field helper
// ---------------------------------------------------------------------------

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="text-sm font-mono min-h-[60px] resize-y" rows={2} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm font-mono h-8" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSectionPreview(section: FunnelSection): string {
  const c = section.content;
  if (c.headline) return c.headline.slice(0, 50) + (c.headline.length > 50 ? "…" : "");
  if (c.title) return c.title.slice(0, 50) + (c.title.length > 50 ? "…" : "");
  if (c.formTitle) return c.formTitle.slice(0, 50) + (c.formTitle.length > 50 ? "…" : "");
  if (c.videoTitle) return c.videoTitle.slice(0, 50) + (c.videoTitle.length > 50 ? "…" : "");
  return "Empty — click Generate with AI to fill";
}
