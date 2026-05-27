import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BusinessProvider } from "@/lib/business-context";
import { Layout } from "@/components/layout";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Businesses from "@/pages/businesses";
import ContentStudio from "@/pages/content";
import Campaigns from "@/pages/campaigns";
import Analytics from "@/pages/analytics";
import SeoHub from "@/pages/seo";
import Competitors from "@/pages/competitors";
import Assistant from "@/pages/assistant";
import Funnels from "@/pages/funnels";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/businesses" component={Businesses} />
      <Route path="/content" component={ContentStudio} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/seo" component={SeoHub} />
      <Route path="/competitors" component={Competitors} />
      <Route path="/assistant" component={Assistant} />
      <Route path="/funnels" component={Funnels} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BusinessProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout>
              <Router />
            </Layout>
          </WouterRouter>
        </BusinessProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
