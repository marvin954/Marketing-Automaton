import { useState } from "react";
import { useBusiness } from "@/lib/business-context";
import { useListCompetitors, getListCompetitorsQueryKey, useCreateCompetitor, useDeleteCompetitor } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Target, Crosshair, Plus, Trash2, Radar, ArrowRight, ShieldAlert, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

const formSchema = z.object({
  name: z.string().min(2),
  website: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export default function Competitors() {
  const { activeBusinessId } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: competitors, isLoading } = useListCompetitors(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getListCompetitorsQueryKey(activeBusinessId || 0) }
  });

  const createMutation = useCreateCompetitor();
  const deleteMutation = useDeleteCompetitor();

  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analysisStream, setAnalysisStream] = useState<Record<number, string>>({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", website: "", notes: "" }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!activeBusinessId) return;
    createMutation.mutate({ businessId: activeBusinessId, data: values }, {
      onSuccess: () => {
        toast({ title: "Competitor tracked" });
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey(activeBusinessId) });
      }
    });
  }

  function handleDelete(id: number) {
    if (!activeBusinessId) return;
    deleteMutation.mutate({ businessId: activeBusinessId, id }, {
      onSuccess: () => {
        toast({ title: "Competitor removed" });
        queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey(activeBusinessId) });
      }
    });
  }

  const handleAnalyze = async (compId: number) => {
    if (!activeBusinessId) return;
    setAnalyzingId(compId);
    setAnalysisStream(prev => ({ ...prev, [compId]: "" }));

    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${BASE}/api/businesses/${activeBusinessId}/competitors/${compId}/analyze`, {
        method: "POST",
      });

      if (!resp.ok) throw new Error("Failed");
      if (!resp.body) return;

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.content) {
                setAnalysisStream(prev => ({ ...prev, [compId]: (prev[compId] || "") + event.content }));
              }
              if (event.done) {
                queryClient.invalidateQueries({ queryKey: getListCompetitorsQueryKey(activeBusinessId) });
                toast({ title: "Analysis complete" });
              }
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      toast({ title: "Analysis failed", variant: "destructive" });
    } finally {
      setAnalyzingId(null);
    }
  };

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
        <Target className="w-16 h-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-2">No Active Context</h2>
        <p className="text-muted-foreground">Select a business to view competitor intelligence.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase flex items-center gap-2">
            <Crosshair className="w-8 h-8 text-primary" /> Intelligence
          </h1>
          <p className="text-muted-foreground">Track and analyze market rivals.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono uppercase tracking-wider text-xs"><Plus className="w-4 h-4 mr-2" /> Track Competitor</Button>
          </DialogTrigger>
          <DialogContent className="bg-background/95 backdrop-blur border-primary/20">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider">Add Competitor Target</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Target Name</FormLabel>
                    <FormControl><Input {...field} className="bg-muted/50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Target URL</FormLabel>
                    <FormControl><Input {...field} className="bg-muted/50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending} className="font-mono uppercase tracking-wider text-xs">
                    {createMutation.isPending ? "Adding..." : "Initiate Tracking"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
        ) : competitors?.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-muted rounded-lg font-mono text-sm">
            No targets actively tracked.
          </div>
        ) : (
          competitors?.map(comp => (
            <Card key={comp.id} className="bg-card/40 backdrop-blur border-muted flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Radar className="w-32 h-32" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-bold text-xl">{comp.name}</CardTitle>
                    {comp.website && <CardDescription className="font-mono text-xs mt-1 text-primary">{comp.website}</CardDescription>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(comp.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {(analysisStream[comp.id] || comp.strengths || comp.weaknesses) ? (
                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-muted/50">
                     {analysisStream[comp.id] ? (
                       <div className="prose prose-invert prose-sm text-sm font-sans max-h-48 overflow-y-auto">
                         <ReactMarkdown>{analysisStream[comp.id]}</ReactMarkdown>
                       </div>
                     ) : (
                       <>
                        <div>
                          <h4 className="text-xs font-mono uppercase text-green-500 mb-2 flex items-center"><Zap className="w-3 h-3 mr-1"/> Strengths</h4>
                          <p className="text-sm text-muted-foreground">{comp.strengths}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-mono uppercase text-destructive mb-2 flex items-center"><ShieldAlert className="w-3 h-3 mr-1"/> Weaknesses</h4>
                          <p className="text-sm text-muted-foreground">{comp.weaknesses}</p>
                        </div>
                       </>
                     )}
                  </div>
                ) : (
                  <div className="py-6 text-center border border-dashed border-muted/50 rounded flex flex-col items-center justify-center">
                     <p className="text-xs font-mono uppercase text-muted-foreground mb-2">No Analysis Data</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/10 border-t border-muted p-4">
                <Button 
                  onClick={() => handleAnalyze(comp.id)} 
                  disabled={analyzingId === comp.id}
                  variant="outline"
                  className="w-full font-mono uppercase tracking-wider text-xs border-primary/30 hover:bg-primary/10 text-primary"
                >
                  {analyzingId === comp.id ? (
                    <span className="animate-pulse">Running Scan...</span>
                  ) : (
                    <>Run Full Analysis Scan <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
