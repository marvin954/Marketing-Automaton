import { Link, useLocation } from "wouter";
import { useBusiness } from "@/lib/business-context";
import { useListBusinesses } from "@workspace/api-client-react";
import {
  LayoutDashboard, Building2, PenTool, Megaphone, BarChart3,
  Search, Crosshair, BotMessageSquare, ChevronLeft, ChevronRight,
  ChevronsUpDown, Check, Layers,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Businesses", href: "/businesses", icon: Building2 },
  { name: "Funnels", href: "/funnels", icon: Layers },
  { name: "Content", href: "/content", icon: PenTool },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "SEO Hub", href: "/seo", icon: Search },
  { name: "Competitors", href: "/competitors", icon: Crosshair },
  { name: "Assistant", href: "/assistant", icon: BotMessageSquare },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { activeBusinessId, setActiveBusinessId } = useBusiness();
  const { data: businesses } = useListBusinesses();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  const activeBusiness = businesses?.find((b) => b.id === activeBusinessId);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <div
        className={cn(
          "relative flex flex-col border-r bg-card transition-all duration-200 ease-in-out shrink-0",
          collapsed ? "w-[60px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center border-b h-[57px] overflow-hidden", collapsed ? "px-3 justify-center" : "px-4")}>
          {collapsed ? (
            <span className="bg-primary text-primary-foreground text-xs font-bold font-mono px-1.5 py-0.5 rounded shrink-0">OM</span>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-primary uppercase font-mono flex items-center gap-2 whitespace-nowrap">
              <span className="bg-primary text-primary-foreground p-1 rounded">OMNI</span> MARK
            </h1>
          )}
        </div>

        {/* Business Switcher */}
        <div className={cn("border-b", collapsed ? "px-2 py-3 flex justify-center" : "px-4 py-3")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-9 h-9 rounded-md bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Building2 className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-56 p-0">
                    <BusinessCombobox
                      businesses={businesses}
                      activeBusinessId={activeBusinessId}
                      onSelect={(id) => { setActiveBusinessId(id); setOpen(false); }}
                    />
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent side="right">
                {activeBusiness?.name ?? "Select Business"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Active Context</label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono hover:bg-muted transition-colors">
                    <span className="truncate text-left flex-1 min-w-0">
                      {activeBusiness?.name ?? <span className="text-muted-foreground">Select Business...</span>}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-56 p-0">
                  <BusinessCombobox
                    businesses={businesses}
                    activeBusinessId={activeBusinessId}
                    onSelect={(id) => { setActiveBusinessId(id); setOpen(false); }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navigation.map((item) => {
            const isActive = location === item.href;
            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-center h-9 w-full rounded-md transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.name}</TooltipContent>
                </Tooltip>
              );
            }
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[26px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative min-w-0">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        <main className="min-h-full p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function BusinessCombobox({
  businesses,
  activeBusinessId,
  onSelect,
}: {
  businesses: { id: number; name: string; industry: string }[] | undefined;
  activeBusinessId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Search businesses..." className="h-9 font-mono text-xs" />
      <CommandList>
        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">No businesses found.</CommandEmpty>
        <CommandGroup>
          {businesses?.map((b) => (
            <CommandItem
              key={b.id}
              value={b.name}
              onSelect={() => onSelect(b.id)}
              className="font-mono text-xs"
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium truncate">{b.name}</span>
                <span className="text-muted-foreground text-[10px] truncate">{b.industry}</span>
              </div>
              {activeBusinessId === b.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary ml-2" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
