import { ChatXAI } from "@langchain/xai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { solveTSP } from "@/lib/ai/tools/solve-tsp";
import type { ChatModel } from "@/lib/ai/models";

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

    const requestHints: RequestHints = {
      latitude: undefined,
      longitude: undefined,
      city: undefined,
      country: undefined,
    };

    const model = new ChatXAI({
      model: "grok-4-fast-reasoning",
      temperature: 0,
      apiKey: process.env.XAI_API_KEY,
    }).bindTools([solveTSP]);

    const messages = [
      new SystemMessage(systemPrompt({ selectedChatModel: chatModel, requestHints })),
      new HumanMessage(message),
    ];

    const result = await model.invoke(messages);

    // Return as JSON
    return Response.json({
      success: true,
      answer: result.content,
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
