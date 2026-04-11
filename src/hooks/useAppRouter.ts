/**
 * useAppRouter - Syncs URL routes with the app's view state
 * 
 * This is a bridge between React Router and the existing useState-based
 * view management. It allows the app to use proper URLs while keeping
 * the existing component structure intact.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

// Map view names to URL paths
const VIEW_TO_PATH: Record<string, string> = {
  'login': '/login',
  'office-dashboard': '/',
  'office-pipeline': '/pipeline',
  'office-job-detail': '/jobs', // needs /:id appended
  'office-new-job': '/new',
  'new-job': '/new',
  'estimate-detail': '/estimates', // needs /:id appended
  'estimator-dashboard': '/estimator',
  'estimator-calculator': '/estimator/calculator',
  'estimator-workflow': '/estimator/workflow', // needs /:id appended
  'estimator-calendar': '/estimator/calendar',
  'stats': '/stats',
  'scheduling': '/schedule',
  'resources': '/resources',
  'chat': '/chat',
  'customers': '/customers',
  'user-management': '/users',
  'detail': '/jobs', // legacy - same as office-job-detail
  'jobs': '/field/jobs',
  'workflow': '/field/workflow', // needs /:id appended
  'customer-portal': '/portal', // needs /:token appended
};

// Map URL paths back to view names
const PATH_TO_VIEW: Record<string, string> = {
  '/login': 'login',
  '/': 'office-dashboard',
  '/pipeline': 'office-pipeline',
  '/new': 'office-new-job',
  '/estimator': 'estimator-dashboard',
  '/estimator/calculator': 'estimator-calculator',
  '/estimator/calendar': 'estimator-calendar',
  '/stats': 'stats',
  '/schedule': 'scheduling',
  '/resources': 'resources',
  '/chat': 'chat',
  '/customers': 'customers',
  '/users': 'user-management',
  '/field/jobs': 'jobs',
};

/**
 * Convert a URL pathname to a view name.
 * Handles dynamic segments like /jobs/:id, /estimates/:id, /portal/:token
 */
export function pathToView(pathname: string): { view: string; id?: string } {
  // Exact matches first
  if (PATH_TO_VIEW[pathname]) {
    return { view: PATH_TO_VIEW[pathname] };
  }

  // Dynamic route matches
  if (pathname.startsWith('/jobs/')) {
    return { view: 'office-job-detail', id: pathname.split('/')[2] };
  }
  if (pathname.startsWith('/estimates/')) {
    return { view: 'estimate-detail', id: pathname.split('/')[2] };
  }
  if (pathname.startsWith('/estimator/workflow/')) {
    return { view: 'estimator-workflow', id: pathname.split('/')[3] };
  }
  if (pathname.startsWith('/field/workflow/')) {
    return { view: 'workflow', id: pathname.split('/')[3] };
  }
  if (pathname.startsWith('/portal/')) {
    return { view: 'customer-portal', id: pathname.split('/')[2] };
  }

  // Portal via query param (legacy)
  if (pathname === '/' || pathname === '') {
    return { view: 'office-dashboard' };
  }

  // Default
  return { view: 'office-dashboard' };
}

/**
 * Convert a view name to a URL path.
 */
export function viewToPath(view: string, id?: string): string {
  const base = VIEW_TO_PATH[view] || '/';
  
  // Views that need an ID appended
  if (id && ['office-job-detail', 'detail', 'estimate-detail', 'estimator-workflow', 'workflow', 'customer-portal'].includes(view)) {
    return `${base}/${id}`;
  }
  
  return base;
}

/**
 * Hook that provides a navigate function that updates both URL and view state.
 */
export function useAppRouter(
  setView: (view: string) => void,
  selectedJobId?: string
) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMounted = useRef(false);

  // Navigate to a view (updates both URL and view state)
  const navigateTo = useCallback((view: string, id?: string) => {
    const path = viewToPath(view, id);
    setView(view);

    // Only push to history if the path actually changed
    if (location.pathname !== path) {
      navigate(path, { replace: false });
    }
  }, [navigate, setView, location.pathname]);

  // Handle browser back/forward — skip initial mount so the App's auth-aware
  // view initializer (which checks currentUser) is not overridden by the URL.
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const { view } = pathToView(location.pathname);
    setView(view);
  }, [location.pathname, setView]);

  return { navigateTo, currentPath: location.pathname };
}
