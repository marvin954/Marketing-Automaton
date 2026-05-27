import { useBusiness } from "@/lib/business-context";
import { useFetchAnalytics, getFetchAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

export default function Analytics() {
  const { activeBusinessId } = useBusiness();

  const { data: analytics, isLoading } = useFetchAnalytics(activeBusinessId || 0, {
    query: { enabled: !!activeBusinessId, queryKey: getFetchAnalyticsQueryKey(activeBusinessId || 0) }
  });

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
        <Target className="w-16 h-16 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-2">No Active Context</h2>
        <p className="text-muted-foreground">Select a business from the sidebar to view analytics.</p>
      </div>
    );
  }

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-primary" /> Analytics
        </h1>
        <p className="text-muted-foreground">Performance telemetry and content distribution metrics.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : (
          <>
            <MetricCard title="Content Generated" value={analytics?.contentGenerated} />
            <MetricCard title="Campaigns Run" value={analytics?.campaignsRun} />
            <MetricCard title="Keywords Tracked" value={analytics?.keywordsTracked} />
            <MetricCard title="Competitors Analyzed" value={analytics?.competitorsAnalyzed} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card/40 backdrop-blur border-muted">
          <CardHeader>
            <CardTitle className="font-mono text-sm tracking-wider uppercase">Content Distribution</CardTitle>
            <CardDescription>Breakdown of AI-generated content by type.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : analytics?.contentByType && analytics.contentByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.contentByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="label"
                    stroke="none"
                  >
                    {analytics.contentByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'var(--app-font-mono)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm border border-dashed border-muted rounded">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur border-muted">
          <CardHeader>
            <CardTitle className="font-mono text-sm tracking-wider uppercase">Campaign Activity</CardTitle>
            <CardDescription>Volume of campaigns over time periods.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : analytics?.campaignActivity && analytics.campaignActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.campaignActivity} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm border border-dashed border-muted rounded">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value = 0 }: { title: string, value?: number }) {
  return (
    <Card className="bg-card/40 backdrop-blur border-muted border-t-2 border-t-primary/50">
      <CardContent className="p-6">
        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
        <p className="text-4xl font-mono text-foreground tracking-tighter">{value}</p>
      </CardContent>
    </Card>
  );
}
