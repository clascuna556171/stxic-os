import { getSessionUserId } from "@/lib/auth/session";
import { streamChat } from "@/lib/ai/router";
import type { AiProvider, ChatMessage } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROVIDERS: AiProvider[] = ["auto", "ollama", "groq"];

/** AI chat — streams tokens over SSE via the Ollama/Groq router. */
export async function POST(request: Request) {
  const uid = await getSessionUserId();
  if (!uid) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages, provider } = (body ?? {}) as {
    messages?: unknown;
    provider?: unknown;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages array required", { status: 400 });
  }

  const sanitized: ChatMessage[] = messages.map((m) => {
    const msg = m as { role?: string; content?: unknown };
    return {
      role: msg.role === "system" || msg.role === "assistant" ? msg.role : "user",
      content: typeof msg.content === "string" ? msg.content : "",
    };
  });

  const resolvedProvider: AiProvider =
    typeof provider === "string" && PROVIDERS.includes(provider as AiProvider)
      ? (provider as AiProvider)
      : "auto";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of streamChat(sanitized, { provider: resolvedProvider })) {
          send(event);
        }
      } catch (error) {
        send({ type: "error", error: (error as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
