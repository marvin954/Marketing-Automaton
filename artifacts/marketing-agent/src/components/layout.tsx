import { Link, useLocation } from "wouter";
import { useBusiness } from "@/lib/business-context";
import { useListBusinesses } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Building2, PenTool, Megaphone, BarChart3, Search, Crosshair, BotMessageSquare } from "lucide-react";
import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { activeBusinessId, setActiveBusinessId } = useBusiness();
  const { data: businesses } = useListBusinesses();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Businesses", href: "/businesses", icon: Building2 },
    { name: "Content", href: "/content", icon: PenTool },
    { name: "Campaigns", href: "/campaigns", icon: Megaphone },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "SEO Hub", href: "/seo", icon: Search },
    { name: "Competitors", href: "/competitors", icon: Crosshair },
    { name: "Assistant", href: "/assistant", icon: BotMessageSquare },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r bg-card">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold tracking-tight text-primary uppercase font-mono mb-4 flex items-center gap-2">
            <span className="bg-primary text-primary-foreground p-1 rounded">OMNI</span> MARK
          </h1>
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Active Context</label>
            <Select
              value={activeBusinessId?.toString() || ""}
              onValueChange={(val) => setActiveBusinessId(Number(val))}
            >
              <SelectTrigger className="w-full font-mono text-sm bg-background border-input">
                <SelectValue placeholder="Select Business..." />
              </SelectTrigger>
              <SelectContent>
                {businesses?.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        <main className="min-h-full p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
