/**
 * LazyViews.tsx -- Code-split wrappers for the heaviest view components.
 *
 * Each export is a thin wrapper that:
 *   1. Uses React.lazy() to dynamically import the real view
 *   2. Wraps it in <Suspense> with a branded loading spinner
 *   3. Forwards all props with full TypeScript safety via ComponentProps
 *
 * This means App.tsx only needs to swap one import line per view --
 * no Suspense boundaries needed at the call site.
 *
 * Bundle impact: each lazy-loaded view becomes its own chunk. The main
 * bundle shrinks by the combined weight of all 6 views.
 */

import React, { Suspense, ComponentProps } from 'react';

// ---------------------------------------------------------------------------
// Loading fallback -- matches the app's visual language
// ---------------------------------------------------------------------------
const LoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div
        className="animate-spin"
        style={{
          width: 32,
          height: 32,
          border: '3px solid var(--border-color)',
          borderTop: '3px solid var(--brand-gold)',
          borderRadius: '50%',
          margin: '0 auto 12px',
        }}
      />
      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading...</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Lazy imports -- each becomes a separate Vite chunk
// ---------------------------------------------------------------------------
const LazyEstimatorCalculatorView = React.lazy(
  () => import('./estimator/EstimatorCalculatorView')
);

const LazyOfficeJobDetailView = React.lazy(
  () => import('./views/OfficeJobDetailView')
);

const LazyCustomerPortalView = React.lazy(
  () => import('./views/CustomerPortalView')
);

const LazyEstimateDetailView = React.lazy(
  () => import('./views/EstimateDetailView')
);

const LazyStatsView = React.lazy(
  () => import('./views/StatsView')
);

const LazyChatView = React.lazy(
  () => import('./components/ChatView')
);

// Large route-level views (>400 lines or route-isolated) — safe to lazy since
// they are never rendered on the landing route.
const LazyEstimatePortalView = React.lazy(
  () => import('./views/EstimatePortalView')
);

const LazyPriceBookView = React.lazy(
  () => import('./views/PriceBookView')
);

const LazySchedulingCalendarView = React.lazy(
  () => import('./views/SchedulingCalendarView')
);

const LazyUnifiedPipelineView = React.lazy(
  () => import('./views/UnifiedPipelineView')
);

const LazyEstimatorWorkflowView = React.lazy(
  () => import('./views/EstimatorWorkflowView')
);

const LazyWorkflowContainer = React.lazy(
  () => import('./views/WorkflowContainer')
);

const LazyPublicBookingView = React.lazy(
  () => import('./views/PublicBookingView')
);

const LazyOfficeDashboardView = React.lazy(
  () => import('./views/OfficeDashboardView')
);

const LazyInvoicesView = React.lazy(
  () => import('./views/InvoicesView')
);

const LazyCustomersView = React.lazy(
  () => import('./views/CustomersView')
);

const LazyAutomationSettingsView = React.lazy(
  () => import('./views/AutomationSettingsView')
);

const LazyBookingSettingsView = React.lazy(
  () => import('./views/BookingSettingsView')
);

const LazyBusinessInfoView = React.lazy(
  () => import('./views/BusinessInfoView')
);

const LazyFieldResourcesView = React.lazy(
  () => import('./views/FieldResourcesView')
);

const LazyUserManagementView = React.lazy(
  () => import('./views/UserManagementView')
);

const LazyNewJobIntakeView = React.lazy(
  () => import('./views/NewJobIntakeView')
);

const LazyJobDetailView = React.lazy(
  () => import('./views/JobDetailView')
);

const LazyJobsListView = React.lazy(
  () => import('./views/JobsListView')
);

const LazyEstimatorDashboardView = React.lazy(
  () => import('./views/EstimatorDashboardView')
);

// ---------------------------------------------------------------------------
// Suspense-wrapped exports -- drop-in replacements for the original imports
// ---------------------------------------------------------------------------

type EstimatorCalculatorViewProps = ComponentProps<typeof LazyEstimatorCalculatorView>;
export const EstimatorCalculatorView: React.FC<EstimatorCalculatorViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyEstimatorCalculatorView {...props} />
  </Suspense>
);
EstimatorCalculatorView.displayName = 'EstimatorCalculatorView';

type OfficeJobDetailViewProps = ComponentProps<typeof LazyOfficeJobDetailView>;
export const OfficeJobDetailView: React.FC<OfficeJobDetailViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyOfficeJobDetailView {...props} />
  </Suspense>
);
OfficeJobDetailView.displayName = 'OfficeJobDetailView';

type CustomerPortalViewProps = ComponentProps<typeof LazyCustomerPortalView>;
export const CustomerPortalView: React.FC<CustomerPortalViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyCustomerPortalView {...props} />
  </Suspense>
);
CustomerPortalView.displayName = 'CustomerPortalView';

type EstimateDetailViewProps = ComponentProps<typeof LazyEstimateDetailView>;
export const EstimateDetailView: React.FC<EstimateDetailViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyEstimateDetailView {...props} />
  </Suspense>
);
EstimateDetailView.displayName = 'EstimateDetailView';

type StatsViewProps = ComponentProps<typeof LazyStatsView>;
export const StatsView: React.FC<StatsViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyStatsView {...props} />
  </Suspense>
);
StatsView.displayName = 'StatsView';

type ChatViewProps = ComponentProps<typeof LazyChatView>;
export const ChatView: React.FC<ChatViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyChatView {...props} />
  </Suspense>
);
ChatView.displayName = 'ChatView';

