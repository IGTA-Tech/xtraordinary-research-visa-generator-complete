import axios from 'axios';

export interface ArchivedUrl {
  originalUrl: string;
  archiveUrl: string | null;
  archivedAt: Date;
  success: boolean;
  error?: string;
}

/**
 * Archive a single URL to the Wayback Machine (archive.org)
 *
 * This ensures URLs are preserved even if the original disappears
 * Critical for visa petitions where evidence must be verifiable
 */
export async function archiveUrl(url: string): Promise<ArchivedUrl> {
  try {
    // Save to Wayback Machine
    const saveResponse = await axios.get(
      `https://web.archive.org/save/${url}`,
      {
        timeout: 30000, // 30 second timeout
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Accept all non-500 errors
      }
    );

    // Try to get the archived URL from response headers
    let archivedUrl: string | null = null;

    // Check Content-Location header
    if (saveResponse.headers['content-location']) {
      archivedUrl = `https://web.archive.org${saveResponse.headers['content-location']}`;
    } else {
      // Fallback: construct URL manually with current timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, '')
        .slice(0, 14);
      archivedUrl = `https://web.archive.org/web/${timestamp}/${url}`;
    }

    return {
      originalUrl: url,
      archiveUrl: archivedUrl,
      archivedAt: new Date(),
      success: true,
    };
  } catch (error) {
    console.error(`Failed to archive URL: ${url}`, error);

    return {
      originalUrl: url,
      archiveUrl: null,
      archivedAt: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Archive multiple URLs with progress tracking
 *
 * @param urls - Array of URLs to archive
 * @param onProgress - Callback for progress updates
 * @returns Array of archived URL results
 */
export async function archiveMultipleUrls(
  urls: string[],
  onProgress?: (current: number, total: number, url: string) => void
): Promise<ArchivedUrl[]> {
  const results: ArchivedUrl[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    // Call progress callback if provided
    if (onProgress) {
      onProgress(i + 1, urls.length, url);
    }

    // Archive the URL
    const result = await archiveUrl(url);
    results.push(result);

    // Add a small delay between requests to be nice to archive.org
    // (avoid rate limiting)
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  return results;
}

/**
 * Check if a URL has already been archived
 *
 * @param url - URL to check
 * @returns Most recent archive URL if exists, null otherwise
 */
export async function getExistingArchive(url: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
      { timeout: 10000 }
    );

    if (
      response.data?.archived_snapshots?.closest?.available &&
      response.data.archived_snapshots.closest.url
    ) {
      return response.data.archived_snapshots.closest.url;
    }

    return null;
  } catch (error) {
    console.error(`Error checking existing archive for ${url}:`, error);
    return null;
  }
}

/**
 * Archive URL with fallback to existing archive
 *
 * First checks if URL is already archived, if so returns that.
 * Otherwise archives it fresh.
 */
export async function archiveUrlSmart(url: string): Promise<ArchivedUrl> {
  // First check if already archived
  const existingArchive = await getExistingArchive(url);

  if (existingArchive) {
    return {
      originalUrl: url,
      archiveUrl: existingArchive,
      archivedAt: new Date(),
      success: true,
    };
  }

  // If not archived yet, archive it now
  return await archiveUrl(url);
}

/**
 * Get statistics about archived URLs
 */
export function getArchiveStatistics(results: ArchivedUrl[]): {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
} {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    total: results.length,
    successful,
    failed,
    successRate: results.length > 0 ? (successful / results.length) * 100 : 0,
  };
}
