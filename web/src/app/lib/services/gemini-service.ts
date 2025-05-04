"use client";

/**
 * Gemini service for handling communication with Google's Gemini API
 */

interface GeminiRequestBody {
  contents: {
    parts: {
      text: string;
    }[];
    role: string;
  }[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
      role: string;
    };
    finishReason: string;
    index: number;
  }[];
}

export class GeminiService {
  private apiUrl: string;
  private apiKey: string;
  private previousMessages: { role: string; content: string }[] = [];
  private repositoryContext: string | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Using Gemini 1.5 Flash model, which uses less credits and is more cost-effective
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  }

  /**
   * Format repository context for the prompt
   */
  private formatRepoContext(repoName: string, repoUrl: string, readmeContent?: string): string {
    let context = `You are assisting with a code repository: ${repoName} (${repoUrl}).\n\n`;
    
    if (readmeContent) {
      // Limit README content to avoid token limits
      const truncatedReadme = readmeContent.length > 10000 
        ? readmeContent.substring(0, 10000) + "... [README truncated due to length]"
        : readmeContent;
      
      context += `Repository README content:\n\`\`\`markdown\n${truncatedReadme}\n\`\`\`\n\n`;
    }
    
    context += "Please provide helpful and detailed answers based on this repository context. When referring to code from the repository, use proper formatting with code blocks.";
    
    // Store the repository context for reuse
    this.repositoryContext = context;
    
    return context;
  }

  /**
   * Prepare system message with repository context
   */
  private prepareSystemMessage(repoContext?: string | null): {
    parts: { text: string }[];
    role: string;
  } {
    let systemMessage = "You are a helpful coding assistant. ";
    
    if (repoContext) {
      systemMessage += repoContext;
    } else if (this.repositoryContext) {
      // Reuse stored repository context if available
      systemMessage += this.repositoryContext;
    } else {
      systemMessage += "You help users with programming questions and provide code examples when appropriate.";
    }
    
    // Add instructions for code formatting
    systemMessage += " When sharing code, use markdown format with language-specific syntax highlighting.";
    
    return {
      parts: [{ text: systemMessage }],
      role: "model"
    };
  }

  /**
   * Adds the current conversation to the message for context
   */
  private addConversationContext(messageContent: string): string {
    if (this.previousMessages.length === 0) {
      return messageContent;
    }
    
    // Include up to 5 previous message pairs for context
    const maxContextPairs = 5;
    const contextMessages = this.previousMessages.slice(-maxContextPairs * 2);
    
    let context = "Previous conversation:\n";
    
    contextMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      context += `${role}: ${msg.content}\n\n`;
    });
    
    context += "Current question:\n" + messageContent;
    
    return context;
  }

  /**
   * Sends a message to Gemini API and receives a response
   */
  async sendMessage(
    message: string, 
    repoName?: string, 
    repoUrl?: string, 
    readmeContent?: string
  ): Promise<string> {
    try {
      console.warn('Sending message to Gemini API:', {
        messageLength: message.length,
        hasRepoContext: Boolean(repoName && repoUrl),
        readmeContentLength: readmeContent?.length || 0
      });

      // Add repository context if available
      let repoContext = this.repositoryContext;
      if (repoName && repoUrl) {
        // Generate new repository context if repository parameters are provided
        repoContext = this.formatRepoContext(repoName, repoUrl, readmeContent);
      }
      
      // Add conversation context to the message
      const messageWithContext = this.addConversationContext(message);
        
      // Prepare request body with system message and user query
      const requestBody: GeminiRequestBody = {
        contents: [
          this.prepareSystemMessage(repoContext),
          {
            parts: [{ text: messageWithContext }],
            role: "user"
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096, // Increased token limit
          topP: 0.95,
          topK: 40
        }
      };

      console.warn('Calling Gemini API with repository context...');
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMsg = `Gemini API error: ${response.status}`;
        try {
          const errData = await response.json();
          console.error('Gemini API error details:', errData);
          if (errData && errData.error && errData.error.message) {
            errorMsg = `Gemini API error: ${errData.error.message}`;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json() as GeminiResponse;
      console.warn('Received response from Gemini API');
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response generated by Gemini API.');
      }
      
      const generatedText = data.candidates[0].content.parts
        .map(part => part.text)
        .join('');
      
      // Store messages for conversation context
      this.previousMessages.push({ role: 'user', content: message });
      this.previousMessages.push({ role: 'assistant', content: generatedText });
      
      // Limit conversation history to last 10 messages (5 exchanges)
      if (this.previousMessages.length > 10) {
        this.previousMessages = this.previousMessages.slice(-10);
      }
        
      return generatedText;
    } catch (error: unknown) {
      console.error('Error in Gemini service:', error);
      
      if (error instanceof Error) {
        throw new Error(
          error.message || 'Sorry, something went wrong while communicating with the Gemini API.'
        );
      }
      
      throw new Error('Sorry, something went wrong while communicating with the Gemini API.');
    }
  }
  
  /**
   * Clears the conversation history and repository context
   */
  clearConversation(): void {
    this.previousMessages = [];
    this.repositoryContext = null;
  }
  
  /**
   * Updates the repository context without sending a message
   * Useful when switching repositories
   */
  updateRepositoryContext(repoName: string, repoUrl: string, readmeContent?: string): void {
    this.formatRepoContext(repoName, repoUrl, readmeContent);
    console.warn('Repository context updated for:', repoName);
  }
}
