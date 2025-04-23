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
   * @param model The selected model to use
   * @returns A promise that resolves to the assistant's response
   */
  async sendMessage(message: string, model: string = 'gemini'): Promise<string> {
    try {
      // In a real implementation, this would make an API call
      // For now, we'll simulate a delay and return a mock response
      const delay = Math.floor(Math.random() * 1000) + 500; // Random delay between 500-1500ms
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // This is a placeholder for the actual API call
      // const response = await fetch(this.apiUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ message, model }),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`API error: ${response.status}`);
      // }
      
      // const data = await response.json();
      // return data.response;
      
      // Mock responses based on model selected
      const modelResponses: Record<string, string> = {
        'gemini': `[Gemini] This is a mock response to: "${message}". In production, this would come from the Gemini API.`,
        'gpt4': `[GPT-4] This is a mock response to: "${message}". In production, this would come from the OpenAI API.`,
        'claude': `[Claude] This is a mock response to: "${message}". In production, this would come from the Anthropic API.`
      };
      
      return modelResponses[model] || modelResponses['gemini'];
    } catch (error) {
      console.error('Error in chat service:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const chatService = new ChatService();
