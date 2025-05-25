import fs from 'fs';
import path from 'path';

export interface CollectedTree {
  url: string;
  title: string;
  timestamp: string;
  tree?: any; // Legacy format
  nodes?: any[]; // New format with all nodes
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
    console.warn('No collected trees found. Run the agent with --fixtures flag to generate them.');
    return [];
  }
}

/**
 * Get a random tree from collected fixtures
 */
export function getRandomTree(): any[] | null {
  const trees = loadCollectedTrees();
  if (trees.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * trees.length);
  const collected = trees[randomIndex];
  return collected.nodes || (collected.tree ? [collected.tree] : null);
}

/**
 * Get the most recent tree from collected fixtures
 */
export function getLatestTree(): any[] | null {
  const trees = loadCollectedTrees();
  if (trees.length === 0) return null;
  
  // Sort by timestamp descending
  trees.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latest = trees[0];
  return latest.nodes || (latest.tree ? [latest.tree] : null);
}

/**
 * Get all collected trees
 */
export function getAllTrees(): any[][] {
  const trees = loadCollectedTrees();
  return trees.map(t => t.nodes || (t.tree ? [t.tree] : []));
}