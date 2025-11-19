/**
 * Wrapper de télémétrie pour Vercel AI SDK + Langfuse
 * 
 * Documentation:
 * - Vercel AI SDK: https://sdk.vercel.ai/docs/ai-sdk-core/telemetry
 * - Langfuse: https://langfuse.com/docs/integrations/vercel-ai-sdk
 */

interface TelemetryOptions {
  name?: string;
  metadata?: Record<string, unknown>;
  functionId?: string;
}

/**
 * Retourne la configuration de télémétrie pour Vercel AI SDK
 * Langfuse capture automatiquement les spans via LangfuseSpanProcessor dans instrumentation.ts
 * 
 * @example
 * ```ts
 * const result = await streamText({
 *   model: openai("gpt-4"),
 *   messages,
 *   experimental_telemetry: getVercelTelemetry({
 *     functionId: "chat-stream",
 *     metadata: { userId: "123" }
 *   })
 * });
 * ```
 */
export function getVercelTelemetry(options?: TelemetryOptions) {
  console.log("[Telemetry] Configuration Langfuse:", {
    functionId: options?.functionId || options?.name,
    hasMetadata: !!options?.metadata,
  });

  return {
    isEnabled: true,
    functionId: options?.functionId || options?.name,
    metadata: {
      ...options?.metadata,
      project: "tsp-ai",
      environment: process.env.NODE_ENV || "development",
    },
  };
}

/**
 * @deprecated Plus nécessaire avec Langfuse
 */
export function trackAIOperation(options: TelemetryOptions): {
  end: () => Promise<void>;
  addTags: (tags: string[]) => void;
} {
  console.warn(
    "[Telemetry] trackAIOperation est déprécié. Utilisez getVercelTelemetry() avec experimental_telemetry à la place."
  );

  return {
    end: async () => {},
    addTags: () => {},
  };
}

/**
 * Helper pour logger les événements AI
 * Utilisé pour debug uniquement
 */
export function logAIEvent(
  name: string,
  data?: {
    input?: unknown;
    output?: unknown;
    metadata?: Record<string, unknown>;
  }
): void {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.LANGFUSE_DEBUG === "true"
  ) {
    console.log(
      `[AI Event] ${name}`,
      data
        ? {
            input: data.input,
            output: data.output,
            ...data.metadata,
          }
        : undefined
    );
  }
}

/**
 * Flush des spans Langfuse (géré automatiquement via after() dans les routes API)
 */
export async function flushTelemetry(): Promise<void> {
  // No-op : Langfuse gère automatiquement le flush via langfuseSpanProcessor
  if (process.env.LANGFUSE_DEBUG === "true") {
    console.log("[Telemetry] Flush géré automatiquement par Langfuse");
  }
}


