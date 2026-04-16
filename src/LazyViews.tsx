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

// Re-export the named types from EstimatorCalculatorView that App.tsx uses
export type { CalculatorDimensions, CalculatorClientInfo } from './estimator/EstimatorCalculatorView';
