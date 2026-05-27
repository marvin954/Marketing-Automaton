import { useBusiness } from "@/lib/business-context";
import { useListCampaigns, getListCampaignsQueryKey, useCreateCampaign, useDeleteCampaign, useGetCampaignsSummary, getGetCampaignsSummaryQueryKey } from "@workspace/api-client-react";
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
import { useState } from "react";
import { format } from "date-fns";
import { Target, Plus, Play, Pause, CheckCircle2, CircleDashed, Trash2, Megaphone, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  channel: z.enum(["social", "email", "seo", "ads", "content", "multi"]),
  budget: z.coerce.number().optional(),
});

export default function Campaigns() {
  const { activeBusinessId } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: campaigns, isLoading } = useListCampaigns(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getListCampaignsQueryKey(activeBusinessId || 0) }
  });

  const { data: summary, isLoading: summaryLoading } = useGetCampaignsSummary(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getGetCampaignsSummaryQueryKey(activeBusinessId || 0) }
  });

  const createMutation = useCreateCampaign();
  const deleteMutation = useDeleteCampaign();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", channel: "multi" }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!activeBusinessId) return;
    createMutation.mutate({ businessId: activeBusinessId, data: values }, {
      onSuccess: () => {
        toast({ title: "Campaign created" });
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey(activeBusinessId) });
        queryClient.invalidateQueries({ queryKey: getGetCampaignsSummaryQueryKey(activeBusinessId) });
      }
    });
  }

  function handleDelete(id: number) {
    if (!activeBusinessId) return;
    deleteMutation.mutate({ businessId: activeBusinessId, id }, {
      onSuccess: () => {
        toast({ title: "Campaign deleted" });
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey(activeBusinessId) });
        queryClient.invalidateQueries({ queryKey: getGetCampaignsSummaryQueryKey(activeBusinessId) });
      }
    });
  }

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
        <Target className="w-16 h-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-2">No Active Context</h2>
        <p className="text-muted-foreground">Select a business from the sidebar to manage campaigns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase">Campaigns</h1>
          <p className="text-muted-foreground">Plan and orchestrate marketing initiatives.</p>
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
                <div key={campaign.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border border-muted/50 hover:border-primary/30 bg-muted/20 transition-all group">
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(campaign.id)}>
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
