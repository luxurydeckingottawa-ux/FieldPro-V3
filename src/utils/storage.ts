/**
 * Safely sets an item in localStorage with error handling for QuotaExceededError.
 * Never throws — returns true on success, false on failure.
 */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`LocalStorage persistence failed for ${key}:`, e);
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      // Attempt automatic prune then retry once
      const pruned = pruneStorage();
      if (pruned) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error('Retry after pruning also failed:', retryError);
        }
      }

      // Throttled banner — at most once per minute
      const lastAlert = sessionStorage.getItem('last_quota_alert');
      const now = Date.now();
      if (!lastAlert || now - parseInt(lastAlert) > 60_000) {
        window.dispatchEvent(new CustomEvent('storage-quota-error'));
        sessionStorage.setItem('last_quota_alert', now.toString());
      }
    }
    return false;
  }
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

/**
 * Returns the approximate localStorage usage in KB.
 */
export const getStorageUsageKB = (): number => {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      const val = localStorage.getItem(key) || '';
      total += key.length + val.length;
    }
    // UTF-16 encodes each char as 2 bytes
    return Math.round((total * 2) / 1024);
  } catch {
    return 0;
  }
};

/**
 * Lightweight automatic prune — called silently on QuotaExceededError.
 * Clears non-essential cached data that can be re-fetched from Supabase.
 * Returns true if anything was freed.
 */
const pruneStorage = (): boolean => {
  let pruned = false;

  // 1. Clear old estimator intakes — safe, Supabase holds the canonical copy.
  //    Keep only the 2 most recently written (by key order, which is insertion order).
  const intakeKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('estimator_intake_')) intakeKeys.push(key);
  }
  if (intakeKeys.length > 2) {
    intakeKeys.slice(0, intakeKeys.length - 2).forEach(k => localStorage.removeItem(k));
    pruned = true;
  }

  // 2. Clear chat history (ephemeral)
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('luxury_decking_chat_')) {
      localStorage.removeItem(key);
      pruned = true;
    }
  }

  // 3. Clear legacy app-state history keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('luxury_decking_app_state_')) {
      localStorage.removeItem(key);
      pruned = true;
    }
  }

  // 4. Prune price book images — keep only 10
  const pbImgKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('fieldpro_pb_img_')) pbImgKeys.push(key);
  }
  if (pbImgKeys.length > 10) {
    pbImgKeys.slice(0, pbImgKeys.length - 10).forEach(k => localStorage.removeItem(k));
    pruned = true;
  }

  // 5. Strip photo data URIs + calculatorOptions from the main jobs array.
  //    Photo https:// URLs are kept. calculatorOptions can be rebuilt from
  //    Supabase on next open — no data is lost.
  try {
    const jobsRaw = localStorage.getItem('luxury_decking_jobs_v5');
    if (jobsRaw) {
      const jobs = JSON.parse(jobsRaw);
      let stripped = false;
      for (const job of jobs) {
        // Strip photo data URIs (keep cloudinary https:// URLs)
        if (job.estimatorIntake?.photos) {
          job.estimatorIntake.photos = job.estimatorIntake.photos.map((p: { url?: string }) => {
            if (p.url && p.url.startsWith('data:')) {
              stripped = true;
              return { ...p, url: '' };
            }
            return p;
          });
        }
        // Strip calculatorOptions — large nested objects, safe to remove
        // (Supabase + estimateData hold enough to reconstruct)
        if (job.calculatorOptions) {
          delete job.calculatorOptions;
          stripped = true;
        }
      }
      if (stripped) {
        localStorage.setItem('luxury_decking_jobs_v5', JSON.stringify(jobs));
        pruned = true;
      }
    }
  } catch { /* ignore */ }

  return pruned;
};

/**
 * AGGRESSIVE free-space operation — called by the "Clear Cache" button.
 * Clears all pruneable data. Everything backed by Supabase is safe to remove.
 * Returns approximate KB freed.
 */
export const aggressiveFreeSpace = (): number => {
  const before = getStorageUsageKB();

  // 1. Clear ALL estimator intakes (Supabase is source of truth)
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('estimator_intake_')) {
      localStorage.removeItem(key);
    }
  }

  // 2. Clear chat history
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('luxury_decking_chat_')) {
      localStorage.removeItem(key);
    }
  }

  // 3. Clear legacy state keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('luxury_decking_app_state_')) {
      localStorage.removeItem(key);
    }
  }

  // 4. Strip photo data URIs + calculatorOptions + calculatorSelections
  //    + calculatorDimensions from every job in the jobs array.
  //    These are all derivable from Supabase on next load.
  try {
    const jobsRaw = localStorage.getItem('luxury_decking_jobs_v5');
    if (jobsRaw) {
      const jobs = JSON.parse(jobsRaw);
      for (const job of jobs) {
        // Strip photo data URIs
        if (job.estimatorIntake?.photos) {
          job.estimatorIntake.photos = job.estimatorIntake.photos.map((p: { url?: string }) => ({
            ...p,
            url: (typeof p.url === 'string' && p.url.startsWith('http')) ? p.url : '',
          }));
        }
        // Strip large estimator cache fields (rebuilt on next open)
        delete job.calculatorOptions;
        delete job.calculatorSelections;
        delete job.calculatorDimensions;
      }
      localStorage.setItem('luxury_decking_jobs_v5', JSON.stringify(jobs));
    }
  } catch { /* ignore */ }

  // 5. Prune price book images (keep most recent 5)
  const pbImgKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('fieldpro_pb_img_')) pbImgKeys.push(key);
  }
  if (pbImgKeys.length > 5) {
    pbImgKeys.slice(0, pbImgKeys.length - 5).forEach(k => localStorage.removeItem(k));
  }

  const after = getStorageUsageKB();
  return Math.max(0, before - after);
};
