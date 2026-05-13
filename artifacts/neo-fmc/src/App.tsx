import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

// Pages
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SuperAdmin from "@/pages/SuperAdmin";
import Clients from "@/pages/Clients";
import LoanRequests from "@/pages/LoanRequests";
import Loans from "@/pages/Loans";
import Finance from "@/pages/Finance";
import Collection from "@/pages/Collection";
import Calculator from "@/pages/Calculator";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import SalesAgents from "@/pages/SalesAgents";
import Approvals from "@/pages/Approvals";
import Blacklists from "@/pages/Blacklists";
import PortfolioTransfer from "@/pages/PortfolioTransfer";
import Expenses from "@/pages/Expenses";
import Epayments from "@/pages/Epayments";
import Workflows from "@/pages/Workflows";
import BranchRequests from "@/pages/BranchRequests";
import CreditLimits from "@/pages/CreditLimits";
import Cheques from "@/pages/Cheques";
import WireTransfers from "@/pages/WireTransfers";
import CashSettlements from "@/pages/CashSettlements";
import BulkOperations from "@/pages/BulkOperations";
import Notifications from "@/pages/Notifications";
import Offloading from "@/pages/Offloading";
import Guarantees from "@/pages/Guarantees";
import CollectionActivities from "@/pages/CollectionActivities";
import ClientGroups from "@/pages/ClientGroups";
import AuditTrail from "@/pages/AuditTrail";
import DailyClosing from "@/pages/DailyClosing";
import RiskCriteria from "@/pages/RiskCriteria";
import FinancialStatements from "@/pages/FinancialStatements";
import BankReconciliation from "@/pages/BankReconciliation";
import ComplianceExceptions from "@/pages/ComplianceExceptions";
import Savings from "@/pages/Savings";
import Collaterals from "@/pages/Collaterals";
import BranchCashTransfers from "@/pages/BranchCashTransfers";
import DataExport from "@/pages/DataExport";
import FRAReports from "@/pages/FRAReports";
import EmailNotifications from "@/pages/EmailNotifications";
import LoanAging from "@/pages/LoanAging";
import OfficerCheckins from "@/pages/OfficerCheckins";
import Webhooks from "@/pages/Webhooks";
import PortfolioAnalytics from "@/pages/PortfolioAnalytics";
import SmsNotifications from "@/pages/SmsNotifications";
import BulkAdjustments from "@/pages/BulkAdjustments";
import FixedAssets from "@/pages/FixedAssets";
import Vendors from "@/pages/Vendors";
import Employees from "@/pages/Employees";
import Budgets from "@/pages/Budgets";
import TaxConfig from "@/pages/TaxConfig";
import RecurringJournals from "@/pages/RecurringJournals";
import WorkflowGuide from "@/pages/WorkflowGuide";
import SelfService from "@/pages/SelfService";
import Legal from "@/pages/Legal";
import IFRS9Dashboard from "@/pages/IFRS9Dashboard";
import AIRiskEngine from "@/pages/AIRiskEngine";
import InsurancePage from "@/pages/InsurancePage";
import AgentBankingPage from "@/pages/AgentBankingPage";
import LoanRestructuringPage from "@/pages/LoanRestructuringPage";
import MobileWalletPage from "@/pages/MobileWalletPage";
import WhatsAppPage from "@/pages/WhatsAppPage";
import OCRDocumentsPage from "@/pages/OCRDocumentsPage";
import AICollectionPage from "@/pages/AICollectionPage";
import DynamicPricingPage from "@/pages/DynamicPricingPage";
import CashFlowPredictionPage from "@/pages/CashFlowPredictionPage";
import StressTestingPage from "@/pages/StressTestingPage";
import NLPReportingPage from "@/pages/NLPReportingPage";
import ChurnPredictionPage from "@/pages/ChurnPredictionPage";
import IScoreLivePage from "@/pages/IScoreLivePage";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  }),
});

