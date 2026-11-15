import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import type { z } from "zod";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id.server.ts";

export async function generateStructured<T>(request: Request, config: {
  apiKey: string; schema: z.ZodType<T>; messages: ModelMessage[]; instructions: string;
}) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: config.apiKey,
    headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: config.instructions,
    messages: config.messages,
    output: Output.object({ schema: config.schema }),
    abortSignal: request.signal,
    maxRetries: 0,
    providerOptions: { openai: {
      forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false,
      include: ["reasoning.encrypted_content"],
    } },
  });
  try {
    return await result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) throw new Error("تعذر تنسيق النتيجة؛ راجع المدخلات وحاول مرة أخرى");
    throw error;
  }
}