// ---------------------------------------------------------------------------
// Additional route-level lazy wrappers (Phase 2 cohesion pass — bundle split)
// ---------------------------------------------------------------------------

type EstimatePortalViewProps = ComponentProps<typeof LazyEstimatePortalView>;
export const EstimatePortalView: React.FC<EstimatePortalViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyEstimatePortalView {...props} />
  </Suspense>
);
EstimatePortalView.displayName = 'EstimatePortalView';

type PriceBookViewProps = ComponentProps<typeof LazyPriceBookView>;
export const PriceBookView: React.FC<PriceBookViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyPriceBookView {...props} />
  </Suspense>
);
PriceBookView.displayName = 'PriceBookView';

type SchedulingCalendarViewProps = ComponentProps<typeof LazySchedulingCalendarView>;
export const SchedulingCalendarView: React.FC<SchedulingCalendarViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazySchedulingCalendarView {...props} />
  </Suspense>
);
SchedulingCalendarView.displayName = 'SchedulingCalendarView';

type UnifiedPipelineViewProps = ComponentProps<typeof LazyUnifiedPipelineView>;
export const UnifiedPipelineView: React.FC<UnifiedPipelineViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyUnifiedPipelineView {...props} />
  </Suspense>
);
UnifiedPipelineView.displayName = 'UnifiedPipelineView';

type EstimatorWorkflowViewProps = ComponentProps<typeof LazyEstimatorWorkflowView>;
export const EstimatorWorkflowView: React.FC<EstimatorWorkflowViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyEstimatorWorkflowView {...props} />
  </Suspense>
);
EstimatorWorkflowView.displayName = 'EstimatorWorkflowView';

type WorkflowContainerProps = ComponentProps<typeof LazyWorkflowContainer>;
export const WorkflowContainer: React.FC<WorkflowContainerProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyWorkflowContainer {...props} />
  </Suspense>
);
WorkflowContainer.displayName = 'WorkflowContainer';

type PublicBookingViewProps = ComponentProps<typeof LazyPublicBookingView>;
export const PublicBookingView: React.FC<PublicBookingViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyPublicBookingView {...props} />
  </Suspense>
);
PublicBookingView.displayName = 'PublicBookingView';

type OfficeDashboardViewProps = ComponentProps<typeof LazyOfficeDashboardView>;
export const OfficeDashboardView: React.FC<OfficeDashboardViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyOfficeDashboardView {...props} />
  </Suspense>
);
OfficeDashboardView.displayName = 'OfficeDashboardView';

type InvoicesViewProps = ComponentProps<typeof LazyInvoicesView>;
export const InvoicesView: React.FC<InvoicesViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyInvoicesView {...props} />
  </Suspense>
);
InvoicesView.displayName = 'InvoicesView';

type CustomersViewProps = ComponentProps<typeof LazyCustomersView>;
export const CustomersView: React.FC<CustomersViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyCustomersView {...props} />
  </Suspense>
);
CustomersView.displayName = 'CustomersView';

type AutomationSettingsViewProps = ComponentProps<typeof LazyAutomationSettingsView>;
export const AutomationSettingsView: React.FC<AutomationSettingsViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyAutomationSettingsView {...props} />
  </Suspense>
);
AutomationSettingsView.displayName = 'AutomationSettingsView';

type BookingSettingsViewProps = ComponentProps<typeof LazyBookingSettingsView>;
export const BookingSettingsView: React.FC<BookingSettingsViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyBookingSettingsView {...props} />
  </Suspense>
);
BookingSettingsView.displayName = 'BookingSettingsView';

type BusinessInfoViewProps = ComponentProps<typeof LazyBusinessInfoView>;
export const BusinessInfoView: React.FC<BusinessInfoViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyBusinessInfoView {...props} />
  </Suspense>
);
BusinessInfoView.displayName = 'BusinessInfoView';

type FieldResourcesViewProps = ComponentProps<typeof LazyFieldResourcesView>;
export const FieldResourcesView: React.FC<FieldResourcesViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyFieldResourcesView {...props} />
  </Suspense>
);
FieldResourcesView.displayName = 'FieldResourcesView';

type UserManagementViewProps = ComponentProps<typeof LazyUserManagementView>;
export const UserManagementView: React.FC<UserManagementViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyUserManagementView {...props} />
  </Suspense>
);
UserManagementView.displayName = 'UserManagementView';

type NewJobIntakeViewProps = ComponentProps<typeof LazyNewJobIntakeView>;
export const NewJobIntakeView: React.FC<NewJobIntakeViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyNewJobIntakeView {...props} />
  </Suspense>
);
NewJobIntakeView.displayName = 'NewJobIntakeView';

type JobDetailViewProps = ComponentProps<typeof LazyJobDetailView>;
export const JobDetailView: React.FC<JobDetailViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyJobDetailView {...props} />
  </Suspense>
);
JobDetailView.displayName = 'JobDetailView';

type JobsListViewProps = ComponentProps<typeof LazyJobsListView>;
export const JobsListView: React.FC<JobsListViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyJobsListView {...props} />
  </Suspense>
);
JobsListView.displayName = 'JobsListView';

type EstimatorDashboardViewProps = ComponentProps<typeof LazyEstimatorDashboardView>;
export const EstimatorDashboardView: React.FC<EstimatorDashboardViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyEstimatorDashboardView {...props} />
  </Suspense>
);
EstimatorDashboardView.displayName = 'EstimatorDashboardView';

// Re-export the named types from EstimatorCalculatorView that App.tsx uses
export type { CalculatorDimensions, CalculatorClientInfo } from './estimator/EstimatorCalculatorView';
