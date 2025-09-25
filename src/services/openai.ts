import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SuiContext {
  walletAddress?: string;
  balance?: string;
  tokens?: any[];
  recentTransactions?: any[];
}

class OpenAIService {
  private client: OpenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.loadApiKey();
  }

  private loadApiKey() {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      this.setApiKey(savedKey);
    }
  }

  public setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  public hasApiKey(): boolean {
    return !!this.apiKey;
  }

  public clearApiKey() {
    this.apiKey = null;
    this.client = null;
    localStorage.removeItem('openai_api_key');
  }

  private createSystemPrompt(suiContext: SuiContext): string {
    return `You are a helpful AI assistant specialized in Sui blockchain operations. You can help users with:

1. Wallet Management:
   - Check balance and token holdings
   - View wallet address
   - Explain transaction history

2. Sui Blockchain Operations:
   - Send SUI tokens to other addresses
   - Interact with smart contracts
   - Explain blockchain concepts
   - Help with DeFi operations

3. Natural Language Processing:
   - Understand user intents for blockchain operations
   - Provide clear explanations of complex operations
   - Guide users through transactions step by step

Current Wallet Context:
${suiContext.walletAddress ? `- Wallet Address: ${suiContext.walletAddress}` : '- No wallet connected'}
${suiContext.balance ? `- SUI Balance: ${suiContext.balance} SUI` : '- Balance: Unknown'}
${suiContext.tokens ? `- Total Tokens: ${suiContext.tokens.length} different tokens` : '- Tokens: Unknown'}

Important Guidelines:
- Always prioritize security and ask for confirmation before suggesting transactions
- Explain gas fees and transaction costs
- Provide clear, step-by-step instructions
- If you're unsure about something, ask for clarification
- Never store or ask for private keys or seed phrases
- Always verify addresses before suggesting transactions

Respond in a helpful, friendly, and professional manner. Focus on being educational while maintaining security best practices.`;
  }

  public async sendMessage(
    message: string,
    conversationHistory: ChatMessage[],
    suiContext: SuiContext,
    model: string = 'gpt-3.5-turbo'
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured. Please set your API key in the settings.');
    }

    try {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: this.createSystemPrompt(suiContext)
      };

      const messages: ChatMessage[] = [
        systemMessage,
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      const completion = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return response;
    } catch (error: any) {
      console.error('OpenAI API error:', error);

      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 403) {
        throw new Error('API access forbidden. Please check your API key permissions.');
      } else {
        throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
      }
    }
  }

  public async streamMessage(
    message: string,
    conversationHistory: ChatMessage[],
    suiContext: SuiContext,
    model: string = 'gpt-3.5-turbo',
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured. Please set your API key in the settings.');
    }

    try {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: this.createSystemPrompt(suiContext)
      };

      const messages: ChatMessage[] = [
        systemMessage,
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      const stream = await this.client.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }
    } catch (error: any) {
      console.error('OpenAI streaming error:', error);
      throw new Error(`OpenAI streaming error: ${error.message || 'Unknown error'}`);
    }
  }

  public validateModel(model: string): boolean {
    const supportedModels = [
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4',
      'gpt-4-turbo-preview',
      'gpt-4-vision-preview'
    ];
    return supportedModels.includes(model);
  }
}

export const openAIService = new OpenAIService();
