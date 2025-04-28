import Dexie from 'dexie';
import { GitHubRepo } from '../github/types';

// Define Swift database
class SwiftDatabase extends Dexie {
  repositories: Dexie.Table<GitHubRepo, string>;
  
  constructor() {
    // Database name
    super('SwiftDB');
    
    // Define schema for repositories
    this.version(1).stores({
      repositories: 'id, name, fullName, localId, localPath'
    });
    
    // Define typed tables
    this.repositories = this.table('repositories');
  }
}

// Create and export the database instance
const db = new SwiftDatabase();

class RepositoryStore {
  private SWIFT_REPOS_STORAGE_KEY = 'swift_github_repositories';
  
  /**
   * Load repositories from localStorage (legacy support)
   */
  loadLegacyRepositories(): GitHubRepo[] {
    if (typeof window === 'undefined') {
      return [];
    }
    
    const storedRepos = localStorage.getItem(this.SWIFT_REPOS_STORAGE_KEY);
    return storedRepos ? JSON.parse(storedRepos) : [];
  }
  
  /**
   * Migrate repositories from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(): Promise<void> {
    const legacyRepos = this.loadLegacyRepositories();
    
    if (legacyRepos.length > 0) {
      try {
        // Add all repositories from localStorage to IndexedDB
        await db.repositories.bulkPut(legacyRepos);
        
        // Clear localStorage after successful migration
        localStorage.removeItem(this.SWIFT_REPOS_STORAGE_KEY);
        
        console.log('Successfully migrated repositories from localStorage to IndexedDB');
      } catch (error) {
        console.error('Error migrating repositories from localStorage:', error);
      }
    }
  }
  
  /**
   * Get all repositories
   */
  async getRepositories(): Promise<GitHubRepo[]> {
    try {
      // First attempt to migrate any legacy data
      await this.migrateFromLocalStorage();
      
      // Get all repositories from the database
      return await db.repositories.toArray();
    } catch (error) {
      console.error('Error getting repositories from database:', error);
      // Fallback to legacy storage if database access fails
      return this.loadLegacyRepositories();
    }
  }
  
  /**
   * Save a repository to the database
   * @param repo Repository to save
   */
  async saveRepository(repo: GitHubRepo): Promise<void> {
    try {
      await db.repositories.put(repo);
    } catch (error) {
      console.error('Error saving repository to database:', error);
      
      // Fallback to localStorage if database save fails
      const currentRepos = this.loadLegacyRepositories();
      const updatedRepos = [...currentRepos.filter(r => r.id !== repo.id), repo];
      localStorage.setItem(this.SWIFT_REPOS_STORAGE_KEY, JSON.stringify(updatedRepos));
    }
  }
  
  /**
   * Remove a repository from the database
   * @param repoId Repository ID to remove
   */
  async removeRepository(repoId: string): Promise<boolean> {
    try {
      await db.repositories.delete(repoId);
      return true;
    } catch (error) {
      console.error('Error removing repository from database:', error);
      
      // Fallback to localStorage if database delete fails
      const currentRepos = this.loadLegacyRepositories();
      const updatedRepos = currentRepos.filter(repo => repo.id !== repoId);
      
      if (updatedRepos.length === currentRepos.length) {
        return false;
      }
      
      localStorage.setItem(this.SWIFT_REPOS_STORAGE_KEY, JSON.stringify(updatedRepos));
      return true;
    }
  }
  
  /**
   * Get a repository by ID
   * @param repoId Repository ID
   */
  async getRepository(repoId: string): Promise<GitHubRepo | undefined> {
    try {
      return await db.repositories.get(repoId);
    } catch (error) {
      console.error('Error getting repository from database:', error);
      
      // Fallback to localStorage if database access fails
      const repositories = this.loadLegacyRepositories();
      return repositories.find(r => r.id === repoId);
    }
  }
  
  /**
   * Update repository local path
   * @param repoId Repository ID
   * @param localPath Local path where the repository is stored
   */
  async updateRepositoryLocalPath(repoId: string, localPath: string): Promise<boolean> {
    try {
      const repo = await this.getRepository(repoId);
      
      if (!repo) {
        return false;
      }
      
      repo.localPath = localPath;
      await this.saveRepository(repo);
      return true;
    } catch (error) {
      console.error('Error updating repository local path:', error);
      return false;
    }
  }
}

// Export a singleton instance
const repositoryStore = new RepositoryStore();
export default repositoryStore;
