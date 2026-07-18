import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import LandingPage from '@/pages/landing';
import Dashboard from '@/pages/dashboard';
import IncidentsPage from '@/pages/incidents';
import NewIncidentPage from '@/pages/incident-new';
import IncidentDetailPage from '@/pages/incident-detail';
import MapPage from '@/pages/map';
import ResourcesPage from '@/pages/resources';
import AnalyticsPage from '@/pages/analytics';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/incidents" component={IncidentsPage} />
      <Route path="/incidents/new" component={NewIncidentPage} />
      <Route path="/incidents/:id" component={IncidentDetailPage} />
      <Route path="/map" component={MapPage} />
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
