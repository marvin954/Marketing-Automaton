import { useState } from "react";
import { useBusiness } from "@/lib/business-context";
import { useFetchContent, getFetchContentQueryKey, useDeleteContent } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PenTool, Target, Wand2, Trash2, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";

export default function ContentStudio() {
  const { activeBusinessId } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contentPieces, isLoading } = useFetchContent(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getFetchContentQueryKey(activeBusinessId || 0) }
  });

  const deleteMutation = useDeleteContent();

  const [type, setType] = useState("blog");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [platform, setPlatform] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");

  const handleGenerate = async () => {
    if (!activeBusinessId) return;
    if (!topic) {
      toast({ title: "Topic required", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setStreamedContent("");

    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${BASE}/api/businesses/${activeBusinessId}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, topic, tone, platform, additionalContext }),
      });

      if (!resp.ok) throw new Error("Failed to generate content");
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
              if (event.content) {
                setStreamedContent(t => t + event.content);
              }
              if (event.done) {
                queryClient.invalidateQueries({ queryKey: getFetchContentQueryKey(activeBusinessId) });
                toast({ title: "Content generated and saved successfully!" });
              }
            } catch (e) {
              console.error("Error parsing SSE event", e);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Content deleted" });
        queryClient.invalidateQueries({ queryKey: getFetchContentQueryKey(activeBusinessId || 0) });
      }
    });
  };

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
        <Target className="w-16 h-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-2">No Active Context</h2>
        <p className="text-muted-foreground">Select a business from the sidebar to manage content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase">Content Studio</h1>
        <p className="text-muted-foreground">Generate, manage, and track your marketing content across all channels.</p>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="generate" className="font-mono uppercase tracking-wider text-xs">Generate</TabsTrigger>
          <TabsTrigger value="library" className="font-mono uppercase tracking-wider text-xs">Library</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="col-span-1 bg-card/40 backdrop-blur border-muted">
              <CardHeader>
                <CardTitle className="font-mono text-sm tracking-wider uppercase">Content Brief</CardTitle>
                <CardDescription>Configure parameters for the AI writer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase text-muted-foreground">Type</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-muted/50 border-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blog">Blog Post</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="ad">Ad Copy</SelectItem>
                      <SelectItem value="strategy">Strategy Doc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase text-muted-foreground">Topic</label>
                  <Input 
                    value={topic} 
                    onChange={e => setTopic(e.target.value)} 
                    placeholder="e.g. Q3 Product Launch" 
                    className="bg-muted/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-muted-foreground">Tone</label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="bg-muted/50 border-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                        <SelectItem value="thought-leadership">Thought Leadership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-muted-foreground">Platform</label>
                    <Input 
                      value={platform} 
                      onChange={e => setPlatform(e.target.value)} 
                      placeholder="e.g. LinkedIn" 
                      className="bg-muted/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase text-muted-foreground">Additional Context</label>
                  <Textarea 
                    value={additionalContext} 
                    onChange={e => setAdditionalContext(e.target.value)} 
                    placeholder="Key points, keywords, or background info..."
                    className="bg-muted/50 min-h-[120px]"
                  />
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !topic}
                  className="w-full font-mono uppercase tracking-wider text-xs py-6 mt-4"
                >
                  {isGenerating ? (
                    <><span className="animate-spin mr-2">◒</span> Generating...</>
                  ) : (
                    <><Wand2 className="w-4 h-4 mr-2" /> Generate Content</>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="col-span-2 bg-card/40 backdrop-blur border-muted min-h-[600px] flex flex-col">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="flex justify-between items-center">
                  <span className="font-mono text-sm tracking-wider uppercase">Output Stream</span>
                  {isGenerating && <span className="text-xs text-primary animate-pulse flex items-center"><PenTool className="w-3 h-3 mr-1"/> AI is writing...</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 relative overflow-hidden">
                <div className="absolute inset-0 p-6 overflow-y-auto font-sans prose prose-invert max-w-none text-sm">
                  {streamedContent ? (
                    <ReactMarkdown>{streamedContent}</ReactMarkdown>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground/50 font-mono text-xs uppercase tracking-widest">
                      Awaiting input
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="library">
          <Card className="bg-card/40 backdrop-blur border-muted">
            <CardHeader>
              <CardTitle className="font-mono text-sm tracking-wider uppercase">Content Library</CardTitle>
              <CardDescription>Review and manage all generated content for this business.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : contentPieces?.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-muted rounded-lg font-mono text-sm">
                  No content found. Go to Generate to create some.
                </div>
              ) : (
                <div className="space-y-4">
                  {contentPieces?.map(piece => (
                    <div key={piece.id} className="flex gap-4 p-4 rounded-lg border border-muted/50 hover:border-primary/30 bg-muted/20 transition-all group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono uppercase bg-primary/20 text-primary px-2 py-0.5 rounded">
                            {piece.type}
                          </span>
                          <span className="text-xs font-mono uppercase bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                            {piece.status}
                          </span>
                          {piece.platform && (
                            <span className="text-xs text-muted-foreground">on {piece.platform}</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(new Date(piece.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg truncate">{piece.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{piece.body.substring(0, 150)}...</p>
                      </div>
                      <div className="flex flex-col gap-2 justify-start opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="outline" size="sm" className="h-8 text-xs font-mono uppercase">Edit</Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive font-mono uppercase" onClick={() => handleDelete(piece.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
