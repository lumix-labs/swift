/**
 * Chat service for handling communication with the backend
 */

/**
 * Simple interface for chat communication
 */
class ChatService {
      private apiUrl: string;

      constructor() {
            // Use environment variable if available, otherwise fallback
            this.apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || '/api/chat';
      }

      /**
       * Sends a message to the backend and receives a response
       * @param message The user message to send
       * @param model The selected model to use
       * @returns A promise that resolves to the assistant's response
       */
      async sendMessage(message: string, model: string = 'gemini'): Promise<string> {
            try {
                  const response = await fetch(this.apiUrl, {
                        method: 'POST',
                        headers: {
                              'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ message, model }),
                  });

                  if (!response.ok) {
                        // Try to parse error message from response
                        let errorMsg = `API error: ${response.status}`;
                        try {
                              const errData = await response.json();
                              if (errData && errData.error) errorMsg = errData.error;
                        } catch {}
                        throw new Error(errorMsg);
                  }

                  const data = await response.json();
                  if (!data || typeof data.response !== 'string') {
                        throw new Error('Malformed response from chat API.');
                  }
                  return data.response;
            } catch (error: unknown) {
                  if (process.env.NODE_ENV !== 'production') {
                        console.error('Error in chat service:', error);
                  }
                  // Provide user-friendly error
                  if (error instanceof Error) {
                        throw new Error(
                              error.message || 'Sorry, something went wrong while communicating with the chat API.'
                        );
                  }
                  throw new Error('Sorry, something went wrong while communicating with the chat API.');
            }
      }
}

// Export a singleton instance
export const chatService = new ChatService();
