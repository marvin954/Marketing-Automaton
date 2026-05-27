import { useState, useRef, useEffect } from "react";
import { 
  useListOpenaiConversations, 
  getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  useListOpenaiMessages,
  getListOpenaiMessagesQueryKey,
  useDeleteOpenaiConversation
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BotMessageSquare, Plus, Send, Trash2, User, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Assistant() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversations, isLoading: convsLoading } = useListOpenaiConversations();
  const createMutation = useCreateOpenaiConversation();
  const deleteMutation = useDeleteOpenaiConversation();

  const { data: messages, isLoading: msgsLoading } = useListOpenaiMessages(activeConversationId || 0, {
    query: { enabled: !!activeConversationId, queryKey: getListOpenaiMessagesQueryKey(activeConversationId || 0) }
  });

  const { data: activeConv } = useGetOpenaiConversation(activeConversationId || 0, {
    query: { enabled: !!activeConversationId, queryKey: ['getOpenaiConversation', activeConversationId] }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleNewConversation = () => {
    createMutation.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveConversationId(data.id);
      }
    });
  };

  const handleDeleteConversation = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (activeConversationId === id) setActiveConversationId(null);
        toast({ title: "Conversation deleted" });
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConversationId || isStreaming) return;
    
    const userMessage = input;
    setInput("");
    setIsStreaming(true);
    setStreamingMessage("");

    // Optimistically add user message to local cache if desired, but we'll just wait for the refetch
    // Actually, to make it feel fast, we could just show it, but for simplicity we rely on the SSE event.

    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${BASE}/api/openai/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
      });

      if (!resp.ok) throw new Error("Failed to send message");
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
              if (event.content) setStreamingMessage(t => t + event.content);
              if (event.done) {
                queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(activeConversationId) });
              }
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] animate-in fade-in duration-500 flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase flex items-center gap-2">
          <BotMessageSquare className="w-8 h-8 text-primary" /> AI Assistant
        </h1>
        <p className="text-muted-foreground">Strategic marketing intelligence, on demand.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0">
        <Card className="col-span-1 bg-card/40 backdrop-blur border-muted flex flex-col min-h-0">
          <CardHeader className="pb-3 border-b border-muted/50">
            <Button onClick={handleNewConversation} disabled={createMutation.isPending} className="w-full font-mono text-xs uppercase tracking-wider">
              <Plus className="w-4 h-4 mr-2" /> New Session
            </Button>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            {convsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : conversations?.length === 0 ? (
              <div className="text-center text-sm font-mono text-muted-foreground py-8">
                No history
              </div>
            ) : (
              <div className="space-y-1">
                {conversations?.map(conv => (
                  <div 
                    key={conv.id} 
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-3 rounded-md cursor-pointer transition-colors group flex justify-between items-center ${activeConversationId === conv.id ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent'}`}
                  >
                    <div className="truncate text-sm font-medium mr-2">{conv.title}</div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/20" onClick={(e) => handleDeleteConversation(conv.id, e)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="col-span-1 md:col-span-3 bg-card/40 backdrop-blur border-muted flex flex-col min-h-0 relative">
          {!activeConversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-mono text-sm uppercase tracking-wider">Select or start a session</p>
            </div>
          ) : (
            <>
              <CardHeader className="py-3 border-b border-muted/50 bg-muted/10">
                <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> 
                  {activeConv?.title || "Active Session"}
                </CardTitle>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                {msgsLoading ? (
                  <div className="space-y-6">
                    <Skeleton className="h-16 w-[80%] ml-auto" />
                    <Skeleton className="h-24 w-[80%]" />
                  </div>
                ) : (
                  <>
                    {messages?.map((msg) => (
                      <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-secondary' : 'bg-primary/20 text-primary'}`}>
                          {msg.role === 'user' ? <User className="w-4 h-4" /> : <BotMessageSquare className="w-4 h-4" />}
                        </div>
                        <div className={`max-w-[80%] rounded-lg p-4 font-sans text-sm ${msg.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-muted/30 border border-muted'}`}>
                          <ReactMarkdown className="prose prose-sm prose-invert max-w-none">{msg.content}</ReactMarkdown>
                          <div className={`text-[10px] font-mono mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : ''}`}>
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isStreaming && (
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-primary/20 text-primary">
                          <BotMessageSquare className="w-4 h-4" />
                        </div>
                        <div className="max-w-[80%] rounded-lg p-4 font-sans text-sm bg-muted/30 border border-muted border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                          {streamingMessage ? (
                            <ReactMarkdown className="prose prose-sm prose-invert max-w-none">{streamingMessage}</ReactMarkdown>
                          ) : (
                            <span className="flex items-center gap-1 text-primary animate-pulse">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                              <span className="w-1.5 h-1.5 bg-primary rounded-full animation-delay-200"></span>
                              <span className="w-1.5 h-1.5 bg-primary rounded-full animation-delay-400"></span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-4 border-t border-muted/50 bg-background/50">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
                  className="flex gap-2"
                >
                  <Input 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    placeholder="Ask for strategy, review copy, or analyze data..." 
                    className="flex-1 bg-muted/50 font-mono text-sm"
                    disabled={isStreaming}
                  />
                  <Button type="submit" disabled={!input.trim() || isStreaming} className="w-12 h-10 px-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
