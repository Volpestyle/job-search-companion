import fs from 'fs';
import path from 'path';

export interface CollectedTree {
  url: string;
  title: string;
  timestamp: string;
  nodes: any[]; // Raw accessibility nodes from Chrome
  nodeCount: number;
}

/**
 * Load collected accessibility trees from fixture file
 */
export function loadCollectedTrees(): CollectedTree[] {
  const fixtureFile = path.join(__dirname, 'collected-accessibility-trees.json');

  try {
    const data = fs.readFileSync(fixtureFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('No collected trees found. Run tests with RECORD_TREES=1 to generate them.');
    return [];
  }
}

/**
 * Get trees for a specific URL
 */
export function getTreesForUrl(url: string): CollectedTree[] {
  const trees = loadCollectedTrees();
  return trees.filter((tree) => tree.url === url);
}

/**
 * Get the most recent tree for a URL
 */
export function getLatestTreeForUrl(url: string): CollectedTree | null {
  const trees = getTreesForUrl(url);
  if (trees.length === 0) return null;

  // Sort by timestamp descending
  trees.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return trees[0];
}

/**
 * Save new collected trees (append to existing)
 */
export function saveCollectedTrees(newTrees: CollectedTree[]): void {
  const fixtureFile = path.join(__dirname, 'collected-accessibility-trees.json');

  // Load existing trees
  let existingTrees: CollectedTree[] = [];
  try {
    const data = fs.readFileSync(fixtureFile, 'utf-8');
    existingTrees = JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, that's OK
  }

  // Append new trees
  const allTrees = [...existingTrees, ...newTrees];

  // Save back
  fs.writeFileSync(fixtureFile, JSON.stringify(allTrees, null, 2), 'utf-8');
  console.log(`Saved ${newTrees.length} new accessibility trees to fixtures`);
}

/**
 * Get summary of collected trees
 */
export function getTreesSummary(): { url: string; count: number; latest: string }[] {
  const trees = loadCollectedTrees();
  const summary = new Map<string, { count: number; latest: Date }>();

  for (const tree of trees) {
    const existing = summary.get(tree.url);
    const timestamp = new Date(tree.timestamp);

    if (!existing || timestamp > existing.latest) {
      summary.set(tree.url, {
        count: (existing?.count || 0) + 1,
        latest: timestamp,
      });
    }
  }

  return Array.from(summary.entries()).map(([url, data]) => ({
    url,
    count: data.count,
    latest: data.latest.toISOString(),
  }));
}
