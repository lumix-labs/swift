// Repository service to manage repository connections
export const repoService = {
  // Connect to a repository
  async connectRepository(repoUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      // This would be replaced with an actual API call in production
      console.warn(`Connecting to repository: ${repoUrl}`);
      
      // Simulate a network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store the connected repository in localStorage
      const connectedRepos = JSON.parse(localStorage.getItem('connectedRepos') || '[]');
      
      // Check if repository is already connected
      if (connectedRepos.includes(repoUrl)) {
        return { success: true, message: 'Repository already connected' };
      }
      
      // Add the new repository
      connectedRepos.push(repoUrl);
      localStorage.setItem('connectedRepos', JSON.stringify(connectedRepos));
      
      return { success: true, message: 'Repository connected successfully' };
    } catch (error) {
      console.error('Error connecting to repository:', error);
      return { success: false, message: 'Failed to connect to repository' };
    }
  },
  
  // Get all connected repositories
  getConnectedRepositories(): string[] {
    try {
      return JSON.parse(localStorage.getItem('connectedRepos') || '[]');
    } catch (error) {
      console.error('Error getting connected repositories:', error);
      return [];
    }
  },
  
  // Disconnect a repository
  disconnectRepository(repoUrl: string): boolean {
    try {
      const connectedRepos = JSON.parse(localStorage.getItem('connectedRepos') || '[]');
      const filteredRepos = connectedRepos.filter((repo: string) => repo !== repoUrl);
      localStorage.setItem('connectedRepos', JSON.stringify(filteredRepos));
      return true;
    } catch (error) {
      console.error('Error disconnecting repository:', error);
      return false;
    }
  }
};
