import { useBusiness } from "@/lib/business-context";
import { useGetBusinessStats, useGetActivityFeed, useListRecentContent, getGetBusinessStatsQueryKey, getGetActivityFeedQueryKey, getListRecentContentQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { BarChart3, FileText, Megaphone, Target, Users, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { activeBusinessId } = useBusiness();

  const { data: stats, isLoading: statsLoading } = useGetBusinessStats(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getGetBusinessStatsQueryKey(activeBusinessId || 0) }
  });

  const { data: activity, isLoading: activityLoading } = useGetActivityFeed(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getGetActivityFeedQueryKey(activeBusinessId || 0) }
  });

  const { data: recentContent, isLoading: contentLoading } = useListRecentContent(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getListRecentContentQueryKey(activeBusinessId || 0) }
  });

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <Target className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-2">No Active Context</h2>
        <p className="text-muted-foreground">Select a business from the sidebar to view its command center, or create a new business to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase">Command Center</h1>
        <p className="text-muted-foreground">High-level overview of your marketing operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Content" value={stats?.totalContent} icon={FileText} loading={statsLoading} />
        <StatCard title="Active Campaigns" value={stats?.activeCampaigns} icon={Megaphone} loading={statsLoading} />
        <StatCard title="Tracked Keywords" value={stats?.totalKeywords} icon={Search} loading={statsLoading} />
        <StatCard title="Competitors" value={stats?.totalCompetitors} icon={Users} loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-card/50 backdrop-blur border-muted">
          <CardHeader>
            <CardTitle className="font-mono text-sm tracking-wider uppercase">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map(item => (
                  <div key={item.id} className="flex items-start gap-4 p-3 rounded bg-muted/30 border border-muted/50">
                    <div className="mt-1 bg-primary/20 p-2 rounded text-primary">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">No recent activity found.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-muted">
          <CardHeader>
            <CardTitle className="font-mono text-sm tracking-wider uppercase">Recent Content</CardTitle>
          </CardHeader>
          <CardContent>
             {contentLoading ? (
               <div className="space-y-4">
                 {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
               </div>
             ) : recentContent && recentContent.length > 0 ? (
               <div className="space-y-4">
                 {recentContent.slice(0, 5).map(content => (
                   <div key={content.id} className="p-3 rounded border border-muted/50 hover:border-primary/50 transition-colors">
                     <div className="flex justify-between items-start mb-1">
                       <span className="text-xs font-mono px-2 py-0.5 bg-muted text-muted-foreground rounded uppercase">{content.type}</span>
                       <span className="text-xs text-muted-foreground">{format(new Date(content.createdAt), 'MMM d')}</span>
                     </div>
                     <p className="text-sm font-medium truncate">{content.title}</p>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-sm text-muted-foreground text-center py-8">No content generated yet.</div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading }: { title: string, value?: number, icon: any, loading: boolean }) {
  return (
    <Card className="bg-card/50 backdrop-blur border-muted overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
        <Icon className="w-16 h-16" />
      </div>
      <CardHeader className="pb-2">
        <CardDescription className="font-mono uppercase tracking-wider text-xs">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold font-mono text-primary">{value || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
