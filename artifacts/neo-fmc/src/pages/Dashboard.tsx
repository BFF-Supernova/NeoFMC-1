import { useAuth } from '@/contexts/AuthContext';
import TenantAdminDashboard from './dashboards/TenantAdminDashboard';
import BranchManagerDashboard from './dashboards/BranchManagerDashboard';
import LoanOfficerDashboard from './dashboards/LoanOfficerDashboard';
import CollectionOfficerDashboard from './dashboards/CollectionOfficerDashboard';
import CashierDashboard from './dashboards/CashierDashboard';
import DataEntryDashboard from './dashboards/DataEntryDashboard';
import AuditorDashboard from './dashboards/AuditorDashboard';
import AccountantDashboard from './dashboards/AccountantDashboard';
import FinancialControllerDashboard from './dashboards/FinancialControllerDashboard';
import CFODashboard from './dashboards/CFODashboard';
import { LoadingDash } from './dashboards/shared';

const ROLE_DASHBOARD_MAP: Record<string, React.ComponentType> = {
  TenantAdmin: TenantAdminDashboard,
  SuperAdmin: TenantAdminDashboard,
  BranchManager: BranchManagerDashboard,
  LoanOfficer: LoanOfficerDashboard,
  CollectionOfficer: CollectionOfficerDashboard,
  Cashier: CashierDashboard,
  DataEntry: DataEntryDashboard,
  Auditor: AuditorDashboard,
  Accountant: AccountantDashboard,
  FinancialController: FinancialControllerDashboard,
  CFO: CFODashboard,
  HR: DataEntryDashboard,
  HRManager: BranchManagerDashboard,
};

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return <LoadingDash />;

  const RoleDashboard = ROLE_DASHBOARD_MAP[user.role] ?? TenantAdminDashboard;

  return <RoleDashboard />;
}
