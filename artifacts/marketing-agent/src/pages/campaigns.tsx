import { useState } from "react";
import { useBusiness } from "@/lib/business-context";
import {
  useListCampaigns, useCreateCampaign, useDeleteCampaign,
  useGetCampaignsSummary, getListCampaignsQueryKey, getGetCampaignsSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Target, Plus, Play, Pause, CheckCircle2, CircleDashed, Trash2,
  Megaphone, Activity, ArrowLeft, Wand2, Loader2, Mail, Globe,
  Copy, ExternalLink, Check,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  channel: z.enum(["social", "email", "seo", "ads", "content", "multi"]),
  budget: z.coerce.number().optional(),
});

// ---------------------------------------------------------------------------
// Main campaigns page
// ---------------------------------------------------------------------------

export default function Campaigns() {
  const { activeBusinessId } = useBusiness();
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
        <Target className="w-16 h-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-2">No Active Context</h2>
        <p className="text-muted-foreground">Select a business from the sidebar to manage campaigns.</p>
      </div>
    );
  }

  if (selectedCampaign) {
    return (
      <CampaignDetail
        businessId={activeBusinessId}
        campaignId={selectedCampaign}
        onBack={() => setSelectedCampaign(null)}
      />
    );
  }

  return <CampaignList businessId={activeBusinessId} onSelect={setSelectedCampaign} />;
}

// ---------------------------------------------------------------------------
// Campaign list
// ---------------------------------------------------------------------------

