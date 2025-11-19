/**
 * Generate Chat Response
 * 
 * This module provides a function to generate chat responses
 * using the same logic as the /api/chat route, but without HTTP.
 */

import { streamText, convertToModelMessages } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { systemPrompt } from '@/lib/ai/prompts';
import { retrieveKnowledge } from '@/lib/ai/tools/retrieve-knowledge';
import type { ChatModel } from '@/lib/ai/models';
import type { ChatMessage } from '@/lib/types';

export interface GenerateChatResponseOptions {
  message: string;
  chatModel?: ChatModel['id'];
  conversationHistory?: ChatMessage[];
}

/**
 * Generate a chat response using the same logic as the API route
 * This bypasses HTTP and calls the AI directly
 */
export async function generateChatResponse(
  options: GenerateChatResponseOptions
): Promise<string> {
  const {
    message,
    chatModel = 'chat-model', // Default model
    conversationHistory = [],
  } = options;

  // Build the message in the same format as the API
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    parts: [
      {
        type: 'text',
        text: message,
      },
    ],
  };

  const allMessages = [...conversationHistory, userMessage];

  try {
    // Call streamText with the same configuration as the API route
    const result = await streamText({
      model: myProvider.languageModel(chatModel),
      system: systemPrompt({
        selectedChatModel: chatModel,
        requestHints: {
          latitude: undefined,
          longitude: undefined,
          city: undefined,
          country: undefined,
        },
      }),
      messages: convertToModelMessages(allMessages),
      experimental_activeTools: ['retrieveKnowledge'],
      tools: {
        retrieveKnowledge,
      },
      temperature: 0.1, // Low temperature for consistent answers
    });

    // Collect the full response from the stream
    let fullResponse = '';
    for await (const chunk of result.textStream) {
      fullResponse += chunk;
    }

    return fullResponse.trim();
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
}
