/**
 * In-memory progress store for when Supabase is unavailable
 * This provides a fallback mechanism to track generation progress
 */

export interface ProgressData {
  status: 'initializing' | 'researching' | 'generating' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  currentMessage: string;
  documents?: Array<{
    name: string;
    content: string;
    pageCount: number;
    wordCount: number;
  }>;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// In-memory store - Map of caseId to progress data
const progressStore = new Map<string, ProgressData>();

// Auto-cleanup old entries after 2 hours
const CLEANUP_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
const MAX_AGE = 4 * 60 * 60 * 1000; // 4 hours

// Cleanup old progress entries
function cleanupOldEntries() {
  const now = Date.now();
  const keysToDelete: string[] = [];

  progressStore.forEach((data, caseId) => {
    const createdAt = new Date(data.createdAt).getTime();
    if (now - createdAt > MAX_AGE) {
      keysToDelete.push(caseId);
    }
  });

  keysToDelete.forEach(caseId => {
    progressStore.delete(caseId);
    console.log(`[ProgressStore] Cleaned up old entry: ${caseId}`);
  });
}

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldEntries, CLEANUP_INTERVAL);
}

/**
 * Initialize progress for a new case
 */
export function initProgress(caseId: string): void {
  progressStore.set(caseId, {
    status: 'initializing',
    progress: 0,
    currentStage: 'Initializing',
    currentMessage: 'Starting document generation...',
    createdAt: new Date().toISOString(),
  });
  console.log(`[ProgressStore] Initialized progress for case: ${caseId}`);
}

/**
 * Update progress for a case
 */
export function setProgress(caseId: string, data: Partial<ProgressData>): void {
  const existing = progressStore.get(caseId);

  if (!existing) {
    // Initialize if not exists
    progressStore.set(caseId, {
      status: data.status || 'generating',
      progress: data.progress || 0,
      currentStage: data.currentStage || 'Processing',
      currentMessage: data.currentMessage || '',
      documents: data.documents,
      errorMessage: data.errorMessage,
      createdAt: new Date().toISOString(),
      completedAt: data.status === 'completed' ? new Date().toISOString() : undefined,
    });
  } else {
    // Update existing entry
    progressStore.set(caseId, {
      ...existing,
      ...data,
      completedAt: data.status === 'completed' ? new Date().toISOString() : existing.completedAt,
    });
  }

  console.log(`[ProgressStore] Updated progress for ${caseId}: ${data.progress}% - ${data.currentStage}`);
}

/**
 * Get progress for a case
 */
export function getProgress(caseId: string): ProgressData | null {
  const data = progressStore.get(caseId);
  if (!data) {
    console.log(`[ProgressStore] No progress found for case: ${caseId}`);
    return null;
  }
  return data;
}

/**
 * Delete progress for a case
 */
export function deleteProgress(caseId: string): void {
  progressStore.delete(caseId);
  console.log(`[ProgressStore] Deleted progress for case: ${caseId}`);
}

/**
 * Check if progress exists for a case
 */
export function hasProgress(caseId: string): boolean {
  return progressStore.has(caseId);
}

/**
 * Mark case as completed with documents
 */
export function completeProgress(
  caseId: string,
  documents: Array<{ name: string; content: string; pageCount: number; wordCount: number }>
): void {
  setProgress(caseId, {
    status: 'completed',
    progress: 100,
    currentStage: 'Complete',
    currentMessage: 'Documents generated successfully!',
    documents,
  });
}

/**
 * Mark case as failed
 */
export function failProgress(caseId: string, errorMessage: string): void {
  setProgress(caseId, {
    status: 'failed',
    currentStage: 'Error',
    currentMessage: 'Generation failed',
    errorMessage,
  });
}

export default progressStore;