// Route Guard Component
function ProtectedRoute({ component: Component, rolesAllowed, requiredModule }: { component: any, rolesAllowed?: string[], requiredModule?: string }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (rolesAllowed && user && !rolesAllowed.includes(user.role) && user.role !== 'SuperAdmin') {
    return <Redirect to="/dashboard" />;
  }

  if (requiredModule && user?.role !== 'SuperAdmin') {
    const modules = user?.modules as Record<string, boolean> | undefined;
    if (!modules || modules[requiredModule] !== true) {
      return <Redirect to="/dashboard" />;
    }
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/landing" component={Landing} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/login" component={Login} />
      
      {/* Super Admin Routes */}
      <Route path="/super-admin">
        {() => <ProtectedRoute component={SuperAdmin} rolesAllowed={["SuperAdmin"]} />}
      </Route>

      {/* Tenant Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Cashier", "Auditor", "DataEntry", "Accountant", "FinancialController", "CFO", "HR", "HRManager"]} />}
      </Route>
      <Route path="/clients">
        {() => <ProtectedRoute component={Clients} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Cashier", "Auditor", "DataEntry", "Accountant", "FinancialController", "CFO", "HR", "HRManager"]} />}
      </Route>
      <Route path="/calculator">
        {() => <ProtectedRoute component={Calculator} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "DataEntry"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/loan-requests">
        {() => <ProtectedRoute component={LoanRequests} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "Auditor", "DataEntry"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/loans">
        {() => <ProtectedRoute component={Loans} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Cashier", "Auditor", "DataEntry", "Accountant", "FinancialController", "CFO", "HR", "HRManager"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/finance">
        {() => <ProtectedRoute component={Finance} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "Auditor", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/collection">
        {() => <ProtectedRoute component={Collection} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Cashier", "Auditor"]} requiredModule="moduleCoreEdge" />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={Reports} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Auditor", "Accountant", "FinancialController", "CFO", "HRManager"]} />}
      </Route>
      <Route path="/sales-agents">
        {() => <ProtectedRoute component={SalesAgents} rolesAllowed={["TenantAdmin", "BranchManager"]} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} rolesAllowed={["TenantAdmin", "BranchManager", "HRManager"]} />}
      </Route>
      <Route path="/approvals">
        {() => <ProtectedRoute component={Approvals} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Auditor", "FinancialController", "CFO", "HRManager"]} />}
      </Route>
      <Route path="/blacklists">
        {() => <ProtectedRoute component={Blacklists} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Auditor"]} requiredModule="moduleCoreEdge" />}
      </Route>
      <Route path="/portfolio-transfer">
        {() => <ProtectedRoute component={PortfolioTransfer} rolesAllowed={["TenantAdmin", "BranchManager"]} />}
      </Route>
      <Route path="/expenses">
        {() => <ProtectedRoute component={Expenses} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "Auditor", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleCoreEdge" />}
      </Route>
      <Route path="/epayments">
        {() => <ProtectedRoute component={Epayments} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/workflows">
        {() => <ProtectedRoute component={Workflows} rolesAllowed={["TenantAdmin", "BranchManager"]} requiredModule="moduleCoreEdge" />}
      </Route>
      <Route path="/branch-requests">
        {() => <ProtectedRoute component={BranchRequests} rolesAllowed={["TenantAdmin", "BranchManager"]} />}
      </Route>
      <Route path="/credit-limits">
        {() => <ProtectedRoute component={CreditLimits} rolesAllowed={["TenantAdmin", "BranchManager"]} requiredModule="moduleAdvancedLending" />}
      </Route>
      <Route path="/cheques">
        {() => <ProtectedRoute component={Cheques} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "Auditor", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleFinancialSettlements" />}
      </Route>
      <Route path="/wire-transfers">
        {() => <ProtectedRoute component={WireTransfers} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "Auditor", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleFinancialSettlements" />}
      </Route>
      <Route path="/cash-settlements">
        {() => <ProtectedRoute component={CashSettlements} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleFinancialSettlements" />}
      </Route>
      <Route path="/bulk-operations">
        {() => <ProtectedRoute component={BulkOperations} rolesAllowed={["TenantAdmin", "BranchManager"]} requiredModule="moduleAdvancedLending" />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Cashier", "Accountant", "FinancialController", "CFO", "HR", "HRManager"]} />}
      </Route>
      <Route path="/offloading">
        {() => <ProtectedRoute component={Offloading} rolesAllowed={["TenantAdmin", "BranchManager"]} requiredModule="moduleCoreEdge" />}
      </Route>
      <Route path="/guarantees">
        {() => <ProtectedRoute component={Guarantees} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "Auditor"]} requiredModule="moduleAdvancedLending" />}
      </Route>
      <Route path="/collection-activities">
        {() => <ProtectedRoute component={CollectionActivities} rolesAllowed={["TenantAdmin", "BranchManager", "CollectionOfficer"]} requiredModule="moduleCoreEdge" />}
      </Route>
      <Route path="/client-groups">
        {() => <ProtectedRoute component={ClientGroups} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer"]} requiredModule="moduleAdvancedLending" />}
      </Route>
      <Route path="/risk-criteria">
        {() => <ProtectedRoute component={RiskCriteria} rolesAllowed={["TenantAdmin", "SuperAdmin", "CFO"]} />}
      </Route>
      <Route path="/audit-trail">
        {() => <ProtectedRoute component={AuditTrail} rolesAllowed={["TenantAdmin", "BranchManager", "Auditor", "FinancialController", "CFO", "HRManager"]} />}
      </Route>
      <Route path="/financial-statements">
        {() => <ProtectedRoute component={FinancialStatements} rolesAllowed={["TenantAdmin", "BranchManager", "Accountant", "Auditor", "FinancialController", "CFO"]} />}
      </Route>
      <Route path="/daily-closing">
        {() => <ProtectedRoute component={DailyClosing} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"]} />}
      </Route>
      <Route path="/bank-reconciliation">
        {() => <ProtectedRoute component={BankReconciliation} rolesAllowed={["TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/compliance-exceptions">
        {() => <ProtectedRoute component={ComplianceExceptions} rolesAllowed={["TenantAdmin", "Auditor", "FinancialController", "CFO"]} />}
      </Route>
      <Route path="/savings">
        {() => <ProtectedRoute component={Savings} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Cashier", "Auditor", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleSavings" />}
      </Route>
      <Route path="/collaterals">
        {() => <ProtectedRoute component={Collaterals} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "Auditor", "FinancialController", "CFO"]} requiredModule="moduleAdvancedLending" />}
      </Route>
      <Route path="/branch-cash-transfers">
        {() => <ProtectedRoute component={BranchCashTransfers} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier"]} />}
      </Route>
      <Route path="/data-export">
        {() => <ProtectedRoute component={DataExport} rolesAllowed={["TenantAdmin"]} />}
      </Route>
      <Route path="/fra-reports">
        {() => <ProtectedRoute component={FRAReports} rolesAllowed={["TenantAdmin", "BranchManager", "Auditor", "FinancialController", "CFO"]} />}
      </Route>
      <Route path="/email-notifications">
        {() => <ProtectedRoute component={EmailNotifications} rolesAllowed={["TenantAdmin", "BranchManager"]} />}
      </Route>
      <Route path="/loan-aging">
        {() => <ProtectedRoute component={LoanAging} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Auditor", "FinancialController", "CFO"]} />}
      </Route>
      <Route path="/officer-checkins">
        {() => <ProtectedRoute component={OfficerCheckins} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer"]} />}
      </Route>
      <Route path="/webhooks">
        {() => <ProtectedRoute component={Webhooks} rolesAllowed={["TenantAdmin"]} />}
      </Route>
      <Route path="/portfolio-analytics">
        {() => <ProtectedRoute component={PortfolioAnalytics} rolesAllowed={["TenantAdmin", "BranchManager", "Auditor", "FinancialController", "CFO"]} />}
      </Route>
      <Route path="/sms-notifications">
        {() => <ProtectedRoute component={SmsNotifications} rolesAllowed={["TenantAdmin", "BranchManager"]} />}
      </Route>
      <Route path="/bulk-adjustments">
        {() => <ProtectedRoute component={BulkAdjustments} rolesAllowed={["TenantAdmin"]} />}
      </Route>
      <Route path="/fixed-assets">
        {() => <ProtectedRoute component={FixedAssets} rolesAllowed={["TenantAdmin", "BranchManager", "Accountant", "Auditor", "FinancialController", "CFO"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/vendors">
        {() => <ProtectedRoute component={Vendors} rolesAllowed={["TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/employees">
        {() => <ProtectedRoute component={Employees} rolesAllowed={["TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO", "HR", "HRManager"]} requiredModule="moduleHRPayroll" />}
      </Route>
      <Route path="/budgets">
        {() => <ProtectedRoute component={Budgets} rolesAllowed={["TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/tax-config">
        {() => <ProtectedRoute component={TaxConfig} rolesAllowed={["TenantAdmin", "Accountant", "FinancialController"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/recurring-journals">
        {() => <ProtectedRoute component={RecurringJournals} rolesAllowed={["TenantAdmin", "Accountant", "FinancialController", "CFO"]} requiredModule="moduleCoreBasic" />}
      </Route>
      <Route path="/workflow-guide">
        {() => <ProtectedRoute component={WorkflowGuide} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Cashier", "Auditor", "DataEntry", "Accountant", "FinancialController", "CFO", "HR", "HRManager"]} />}
      </Route>
      <Route path="/self-service">
        {() => <ProtectedRoute component={SelfService} />}
      </Route>
      <Route path="/legal" component={Legal} />
      <Route path="/ifrs9">
        {() => <ProtectedRoute component={IFRS9Dashboard} rolesAllowed={["TenantAdmin", "CFO", "Accountant", "Auditor", "FinancialController"]} requiredModule="moduleIFRS9" />}
      </Route>
      <Route path="/ai-risk">
        {() => <ProtectedRoute component={AIRiskEngine} rolesAllowed={["TenantAdmin", "CFO", "BranchManager", "Auditor", "CollectionOfficer", "LoanOfficer"]} requiredModule="moduleAIRisk" />}
      </Route>
      <Route path="/insurance">
        {() => <ProtectedRoute component={InsurancePage} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CFO", "Accountant"]} requiredModule="moduleInsurance" />}
      </Route>
      <Route path="/agent-banking">
        {() => <ProtectedRoute component={AgentBankingPage} rolesAllowed={["TenantAdmin", "BranchManager"]} requiredModule="moduleAgentBanking" />}
      </Route>
      <Route path="/loan-restructuring">
        {() => <ProtectedRoute component={LoanRestructuringPage} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer"]} requiredModule="moduleLoanRestructuring" />}
      </Route>
      <Route path="/mobile-wallet">
        {() => <ProtectedRoute component={MobileWalletPage} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "Accountant"]} requiredModule="moduleMobileWallet" />}
      </Route>
      <Route path="/whatsapp">
        {() => <ProtectedRoute component={WhatsAppPage} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer"]} requiredModule="moduleWhatsApp" />}
      </Route>
      <Route path="/ocr-documents">
        {() => <ProtectedRoute component={OCRDocumentsPage} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer", "DataEntry"]} requiredModule="moduleOCR" />}
      </Route>
      <Route path="/ai-collection">
        {() => <ProtectedRoute component={AICollectionPage} rolesAllowed={["TenantAdmin", "BranchManager", "CollectionOfficer"]} requiredModule="moduleAICollection" />}
      </Route>
      <Route path="/dynamic-pricing">
        {() => <ProtectedRoute component={DynamicPricingPage} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer"]} requiredModule="moduleDynamicPricing" />}
      </Route>
      <Route path="/cash-flow-prediction">
        {() => <ProtectedRoute component={CashFlowPredictionPage} rolesAllowed={["TenantAdmin", "BranchManager", "Cashier", "FinancialController", "CFO"]} requiredModule="moduleCashFlowPrediction" />}
      </Route>
      <Route path="/stress-testing">
        {() => <ProtectedRoute component={StressTestingPage} rolesAllowed={["TenantAdmin", "CFO", "FinancialController"]} requiredModule="moduleAIStressTesting" />}
      </Route>
      <Route path="/nlp-reporting">
        {() => <ProtectedRoute component={NLPReportingPage} rolesAllowed={["TenantAdmin", "CFO", "FinancialController", "BranchManager", "Auditor"]} requiredModule="moduleNLPReporting" />}
      </Route>
      <Route path="/churn-prediction">
        {() => <ProtectedRoute component={ChurnPredictionPage} rolesAllowed={["TenantAdmin", "BranchManager"]} requiredModule="moduleChurnPrediction" />}
      </Route>
      <Route path="/iscore-live">
        {() => <ProtectedRoute component={IScoreLivePage} rolesAllowed={["TenantAdmin", "BranchManager", "LoanOfficer"]} requiredModule="moduleIScorelive" />}
      </Route>

      {/* Root redirection based on auth state handled within ProtectedRoute conceptually, but here we explicitly route / */}
      <Route path="/">
        {() => {
          const { isAuthenticated, user, isLoading } = useAuth();
          if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
          if (!isAuthenticated) return <Redirect to="/landing" />;
          if (user?.role === 'HRSelfService') return <Redirect to="/self-service" />;
          return <Redirect to="/dashboard" />;
        }}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <TooltipProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <TenantProvider>
                  <Router />
                  <Toaster />
                </TenantProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </TooltipProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
