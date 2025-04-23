/**
 * Chat service for handling communication with the backend
 */

/**
 * Simple interface for chat communication
 */
class ChatService {
  private apiUrl = '/api/chat';

  /**
   * Sends a message to the backend and receives a response
   * @param message The user message to send
   * @returns A promise that resolves to the assistant's response
   */
  async sendMessage(message: string): Promise<string> {
    try {
      // In a real implementation, this would make an API call
      // For now, we'll simulate a delay and return a mock response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This is a placeholder for the actual API call
      // const response = await fetch(this.apiUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ message }),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`API error: ${response.status}`);
      // }
      
      // const data = await response.json();
      // return data.response;
      
      // Mock response for development
      return `This is a mock response to: "${message}". In production, this would come from the API.`;
    } catch (error) {
      console.error('Error in chat service:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const chatService = new ChatService();
