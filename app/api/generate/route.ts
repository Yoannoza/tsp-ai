import {
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { myProvider } from "@/lib/ai/providers";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { retrieveKnowledge } from "@/lib/ai/tools/retrieve-knowledge";
import type { ChatModel } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/types";

/**
 * POST /api/generate
 * 
 * Endpoint for batch answer generation without authentication.
 * Used by evaluation scripts to generate answers with the same
 * configuration as the main chat route.
 * 
 * ⚠️ WARNING: This endpoint has NO authentication.
 * Should only be used in development or with proper rate limiting.
 */

interface GenerateRequestBody {
  message: string;
  chatModel?: ChatModel['id'];
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as GenerateRequestBody;
    const { message, chatModel = 'chat-model' } = body;

    if (!message || typeof message !== 'string') {
      return Response.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Build the user message in the same format as the chat API
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

    const requestHints: RequestHints = {
      latitude: undefined,
      longitude: undefined,
      city: undefined,
      country: undefined,
    };

    // Use streamText with the EXACT same configuration as /api/chat
    const result = await streamText({
      model: myProvider.languageModel(chatModel),
      system: systemPrompt({ selectedChatModel: chatModel, requestHints }),
      messages: convertToModelMessages([userMessage]),
      stopWhen: stepCountIs(500), // Same as chat route
      experimental_activeTools: ["retrieveKnowledge"], // Same as chat route
      experimental_transform: smoothStream({ chunking: "word" }), // Same as chat route
      tools: {
        retrieveKnowledge, // ✅ RAG enabled like in production
      },
    });

    // Collect the full response from the stream
    let fullResponse = '';
    for await (const chunk of result.textStream) {
      fullResponse += chunk;
    }

    // Return as JSON
    return Response.json({
      success: true,
      answer: fullResponse.trim(),
      model: chatModel,
    });

  } catch (error) {
    console.error('Error in /api/generate:', error);
    
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
