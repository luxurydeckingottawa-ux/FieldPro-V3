/**
 * Safely sets an item in localStorage with error handling for QuotaExceededError.
 */
export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`LocalStorage persistence failed for ${key}:`, e);
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' || 
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      // Attempt to prune non-critical data to free up space
      const pruned = pruneStorage();
      if (pruned) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error("Retry after pruning also failed:", retryError);
        }
      }

      // Only alert once per session or throttle to avoid annoying the user
      const lastAlert = sessionStorage.getItem('last_quota_alert');
      const now = Date.now();
      if (!lastAlert || now - parseInt(lastAlert) > 60000) {
        window.dispatchEvent(new CustomEvent('storage-quota-error'));
        console.error("Local storage is full. Some data (like sketches or photos) may not be saved. Please try clearing old jobs or browser data.");
        sessionStorage.setItem('last_quota_alert', now.toString());
      }
    }
    // We don't re-throw here to prevent the app from crashing
    return false;
  }
  return true;
};

/**
 * Prunes non-critical data from localStorage to free up space.
 */
const pruneStorage = () => {
  let pruned = false;
  
  // 1. Prune old estimator intakes (likely the largest)
  const intakeKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('estimator_intake_')) {
      intakeKeys.push(key);
    }
  }
  
  if (intakeKeys.length > 0) {
    // Keep only the 3 most recent intakes
    const toRemove = intakeKeys.slice(0, Math.max(0, intakeKeys.length - 3));
    toRemove.forEach(k => localStorage.removeItem(k));
    if (toRemove.length > 0) pruned = true;
  }

  // 2. Prune chat history
  const chatKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('luxury_decking_chat_')) {
      chatKeys.push(key);
    }
  }
  
  if (chatKeys.length > 0) {
    chatKeys.forEach(k => localStorage.removeItem(k));
    pruned = true;
  }

  // 3. Prune app state history if any
  const stateKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('luxury_decking_app_state_')) {
      stateKeys.push(key);
    }
  }
  
  if (stateKeys.length > 0) {
    stateKeys.forEach(k => localStorage.removeItem(k));
    pruned = true;
  }

  return pruned;
};

/**
 * Safely gets an item from localStorage.
 */
export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`LocalStorage retrieval failed for ${key}:`, e);
    return null;
  }
};

/**
 * Removes an item from localStorage.
 */
export const safeRemoveItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`LocalStorage removal failed for ${key}:`, e);
  }
};
