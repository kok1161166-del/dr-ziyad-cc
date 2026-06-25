import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/main-layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients/index";
import NewPatient from "@/pages/patients/new";
import ArchivedPatients from "@/pages/patients/archived";
import PatientDetail from "@/pages/patients/detail";
import Appointments from "@/pages/appointments";
import FinancialSummary from "@/pages/financial/index";
import Vaults from "@/pages/financial/vaults";
import Expenses from "@/pages/financial/expenses";
import Receivables from "@/pages/financial/receivables";
import Services from "@/pages/services";
import Inventory from "@/pages/inventory";
import Analytics from "@/pages/analytics";
import Templates from "@/pages/templates";
import Roles from "@/pages/roles";
import Settings from "@/pages/settings";
import Staff from "@/pages/staff";
import Tasks from "@/pages/tasks";
import Communication from "@/pages/communication";
import Backup from "@/pages/backup";

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
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        
        <Route path="/patients" component={Patients} />
        <Route path="/patients/new" component={NewPatient} />
        <Route path="/patients/archived" component={ArchivedPatients} />
        <Route path="/patients/:id" component={PatientDetail} />
        
        <Route path="/appointments" component={Appointments} />
        
        <Route path="/financial" component={FinancialSummary} />
        <Route path="/financial/vaults" component={Vaults} />
        <Route path="/financial/expenses" component={Expenses} />
        <Route path="/financial/receivables" component={Receivables} />
        
        <Route path="/services" component={Services} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/templates" component={Templates} />
        <Route path="/roles" component={Roles} />
        <Route path="/settings" component={Settings} />
        <Route path="/staff" component={Staff} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/communication" component={Communication} />
        <Route path="/backup" component={Backup} />
        
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