function CampaignList({ businessId, onSelect }: { businessId: number; onSelect: (id: number) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: campaigns, isLoading } = useListCampaigns(businessId, {
    query: { enabled: true, queryKey: getListCampaignsQueryKey(businessId) }
  });
  const { data: summary, isLoading: summaryLoading } = useGetCampaignsSummary(businessId, {
    query: { enabled: true, queryKey: getGetCampaignsSummaryQueryKey(businessId) }
  });

  const createMutation = useCreateCampaign();
  const deleteMutation = useDeleteCampaign();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", channel: "multi" }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate({ businessId, data: values }, {
      onSuccess: () => {
        toast({ title: "Campaign created" });
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey(businessId) });
        queryClient.invalidateQueries({ queryKey: getGetCampaignsSummaryQueryKey(businessId) });
      }
    });
  }

  function handleDelete(id: number) {
    deleteMutation.mutate({ businessId, id }, {
      onSuccess: () => {
        toast({ title: "Campaign deleted" });
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey(businessId) });
        queryClient.invalidateQueries({ queryKey: getGetCampaignsSummaryQueryKey(businessId) });
      }
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase">Campaigns</h1>
          <p className="text-muted-foreground">Plan, compose, and execute marketing initiatives.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono uppercase tracking-wider text-xs"><Plus className="w-4 h-4 mr-2" /> New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur border-primary/20">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider">Initialize Campaign</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Campaign Name</FormLabel>
                    <FormControl><Input {...field} className="bg-muted/50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Description</FormLabel>
                    <FormControl><Textarea {...field} className="bg-muted/50 min-h-[100px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="channel" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Primary Channel</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="multi">Multi-Channel</SelectItem>
                          <SelectItem value="social">Social Media</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="seo">SEO</SelectItem>
                          <SelectItem value="ads">Paid Ads</SelectItem>
                          <SelectItem value="content">Content</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="budget" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Budget ($)</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value || ""} className="bg-muted/50" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending} className="font-mono uppercase tracking-wider text-xs">
                    {createMutation.isPending ? "Creating..." : "Launch Campaign"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <StatusCard title="Active" count={summary?.active} icon={Activity} color="text-green-500" />
            <StatusCard title="Draft" count={summary?.draft} icon={CircleDashed} color="text-muted-foreground" />
            <StatusCard title="Paused" count={summary?.paused} icon={Pause} color="text-yellow-500" />
            <StatusCard title="Completed" count={summary?.completed} icon={CheckCircle2} color="text-primary" />
          </>
        )}
      </div>

      <Card className="bg-card/40 backdrop-blur border-muted">
        <CardHeader>
          <CardTitle className="font-mono text-sm tracking-wider uppercase">Campaign Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : campaigns?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-muted rounded-lg font-mono text-sm">
              No campaigns active.
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns?.map(campaign => (
                <div key={campaign.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border border-muted/50 hover:border-primary/30 bg-muted/20 transition-all group cursor-pointer" onClick={() => onSelect(campaign.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg truncate">{campaign.name}</h3>
                      <StatusBadge status={campaign.status} />
                      <span className="text-xs font-mono uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded ml-auto">
                        {campaign.channel}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{campaign.description}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:ml-4 text-xs font-mono text-muted-foreground">
                    {campaign.budget != null && (
                      <div className="text-right">
                        <span className="uppercase block text-[10px] opacity-70">Budget</span>
                        <span className="text-foreground">${campaign.budget.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="text-right">
                      <span className="uppercase block text-[10px] opacity-70">Created</span>
                      <span className="text-foreground">{format(new Date(campaign.createdAt), "MMM d")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign detail / email composer
// ---------------------------------------------------------------------------

function CampaignDetail({ businessId, campaignId, onBack }: { businessId: number; campaignId: number; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: campaign, isLoading } = useListCampaigns(businessId, {
    query: { enabled: !!businessId, queryKey: getListCampaignsQueryKey(businessId) }
  });

  const item = campaign?.find((c) => c.id === campaignId);

  const handleGenerateEmail = async () => {
    setIsGenerating(true);
    setGeneratedText("");
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${BASE}/api/businesses/${businessId}/campaigns/${campaignId}/generate-email`, { method: "POST" });
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
            if (parsed.done && parsed.campaign) {
              queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey(businessId) });
              toast({ title: "Email generated!", description: "Subject and body are ready." });
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      toast({ title: "Generation failed", description: String(err), variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setGeneratedText("");
    }
  };

  const copySubject = (subject: string) => {
    navigator.clipboard.writeText(subject);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || !item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono">{item.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={item.status} />
              <Badge value={item.channel} />
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Generate Email */}
      <Card className="bg-card/40 backdrop-blur border-muted">
        <CardHeader>
          <CardTitle className="font-mono text-sm tracking-wider uppercase flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Campaign
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGenerating && generatedText && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 font-mono text-xs text-muted-foreground overflow-hidden max-h-32">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] uppercase tracking-wider">AI Writing Email...</span>
              </div>
              <div className="overflow-hidden text-[11px] leading-relaxed line-clamp-4 whitespace-pre-wrap">{generatedText}</div>
            </div>
          )}

          {!item.emailSubject && !isGenerating && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm mb-4">Generate email copy for this campaign using AI.</p>
              <Button onClick={handleGenerateEmail} disabled={isGenerating} className="gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Generate Email Copy
              </Button>
            </div>
          )}

          {item.emailSubject && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Subject Line</span>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => copySubject(item.emailSubject ?? "")}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-sm font-medium">{item.emailSubject}</p>
              </div>

              {item.emailBody && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block mb-2">Body Text</span>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.emailBody}</div>
                </div>
              )}

              {item.emailHtml && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground block mb-2">HTML Preview</span>
                  <div className="rounded border border-border/50 bg-background p-4 overflow-auto max-h-64 text-sm">
                    <div dangerouslySetInnerHTML={{ __html: item.emailHtml }} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerateEmail} disabled={isGenerating}>
                  <Wand2 className="h-3.5 w-3.5" /> Regenerate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({ title, count = 0, icon: Icon, color }: { title: string, count?: number, icon: any, color: string }) {
  return (
    <Card className="bg-card/40 backdrop-blur border-muted">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-mono font-bold">{count}</p>
        </div>
        <div className={`p-3 rounded-full bg-muted/50 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = "bg-muted text-muted-foreground";
  if (status === "active") color = "bg-green-500/10 text-green-500 border-green-500/20";
  if (status === "paused") color = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  if (status === "completed") color = "bg-primary/10 text-primary border-primary/20";
  return (
    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${color}`}>
      {status}
    </span>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span className="text-xs font-mono uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded">
      {value}
    </span>
  );
}
