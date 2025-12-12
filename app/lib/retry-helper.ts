/**
 * COMPREHENSIVE RETRY AND FALLBACK HELPER
 *
 * This module provides robust error handling and retry logic for ALL API calls
 * to ensure generation NEVER fails catastrophically.
 */

import { BeneficiaryInfo, VisaType } from '../types';

// ============================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  exponentialBase: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'socket hang up',
    'Connection error',
    'Network error',
    'timeout',
    'rate_limit',
    'overloaded',
    '429',
    '500',
    '502',
    '503',
    '504',
  ],
};

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the function or throws after all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt + 1}/${config.maxRetries}`);
      const result = await fn();

      if (attempt > 0) {
        console.log(`[Retry] Success on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const errorMessage = error.message || error.toString();
      const errorCode = error.code || '';
      const statusCode = error.status?.toString() || '';

      const isRetryable = config.retryableErrors.some(
        retryableError =>
          errorMessage.includes(retryableError) ||
          errorCode.includes(retryableError) ||
          statusCode.includes(retryableError)
      );

      // Log the error
      console.error(
        `[Retry] Attempt ${attempt + 1} failed:`,
        {
          message: errorMessage,
          code: errorCode,
          status: statusCode,
          isRetryable,
        }
      );

      // If not retryable or last attempt, throw immediately
      if (!isRetryable || attempt === config.maxRetries - 1) {
        console.error(`[Retry] Giving up after ${attempt + 1} attempts`);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(config.exponentialBase, attempt),
        config.maxDelay
      );

      console.log(`[Retry] Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

// ============================================
// SAFE WRAPPERS FOR API CALLS
// ============================================

/**
 * Safely call Claude API with retry logic and fallback
 *
 * @param fn - Function that makes Claude API call
 * @param fallbackContent - Content to return if all retries fail
 * @returns API response or fallback content
 */
export async function safeClaudeCall<T>(
  fn: () => Promise<T>,
  fallbackContent: T,
  operationName: string = 'Claude API call'
): Promise<T> {
  try {
    return await retryWithBackoff(fn, { maxRetries: 3 });
  } catch (error) {
    console.error(`[SafeClaudeCall] ${operationName} failed after all retries:`, error);
    console.log(`[SafeClaudeCall] Using fallback content for ${operationName}`);
    return fallbackContent;
  }
}

/**
 * Safely call Supabase with retry logic
 *
 * @param fn - Function that makes Supabase call
 * @param fallbackValue - Value to return if all retries fail
 * @returns Supabase response or fallback value
 */
export async function safeSupabaseCall<T>(
  fn: () => Promise<T>,
  fallbackValue: T,
  operationName: string = 'Supabase call'
): Promise<T> {
  try {
    return await retryWithBackoff(fn, { maxRetries: 3 });
  } catch (error) {
    console.error(`[SafeSupabaseCall] ${operationName} failed after all retries:`, error);
    console.log(`[SafeSupabaseCall] Using fallback value for ${operationName}`);
    return fallbackValue;
  }
}

// ============================================
// FALLBACK CONTENT GENERATION
// ============================================

/**
 * Create fallback document content when AI generation fails
 *
 * @param documentType - Type of document being generated
 * @param beneficiaryInfo - Information about the beneficiary
 * @returns Fallback content with instructions for manual completion
 */
export function createFallbackContent(
  documentType: string,
  beneficiaryInfo: BeneficiaryInfo
): string {
  const { fullName, visaType, fieldOfProfession, background } = beneficiaryInfo;

  const timestamp = new Date().toISOString();

  return `# ${documentType.toUpperCase()}
## ${visaType} PETITION - ${fullName}

**IMPORTANT NOTICE**: This document was generated using fallback mode due to a temporary service interruption. Please review and complete the sections marked [TO BE COMPLETED] with specific evidence and details.

---

## DOCUMENT INFORMATION

**Generated**: ${timestamp}
**Status**: Partial - Requires Manual Completion
**Beneficiary**: ${fullName}
**Visa Type**: ${visaType}
**Field**: ${fieldOfProfession}

---

## BENEFICIARY BACKGROUND

${background || '[TO BE COMPLETED: Provide detailed background information about the beneficiary, including their professional history, achievements, and qualifications.]'}

---

## ${visaType} QUALIFICATION ANALYSIS

### Legal Standards

The ${visaType} visa classification requires the petitioner to demonstrate that the beneficiary meets specific regulatory criteria as outlined in the relevant Code of Federal Regulations (CFR) sections.

**[TO BE COMPLETED]**: Include specific CFR citations and regulatory language for ${visaType}.

---

### Criterion Analysis

**[TO BE COMPLETED]**: For each applicable criterion:

1. **Criterion Name**: [Name from regulations]
   - **Regulatory Language**: [Exact text from CFR]
   - **Evidence Provided**: [List specific evidence]
   - **Analysis**: [Detailed explanation of how evidence meets the criterion]
   - **Strength Assessment**: [Strong/Moderate/Weak]

---

## EVIDENCE SUMMARY

**[TO BE COMPLETED]**: Provide a comprehensive list of all evidence submitted with this petition, organized by criterion.

**Evidence Types**:
- Awards and Recognition
- Media Coverage
- Publications
- Letters of Recommendation
- Membership Documentation
- Performance Statistics
- Other Supporting Evidence

---

## RECOMMENDATION

**[TO BE COMPLETED]**: Based on the evidence provided, provide a recommendation regarding the strength of this petition and the likelihood of approval.

---

## NEXT STEPS

To complete this document:

1. Review all evidence materials
2. Fill in all sections marked [TO BE COMPLETED]
3. Add specific regulatory citations
4. Include detailed criterion-by-criterion analysis
5. Reference specific exhibit numbers
6. Review for accuracy and completeness
7. Consider consulting with an immigration attorney for final review

---

## TECHNICAL NOTES

**Generation Status**: Fallback Mode
**Reason**: Temporary service interruption during AI-assisted generation
**Action Required**: Manual review and completion by qualified professional

This document serves as a template and starting point. All sections must be completed with specific, accurate information before submission to USCIS.

---

**DISCLAIMER**: This is a partial document generated in fallback mode. It is not complete and should not be submitted to USCIS without thorough review and completion by a qualified immigration professional.

---

*Document ID: ${documentType.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}*
*Generated: ${timestamp}*
`;
}

/**
 * Create a minimal fallback background paragraph
 */
export function createFallbackBackground(
  fullName: string,
  profession: string,
  visaType: string
): string {
  return `${fullName} is a ${profession} seeking ${visaType} classification based on demonstrated expertise and achievements in their field. This petition presents evidence of their qualifications, professional accomplishments, and standing within their industry. The documentation provided supports their eligibility for ${visaType} classification under applicable immigration regulations.`;
}

/**
 * Create fallback beneficiary lookup result
 */
export function createFallbackLookupResult(): any {
  return {
    sources: [],
    searchStrategy: 'Manual URL entry recommended due to lookup service unavailability',
    totalFound: 0,
    confidenceDistribution: { high: 0, medium: 0, low: 0 },
    verificationData: {
      likelyCorrectPerson: false,
      confidence: 'low' as const,
      keyIdentifiers: [],
      summary: 'Automated lookup unavailable. Please enter URLs manually.',
    },
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const errorMessage = error.message || error.toString();
  const errorCode = error.code || '';
  const statusCode = error.status?.toString() || '';

  return DEFAULT_RETRY_OPTIONS.retryableErrors.some(
    retryableError =>
      errorMessage.includes(retryableError) ||
      errorCode.includes(retryableError) ||
      statusCode.includes(retryableError)
  );
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[SafeJsonParse] Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Log error with context
 */
export function logError(context: string, error: any, additionalInfo?: any): void {
  console.error(`[ERROR] ${context}:`, {
    message: error.message || error.toString(),
    code: error.code,
    status: error.status,
    stack: error.stack,
    ...additionalInfo,
  });
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(
  obj: any,
  requiredFields: string[],
  objectName: string = 'Object'
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(field => !obj[field]);

  if (missing.length > 0) {
    console.error(`[Validation] ${objectName} missing required fields:`, missing);
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create a safe timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// ============================================
// PROGRESS TRACKING WITH ERROR HANDLING
// ============================================

export type ProgressCallback = (stage: string, progress: number, message: string) => void;

/**
 * Create a safe progress callback that never throws
 */
export function createSafeProgressCallback(
  callback?: ProgressCallback
): ProgressCallback {
  return (stage: string, progress: number, message: string) => {
    try {
      if (callback) {
        callback(stage, progress, message);
      }
    } catch (error) {
      console.error('[ProgressCallback] Error in progress callback:', error);
      // Swallow error to prevent it from breaking the generation flow
    }
  };
}

/**
 * Wrap an async operation with progress updates and error handling
 */
export async function withProgress<T>(
  operation: () => Promise<T>,
  stage: string,
  progress: number,
  message: string,
  progressCallback?: ProgressCallback,
  fallback?: T
): Promise<T> {
  const safeCallback = createSafeProgressCallback(progressCallback);

  try {
    safeCallback(stage, progress, message);
    const result = await operation();
    return result;
  } catch (error) {
    logError(`withProgress[${stage}]`, error);
    safeCallback(stage, progress, `Error: ${(error as Error).message || 'Unknown error'}`);

    if (fallback !== undefined) {
      console.log(`[withProgress] Using fallback value for ${stage}`);
      return fallback;
    }

    throw error;
  }
}
