import { useState } from "react";
import { useBusiness } from "@/lib/business-context";
import { useListKeywords, getListKeywordsQueryKey } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Target, Search, Sparkles, Activity, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

export default function SeoHub() {
  const { activeBusinessId } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: keywords, isLoading } = useListKeywords(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getListKeywordsQueryKey(activeBusinessId || 0) }
  });

  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchStream, setResearchStream] = useState("");

  const handleResearch = async () => {
    if (!activeBusinessId || !topic) return;
    setIsResearching(true);
    setResearchStream("");

    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${BASE}/api/businesses/${activeBusinessId}/seo/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, additionalContext: context }),
      });

      if (!resp.ok) throw new Error("Failed to run research");
      if (!resp.body) throw new Error("No response body");

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
              if (event.content) setResearchStream(t => t + event.content);
              if (event.done) {
                queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey(activeBusinessId) });
                toast({ title: "SEO Research completed" });
              }
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      toast({ title: "Research failed", variant: "destructive" });
    } finally {
      setIsResearching(false);
    }
  };

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
        <Target className="w-16 h-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-2">No Active Context</h2>
        <p className="text-muted-foreground">Select a business to access the SEO Hub.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase">SEO Hub</h1>
        <p className="text-muted-foreground">AI-powered keyword research and search intent analysis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card/40 backdrop-blur border-muted">
            <CardHeader>
              <CardTitle className="font-mono text-sm tracking-wider uppercase">Research Engine</CardTitle>
              <CardDescription>Generate high-value keyword clusters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-muted-foreground">Seed Topic</label>
                <Input 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)} 
                  placeholder="e.g. AI SaaS Tools" 
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-muted-foreground">Context / Constraints</label>
                <Textarea 
                  value={context} 
                  onChange={e => setContext(e.target.value)} 
                  placeholder="Target audience, location, etc."
                  className="bg-muted/50"
                />
              </div>
              <Button 
                onClick={handleResearch} 
                disabled={isResearching || !topic}
                className="w-full font-mono uppercase tracking-wider text-xs mt-2"
              >
                {isResearching ? (
                  <><span className="animate-spin mr-2">◒</span> Analyzing Data...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Run AI Research</>
                )}
              </Button>
            </CardContent>
          </Card>

          {researchStream && (
            <Card className="bg-card/40 backdrop-blur border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-xs tracking-wider uppercase text-primary flex items-center">
                  <Activity className="w-4 h-4 mr-2" /> Intelligence Stream
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-h-[300px] overflow-y-auto">
                  <ReactMarkdown>{researchStream}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-8 bg-card/40 backdrop-blur border-muted">
          <CardHeader>
            <CardTitle className="font-mono text-sm tracking-wider uppercase">Keyword Library</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : keywords?.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-muted rounded-lg">
                <Search className="w-8 h-8 mb-2 opacity-20" />
                <p className="font-mono text-sm">No keywords tracked. Run research to populate.</p>
              </div>
            ) : (
              <div className="rounded-md border border-muted/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-mono text-xs uppercase">Keyword</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Volume</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-right">Difficulty</TableHead>
                      <TableHead className="font-mono text-xs uppercase">Intent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keywords?.map((kw) => (
                      <TableRow key={kw.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">{kw.keyword}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{kw.searchVolume?.toLocaleString() || '-'}</TableCell>
                        <TableCell className="text-right">
                          {kw.difficulty ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-mono ${kw.difficulty > 70 ? 'bg-destructive/20 text-destructive' : kw.difficulty > 40 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                              {kw.difficulty}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">{kw.intent || '-'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
