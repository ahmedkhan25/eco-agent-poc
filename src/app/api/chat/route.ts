import { streamText, convertToModelMessages } from "ai";
import { healthcareTools } from "@/lib/tools";
import { BiomedUIMessage } from "@/lib/types";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { createOllama, ollama } from "ollama-ai-provider-v2";
import { checkAnonymousRateLimit, incrementRateLimit } from "@/lib/rate-limit";
import { createClient } from '@supabase/supabase-js';
import { checkUserRateLimit } from '@/lib/rate-limit';
import { validateAccess } from '@/lib/polar-access-validation';
import { getPolarTrackedModel } from '@/lib/polar-llm-strategy';
import * as db from '@/lib/db';
import { isDevelopmentMode } from '@/lib/local-db/local-auth';
import { saveChatMessages } from '@/lib/db';

// 13mins max streaming (vercel limit)
export const maxDuration = 800;

/**
 * Rough token estimation (1 token ≈ 4 characters for English text)
 * This is a conservative estimate to prevent overflow
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens in a message including all parts (text, tool calls, tool results)
 */
function estimateMessageTokens(message: BiomedUIMessage): number {
  let tokens = 0;
  
  // Add role overhead (small cost)
  tokens += 4;
  
  // BiomedUIMessage only has 'parts', not 'content'
  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      try {
        if (typeof part === 'string') {
          tokens += estimateTokens(part);
        } else if (part && typeof part === 'object') {
          // Safely check part type
          const partType = (part as any).type;
          const partText = (part as any).text;
          
          if (partType === 'text' && partText) {
            tokens += estimateTokens(partText);
          } else {
            // For all other part types (tool-call, tool-result, step-start, etc.)
            // Use JSON stringification for accurate size estimation
            const partJson = JSON.stringify(part);
            tokens += estimateTokens(partJson);
          }
        }
      } catch (e) {
        // Fallback: estimate entire part as JSON
        try {
          tokens += estimateTokens(JSON.stringify(part));
        } catch {
          tokens += 100; // Minimal fallback estimate
        }
      }
    }
  }
  
  // If we still have minimal tokens, use entire message as fallback
  if (tokens <= 10) {
    try {
      tokens = estimateTokens(JSON.stringify(message));
    } catch {
      tokens = 100; // Absolute fallback
    }
  }
  
  return tokens;
}

/**
 * Trim messages to prevent context window overflow using token-aware strategy
 * Keeps as many recent messages as possible within the token budget
 * 
 * @param messages - All messages in the conversation
 * @param maxTokens - Maximum tokens to keep (default: 8000 tokens, ~32KB text)
 * @returns Trimmed messages that fit within token budget
 */
function trimMessages(messages: BiomedUIMessage[], maxTokens: number = 8000): BiomedUIMessage[] {
  if (messages.length === 0) {
    return messages;
  }

  // Estimate tokens for all messages
  const messageTokens = messages.map((msg, idx) => {
    const tokens = estimateMessageTokens(msg);
    console.log(`[Chat API] Message ${idx + 1}/${messages.length} (${msg.role}): ~${tokens} tokens`);
    return {
      message: msg,
      tokens
    };
  });

  // Work backwards from most recent messages
  const trimmedMessages: BiomedUIMessage[] = [];
  let currentTokens = 0;

  for (let i = messageTokens.length - 1; i >= 0; i--) {
    const { message, tokens } = messageTokens[i];
    
    // If adding this message would exceed budget, stop
    if (currentTokens + tokens > maxTokens) {
      console.log(`[Chat API] Stopping at message ${i + 1}/${messages.length} (would add ${tokens} tokens, exceeding ${maxTokens} token budget)`);
      break;
    }
    
    trimmedMessages.unshift(message); // Add to front (we're going backwards)
    currentTokens += tokens;
  }

  // Always keep at least the last USER message (not assistant with huge tool results)
  if (trimmedMessages.length === 0 && messages.length > 0) {
    // Find the last user message (not assistant)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        console.log(`[Chat API] Emergency fallback: keeping only last user message (all others too large)`);
        trimmedMessages.push(messages[i]);
        const userTokens = estimateMessageTokens(messages[i]);
        currentTokens = userTokens;
        break;
      }
    }
    
    // Absolute fallback: just keep last message
    if (trimmedMessages.length === 0) {
      console.log(`[Chat API] Warning: Last message alone exceeds token budget, keeping it anyway`);
      trimmedMessages.push(messages[messages.length - 1]);
      currentTokens = estimateMessageTokens(messages[messages.length - 1]);
    }
  }

  if (trimmedMessages.length < messages.length) {
    console.log(`[Chat API] Trimmed messages: ${messages.length} → ${trimmedMessages.length} (estimated ${currentTokens} tokens)`);
  }

  return trimmedMessages;
}


/**
 * Strip OpenAI response IDs and other API-specific metadata from message parts.
 * This prevents "Duplicate item found" errors when reloading messages from the database.
 */
function stripResponseMetadata(parts: any[]): any[] {
  if (!Array.isArray(parts)) return parts;
  
  return parts.map((part: any) => {
    if (!part || typeof part !== 'object') return part;
    
    // Deep clean: remove all fields that might contain response IDs
    const cleaned = JSON.parse(JSON.stringify(part, (key, value) => {
      // Skip any fields that look like they contain response IDs
      if (key === 'response' || 
          key === 'responseId' || 
          key === 'rs_id' ||
          key === 'response_id' ||
          key === 'requestId' ||
          key === 'request_id' ||
          (typeof value === 'string' && value.startsWith('rs_'))) {
        return undefined; // Don't include this field
      }
      return value;
    }));
    
    return cleaned;
  });
}

/**
 * Count tool calls in a conversation
 */
function countToolCalls(messages: BiomedUIMessage[]): number {
  let count = 0;
  for (const msg of messages) {
    if (Array.isArray(msg.parts)) {
      for (const part of msg.parts) {
        if (part && typeof part === 'object' && typeof part.type === 'string' && part.type.startsWith('tool-')) {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Summarize older messages to prevent context overflow.
 * Triggers when conversation has 5+ tool calls.
 * Keeps last 3 messages intact and compresses older ones.
 * 
 * @param messages - All messages in the conversation
 * @returns Messages with older ones summarized
 */
async function summarizeOlderMessages(messages: BiomedUIMessage[]): Promise<BiomedUIMessage[]> {
  const toolCallCount = countToolCalls(messages);
  
  // Only trigger summarization when we have 5+ tool calls
  if (toolCallCount < 5 || messages.length <= 3) {
    return messages;
  }
  
  console.log(`[Chat API] Summarization triggered: ${toolCallCount} tool calls, ${messages.length} messages`);
  
  // Keep the last 3 messages intact
  const recentMessages = messages.slice(-3);
  const olderMessages = messages.slice(0, -3);
  
  // If no older messages to summarize, return as-is
  if (olderMessages.length === 0) {
    return messages;
  }
  
  // Extract key information from older messages for summary
  const summaryParts: string[] = [];
  
  for (const msg of olderMessages) {
    if (!Array.isArray(msg.parts)) continue;
    
    for (const part of msg.parts) {
      if (!part || typeof part !== 'object') continue;
      
      // Cast to any for dynamic property access on tool call parts
      const p = part as any;
      
      if (p.type === 'text' && p.text) {
        // Truncate long text parts
        const text = p.text.length > 500 ? p.text.substring(0, 500) + '...' : p.text;
        summaryParts.push(`[${msg.role}]: ${text}`);
      } else if (typeof p.type === 'string' && p.type.startsWith('tool-')) {
        const toolName = p.type.replace('tool-', '');
        
        // Extract key info from tool results
        if (p.type === 'tool-olympiaRAGSearch') {
          try {
            const result = typeof p.result === 'string' ? JSON.parse(p.result) : p.result;
            if (result?.context_id) {
              summaryParts.push(`[RAG Search: ${result.query || 'unknown'} → context_id: ${result.context_id}]`);
            }
          } catch {
            summaryParts.push(`[RAG Search completed]`);
          }
        } else if (p.type === 'tool-createChart') {
          const title = p.toolCall?.args?.title || p.args?.title || 'chart';
          summaryParts.push(`[Created chart: ${title}]`);
        } else if (p.type === 'tool-createCSV') {
          const title = p.toolCall?.args?.title || p.args?.title || 'csv';
          summaryParts.push(`[Created CSV: ${title}]`);
        } else if (p.type === 'tool-generateImage') {
          summaryParts.push(`[Generated image]`);
        } else if (p.type === 'tool-webSearch') {
          const query = p.toolCall?.args?.query || p.args?.query || '';
          summaryParts.push(`[Web search: "${query}"]`);
        } else {
          summaryParts.push(`[${toolName} completed]`);
        }
      }
    }
  }
  
  // Create a summary message
  const summaryText = `**Conversation History Summary (${olderMessages.length} earlier messages):**\n\n${summaryParts.slice(0, 20).join('\n')}\n\n---\n\n*Recent conversation continues below:*`;
  
  const summaryMessage: BiomedUIMessage = {
    id: `summary-${Date.now()}`,
    role: 'user',
    parts: [{ type: 'text', text: summaryText }],
  };
  
  console.log(`[Chat API] Summarized ${olderMessages.length} older messages into 1 summary message`);
  
  return [summaryMessage, ...recentMessages];
}

export async function POST(req: Request) {
  try {
    const { messages: frontendMessages, sessionId }: { messages: BiomedUIMessage[], sessionId?: string } = await req.json();
    console.log("[Chat API] ========== NEW REQUEST ==========");
    console.log("[Chat API] Received sessionId:", sessionId);
    console.log("[Chat API] Frontend messages count:", frontendMessages.length);
    
    // CRITICAL: Reload messages from database instead of trusting frontend
    // Frontend keeps full image/tool result data in memory, causing context overflow
    let messages: BiomedUIMessage[];
    if (sessionId && frontendMessages.length > 1) {
      // Reload all previous messages from database (they're already filtered)
      const { data: dbMessages } = await db.getChatMessages(sessionId);
      
      // Convert DB messages to BiomedUIMessage format
      // CRITICAL: Filter out tool call parts without results - they cause OpenAI API errors
      // ("function_call was provided without its required reasoning item")
      const loadedMessages: BiomedUIMessage[] = (dbMessages || []).map((msg: any) => {
        const rawParts = JSON.parse(msg.content);
        const filteredParts = Array.isArray(rawParts) ? rawParts.filter((part: any) => {
          if (!part || typeof part !== 'object') return true;
          
          // Keep text parts
          if (part.type === 'text') return true;
          
          // For tool-* parts, only keep if they have actual result data
          if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
            // AI SDK v5 uses 'output' for results, not 'result'
            const hasOutput = part.output !== undefined && part.output !== null;
            const hasResult = part.result !== undefined && part.result !== null;
            if (!hasOutput && !hasResult) {
              console.log(`[Chat API] Filtering out incomplete tool call: ${part.type} (no output/result)`);
              return false;
            }
            return true;
          }
          
          // Filter out other types (reasoning, step-*, etc)
          return false;
        }) : rawParts;
        
        return {
          id: msg.id,
          role: msg.role,
          parts: stripResponseMetadata(filteredParts),
        };
      });
      
      // Add the new message from frontend (it's not in DB yet)
      // CRITICAL: Filter it first! Frontend caches full image/tool data in memory
      const newMessage = frontendMessages[frontendMessages.length - 1];
      
      // Filter out images and reasoning, keep text and tool parts
      const processedParts = Array.isArray(newMessage.parts) ? newMessage.parts : [];
      
      const filteredNewMessage = {
        ...newMessage,
        parts: processedParts
          .filter((part: any) => {
              if (!part || typeof part !== 'object') return true;
              const partType = part.type;
              
              // Keep: text and tool-* parts
              if (partType === 'text' || 
                  (typeof partType === 'string' && partType.startsWith('tool-'))) {
                return true;
              }
              
              // Remove: images (base64 data), reasoning, step-*, etc
              return false;
            })
          .map((part: any) => {
              // CRITICAL: Strip base64 image data from tool-generateImage results
              if (part.type === 'tool-generateImage' && part.result && typeof part.result === 'object') {
                if (part.result.imageData) {
                  const imageId = part.result.imageId || 'unknown';
                  return {
                    ...part,
                    result: {
                      ...part.result,
                      imageData: undefined,
                      _saved: `✓ Image saved to database (ID: ${imageId}). Display using: ![image](image:${imageId})`
                    }
                  };
                }
              }
              return part;
            })
      };
      
      messages = [...loadedMessages, filteredNewMessage];
      
      console.log(`[Chat API] Reloaded ${loadedMessages.length} messages from DB + 1 new (filtered) from frontend`);
    } else {
      // First message in conversation - filter frontend messages too!
      // Frontend might have cached data from previous sessions
      messages = frontendMessages.map((msg: BiomedUIMessage) => ({
        ...msg,
        parts: Array.isArray(msg.parts)
          ? msg.parts.filter((part: any) => {
              if (!part || typeof part !== 'object') return true;
              const partType = part.type;
              
              // Keep: text and ALL tool-related parts
              // REMOVE: reasoning (huge!), step-start/finish (UI markers)
              // NOTE: stripResponseMetadata removes rs_* IDs to prevent "missing reasoning" errors
              if (partType === 'text' || 
                  (typeof partType === 'string' && partType.startsWith('tool-'))) {
                return true;
              }
              
              // Remove: images (base64 data)
              if (partType === 'image') {
                return false;
              }
              
              // Remove unknown types
              return false;
            }).map((part: any) => {
              // CRITICAL: Strip base64 image data from tool-generateImage results
              if (part.type === 'tool-generateImage' && part.result && typeof part.result === 'object') {
                const filteredPart = { ...part };
                if (part.result.imageData) {
                  const imageId = part.result.imageId || 'unknown';
                  filteredPart.result = {
                    ...part.result,
                    imageData: undefined,
                    _saved: `✓ Image saved to database (ID: ${imageId}). Display using: ![image](image:${imageId})`
                  };
                  console.log(`[Chat API] Stripped base64 imageData from frontend tool-generateImage (first message, imageId: ${imageId})`);
                }
                return filteredPart;
              }
              return part;
            })
          : msg.parts
      }));
      console.log("[Chat API] Using filtered frontend messages (first in conversation)");
    }
    
    console.log("[Chat API] Total messages:", messages.length);

    // Determine if this is a user-initiated message (should count towards rate limit)
    // ONLY increment for the very first user message in a conversation
    // All tool calls, continuations, and follow-ups should NOT increment
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === 'user';
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    
    // Simple rule: Only increment if this is a user message AND it's the first user message
    const isUserInitiated = isUserMessage && userMessageCount === 1;
    
    console.log("[Chat API] Rate limit check:", {
      isUserMessage,
      userMessageCount,
      isUserInitiated,
      totalMessages: messages.length
    });

    // Check app mode and configure accordingly
    const isDevelopment = isDevelopmentMode();
    console.log("[Chat API] App mode:", isDevelopment ? 'development' : 'production');

    // Get authenticated user (uses local auth in dev mode)
    const { data: { user } } = await db.getUser();
    console.log("[Chat API] Authenticated user:", user?.id || 'anonymous');

    // Legacy Supabase clients (only used in production mode)
    let supabaseAnon: any = null;
    let supabase: any = null;

    if (!isDevelopment) {
      supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: req.headers.get('Authorization') || '',
            },
          },
        }
      );

      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }

    // Validate access for authenticated users (simplified validation)
    if (user && !isDevelopment) {
      const accessValidation = await validateAccess(user.id);
      
      if (!accessValidation.hasAccess && accessValidation.requiresPaymentSetup) {
        console.log("[Chat API] Access validation failed - payment required");
        return new Response(
          JSON.stringify({
            error: "PAYMENT_REQUIRED",
            message: "Payment method setup required",
            tier: accessValidation.tier,
            action: "setup_payment"
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (accessValidation.hasAccess) {
        console.log("[Chat API] Access validated for tier:", accessValidation.tier);
      }
    }

    // Check rate limit for user-initiated messages
    if (isUserInitiated && !isDevelopment) {
      if (!user) {
        // Fall back to anonymous rate limiting for non-authenticated users
        const rateLimitStatus = await checkAnonymousRateLimit();
        console.log("[Chat API] Anonymous rate limit status:", rateLimitStatus);
        
        if (!rateLimitStatus.allowed) {
          console.log("[Chat API] Anonymous rate limit exceeded");
          return new Response(
            JSON.stringify({
              error: "RATE_LIMIT_EXCEEDED",
              message: "You have exceeded your daily limit of 5 queries. Sign up to continue.",
              resetTime: rateLimitStatus.resetTime.toISOString(),
              remaining: rateLimitStatus.remaining,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Limit": rateLimitStatus.limit.toString(),
                "X-RateLimit-Remaining": rateLimitStatus.remaining.toString(),
                "X-RateLimit-Reset": rateLimitStatus.resetTime.toISOString(),
              },
            }
          );
        }
      } else {
        // Check user-based rate limits
        const rateLimitResult = await checkUserRateLimit(user.id);
        console.log("[Chat API] User rate limit status:", rateLimitResult);
        
        if (!rateLimitResult.allowed) {
          return new Response(JSON.stringify({
            error: "RATE_LIMIT_EXCEEDED",
            message: "Daily query limit reached. Upgrade to continue.",
            resetTime: rateLimitResult.resetTime.toISOString(),
            tier: rateLimitResult.tier
          }), {
            status: 429,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    } else if (isUserInitiated && isDevelopment) {
      console.log("[Chat API] Development mode: Rate limiting disabled");
    }

    // Detect available API keys and select provider/tools accordingly
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const lmstudioBaseUrl = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234';

    let selectedModel: any;
    let modelInfo: string;
    let supportsThinking = false;

    // Check if local models are enabled and which provider to use
    const localEnabled = req.headers.get('x-ollama-enabled') !== 'false'; // Legacy header name
    const localProvider = (req.headers.get('x-local-provider') as 'ollama' | 'lmstudio' | null) || 'ollama';
    const userPreferredModel = req.headers.get('x-ollama-model'); // Works for both providers

    // Models that support thinking/reasoning
    const thinkingModels = [
      'deepseek-r1', 'deepseek-v3', 'deepseek-v3.1',
      'qwen3', 'qwq',
      'phi4-reasoning', 'phi-4-reasoning',
      'cogito'
    ];

    if (isDevelopment && localEnabled) {
      // Development mode: Try to use local provider (Ollama or LM Studio) first, fallback to OpenAI
      try {
        let models: any[] = [];
        let providerName = '';
        let baseURL = '';

        // Try selected provider first
        if (localProvider === 'lmstudio') {
          // Try LM Studio
          const lmstudioResponse = await fetch(`${lmstudioBaseUrl}/v1/models`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          });

          if (lmstudioResponse.ok) {
            const data = await lmstudioResponse.json();
            // Filter out embedding models - only keep chat/LLM models
            const allModels = data.data.map((m: any) => ({ name: m.id })) || [];
            models = allModels.filter((m: any) =>
              !m.name.includes('embed') &&
              !m.name.includes('embedding') &&
              !m.name.includes('nomic')
            );
            providerName = 'LM Studio';
            baseURL = `${lmstudioBaseUrl}/v1`;
          } else {
            throw new Error(`LM Studio API responded with status ${lmstudioResponse.status}`);
          }
        } else {
          // Try Ollama
          const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          });

          if (ollamaResponse.ok) {
            const data = await ollamaResponse.json();
            models = data.models || [];
            providerName = 'Ollama';
            baseURL = `${ollamaBaseUrl}/v1`;
          } else {
            throw new Error(`Ollama API responded with status ${ollamaResponse.status}`);
          }
        }

        if (models.length > 0) {
          // Prioritize reasoning models, then other capable models
          const preferredModels = [
            'deepseek-r1', 'qwen3', 'phi4-reasoning', 'cogito', // Reasoning models
            'llama3.1', 'gemma3:4b', 'gemma3', 'llama3.2', 'llama3', 'qwen2.5', 'codestral' // Regular models
          ];
          let selectedModelName = models[0].name;

          // Try to find a preferred model
          if (userPreferredModel && models.some((m: any) => m.name === userPreferredModel)) {
            selectedModelName = userPreferredModel;
          } else {
            for (const preferred of preferredModels) {
              if (models.some((m: any) => m.name.includes(preferred))) {
                selectedModelName = models.find((m: any) => m.name.includes(preferred))?.name;
                break;
              }
            }
          }

          // Check if the selected model supports thinking
          supportsThinking = thinkingModels.some(thinkModel =>
            selectedModelName.toLowerCase().includes(thinkModel.toLowerCase())
          );

          // Create OpenAI-compatible client
          const localProviderClient = createOpenAI({
            baseURL: baseURL,
            apiKey: localProvider === 'lmstudio' ? 'lm-studio' : 'ollama', // Dummy API keys
          });

          // Create a chat model explicitly
          selectedModel = localProviderClient.chat(selectedModelName);
          modelInfo = `${providerName} (${selectedModelName})${supportsThinking ? ' [Reasoning]' : ''} - Development Mode`;
        } else {
          throw new Error(`No models available in ${localProvider}`);
        }
      } catch (error) {
        // Fallback to OpenAI in development mode
        console.error(`[Chat API] Local provider error (${localProvider}):`, error);
        console.log('[Chat API] Headers received:', {
          'x-ollama-enabled': req.headers.get('x-ollama-enabled'),
          'x-local-provider': req.headers.get('x-local-provider'),
          'x-ollama-model': req.headers.get('x-ollama-model')
        });
        selectedModel = hasOpenAIKey ? openai("gpt-5.1") : "openai/gpt-5.1";
        modelInfo = hasOpenAIKey
          ? "OpenAI (gpt-5.1) - Development Mode Fallback"
          : 'Vercel AI Gateway ("gpt-5.1") - Development Mode Fallback';
      }
    } else {
      // Production mode: Use Polar-wrapped OpenAI ONLY for pay-per-use users
      if (user) {
        // Get user subscription tier to determine billing approach
        const { data: userData } = await db.getUserProfile(user.id);

        const userTier = userData?.subscription_tier || userData?.subscriptionTier || 'free';
        const isActive = (userData?.subscription_status || userData?.subscriptionStatus) === 'active';
        
        // Only use Polar LLM Strategy for pay-per-use users
        if (isActive && userTier === 'pay_per_use') {
          selectedModel = getPolarTrackedModel(user.id, "gpt-5.1");
          modelInfo = "OpenAI (gpt-5.1) - Production Mode (Polar Tracked - Pay-per-use)";
        } else {
          // Unlimited users and free users use regular model (no per-token billing)
          selectedModel = hasOpenAIKey ? openai("gpt-5.1") : "openai/gpt-5.1";
          modelInfo = hasOpenAIKey
            ? `OpenAI (gpt-5.1) - Production Mode (${userTier} tier - Flat Rate)`
            : `Vercel AI Gateway ("gpt-5.1") - Production Mode (${userTier} tier - Flat Rate)`;
        }
      } else {
        selectedModel = hasOpenAIKey ? openai("gpt-5.1") : "openai/gpt-5.1";
        modelInfo = hasOpenAIKey
          ? "OpenAI (gpt-5.1) - Production Mode (Anonymous)"
          : 'Vercel AI Gateway ("gpt-5.1") - Production Mode (Anonymous)';
      }
    }

    console.log("[Chat API] Model selected:", modelInfo);

    // No need for usage tracker - Polar LLM Strategy handles everything automatically

    // User tier is already determined above in model selection
    let userTier = 'free';
    if (user) {
      const { data: userData } = await db.getUserProfile(user.id);
      userTier = userData?.subscription_tier || userData?.subscriptionTier || 'free';
      console.log("[Chat API] User tier:", userTier);
    }

    // Track processing start time
    const processingStartTime = Date.now();

    // Note: We don't save individual messages here anymore.
    // The entire conversation is saved in onFinish callback after streaming completes.
    // This follows the Vercel AI SDK v5 recommended pattern.

    console.log(`[Chat API] About to call streamText with model:`, selectedModel);
    console.log(`[Chat API] Model info:`, modelInfo);

    // Build provider options conditionally based on whether we're using local providers
    const isUsingLocalProvider = isDevelopment && localEnabled && (modelInfo.includes('Ollama') || modelInfo.includes('LM Studio'));
    const providerOptions: any = {};

    if (isUsingLocalProvider) {
      // For local models using OpenAI compatibility layer
      // We need to use the openai provider options since createOpenAI is used
      if (supportsThinking) {
        // Enable thinking for reasoning models
        providerOptions.openai = {
          think: true
        };
        console.log(`[Chat API] Enabled thinking mode for ${localProvider} reasoning model`);
      } else {
        // Explicitly disable thinking for non-reasoning models
        providerOptions.openai = {
          think: false
        };
        console.log(`[Chat API] Disabled thinking mode for ${localProvider} non-reasoning model`);
      }
    } else {
      // OpenAI-specific options (only when using OpenAI)
      providerOptions.openai = {
        store: true,
        reasoningEffort: 'medium',
        reasoningSummary: 'auto',
        include: ['reasoning.encrypted_content'],
      };
    }

    // Save user message immediately (before streaming starts)
    if (user && sessionId && messages.length > 0) {
      console.log('[Chat API] Saving user message immediately before streaming');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        const { randomUUID } = await import('crypto');
        const userMessageToSave = {
          id: randomUUID(), // Generate proper UUID instead of using AI SDK's short ID
          role: 'user' as const,
          content: lastMessage.parts || [],
        };

        // Get existing messages first
        const { data: existingMessages } = await db.getChatMessages(sessionId);
        const allMessages = [...(existingMessages || []), userMessageToSave];

        await saveChatMessages(sessionId, allMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content,
        })));

        // Update session timestamp
        await db.updateChatSession(sessionId, user.id, {
          last_message_at: new Date()
        });
        console.log('[Chat API] User message saved');
      }
    }

    // Summarize older messages when conversation has many tool calls
    // This compresses older messages while keeping recent ones intact
    const summarizedMessages = await summarizeOlderMessages(messages);
    
    // Trim messages to prevent context window overflow
    // Using token-aware trimming: keep as many recent messages as fit in token budget
    // Set to 10000 tokens - RAG tool now returns minimal ~150 token results
    // (context_id + sources + brief), with full context retrievable via getRAGContext
    const trimmedMessages = trimMessages(summarizedMessages, 10000);
    
    // Debug: Log message structure to understand format
    if (messages.length > 0) {
      const sampleMessage = messages[messages.length - 1];
      console.log('[Chat API] Sample message structure:', {
        role: sampleMessage.role,
        hasParts: !!sampleMessage.parts,
        partsLength: Array.isArray(sampleMessage.parts) ? sampleMessage.parts.length : 0,
        firstPartType: Array.isArray(sampleMessage.parts) && sampleMessage.parts.length > 0 
          ? sampleMessage.parts[0].type 
          : 'none',
      });
    }

    const result = streamText({
      model: selectedModel as any,
      messages: convertToModelMessages(trimmedMessages),
      tools: healthcareTools,
      toolChoice: "auto",
      experimental_context: {
        userId: user?.id,
        userTier,
        sessionId,
      },
      providerOptions,
      // DON'T pass abortSignal - we want the stream to continue even if user switches tabs
      system: `You are an expert AI research assistant for the City of Olympia, Washington, specializing in city planning, climate action, environmental initiatives, smart city operations, infrastructure, and municipal sustainability.

AVAILABLE OLYMPIA DOCUMENTS (26 indexed documents):

Your primary knowledge base includes these official City of Olympia documents:

Climate & Environment (8 documents):
1. Climate Risk and Vulnerability Assessment
2. Olympia Sea Level Rise Response Plan  
3. Olympia Greenhouse Gas Inventory
4. Water Quality Report
5. Water System Plan
6. Stormwater Management Action Plan
7. Urban Forestry Manual
8. Green Belt Stewardship for HOAs

Planning & Development (4 documents):
9. Olympia Neighborhood Centers Strategy
10. Olympia 2045 Comprehensive Plan Final EIS
11. Housing Action Plan
12. Public Participation Plan

Budget & Finance (4 documents):
13. 2025 Adopted Operating Budget
14. 2025 Long-Range Financial Projections
15. Capital Facilities Plan 2025-2030
16. Capital Facilities Plan 2026-2031

Transportation & Infrastructure (3 documents):
17. Transportation Master Plan
18. Street Safety Plan
19. Stormwater Site Plans

Public Safety (3 documents):
20. Natural Hazard Mitigation Plan
21. Emergency Management Plan
22. Police Department Strategic Plan

Other Municipal Plans (4 documents):
23. Parks Arts and Recreation Plan
24. Waste Resources Management Plan
25. Annual City Work Plan
26. Tree Density Calculation Guide

CRITICAL SEARCH WORKFLOW:
When users ask about Olympia planning, climate, or municipal topics:

1. FIRST: Use olympiaRAGSearch to check the 26 indexed documents above
2. THEN: Only if RAG results are insufficient, use webSearch for supplementary information
3. ALWAYS prioritize official document citations over web sources
4. Cite document titles and page numbers from RAG results

Do NOT search the web first - always check official documents via olympiaRAGSearch before using webSearch.

RAG SEARCH LIMITS AND CONTEXT RETRIEVAL:
- Maximum 4 olympiaRAGSearch calls per conversation - plan your searches carefully!
- Each search returns a brief summary + context_id. The full context is stored in the database.
- If you need more details from a previous search, use getRAGContext(context_id) instead of searching again.
- When you hit the limit, you'll receive a list of existing context_ids - use getRAGContext to access them.
- NEVER re-search for information you already have. Check your conversation history first.

      CRITICAL CITATION INSTRUCTIONS:
      When you use ANY search tool (Olympia RAG search, web search) and reference information from the results in your response:

      1. **Citation Format**: Use square brackets [1], [2], [3], etc.
      2. **Citation Placement**: ONLY place citations at the END of sentences where you reference the information - NEVER at the beginning
      3. **Multiple Citations**: When multiple sources support the same statement, group them together: [1][2][3] or [1,2,3]
      4. **Sequential Numbering**: Number citations sequentially starting from [1] based on the order sources appear in your search results
      5. **Consistent References**: The same source always gets the same number throughout your response

      CITATION PLACEMENT RULES (CRITICAL - READ CAREFULLY):
      - ✅ CORRECT: Place citations ONLY at the END of sentences before the period: "Tesla's revenue grew 50% in Q3 2023 [1]."
      - ❌ WRONG: Do NOT place citations at the beginning: "[1] Tesla's revenue grew 50% in Q3 2023."
      - ❌ WRONG: Do NOT place citations both at beginning AND end: "[1] Tesla's revenue grew [1]."
      - ✅ CORRECT: For multiple facts from the same source, cite once at the end of each sentence or once at paragraph end
      - ✅ CORRECT: Group multiple citations together: "Multiple studies confirm significant efficacy [1][2][3]."
      - For bullet points in lists, place citations at the end of each bullet point if needed

      Example of PROPER citation usage:
      "Olympia's Comprehensive Plan prioritizes sustainable urban development with a focus on neighborhood centers [1]. The city has allocated $2.3M for transportation improvements in the 2024 budget [2]. Climate action goals include 50% emissions reduction by 2030 and carbon neutrality by 2050 [1][3]. These initiatives demonstrate Olympia's commitment to environmental leadership [1][2][3]."

      Example of WRONG citation usage (DO NOT DO THIS):
      "[1] Olympia allocated $2.3M for transportation [1]. [2] The climate goals target 2050 [2]."
      
      You can:

         - Search official City of Olympia planning documents using the olympiaRAGSearch tool (comprehensive plans, climate action plans, budget reports, transportation plans, environmental assessments, municipal operations) - LIMITED TO 4 SEARCHES PER CONVERSATION
         - Retrieve full context from previous RAG searches using the getRAGContext tool (pass the context_id from a prior olympiaRAGSearch result to get complete details without using another search)
         - Execute Python code for climate data analysis, budget calculations, emissions modeling, statistical analysis, and urban planning computations using the codeExecution tool (runs in a secure Daytona Sandbox)
         - The Python environment can install packages via pip at runtime inside the sandbox (e.g., numpy, pandas, scipy, scikit-learn, matplotlib)
         - Visualization libraries (matplotlib, seaborn, plotly) may work inside Daytona. However, by default, prefer the built-in chart creation tool for standard time series and comparisons. Use Daytona for advanced or custom visualizations only when necessary.
         - Search the web for general information, supplementary research, or real-time data using the web search tool (climate news, smart city trends, sustainability best practices)
         - Create interactive charts and visualizations using the chart creation tool:
           • Line charts: Time series trends (emissions over time, budget allocations, temperature data, energy consumption)
           • Bar charts: Categorical comparisons (departmental budgets, neighborhood metrics, policy adoption rates)
           • Area charts: Cumulative data (population growth, carbon footprint progression)
           • Scatter/Bubble charts: Correlation analysis (emissions vs population, budget vs outcomes)
           • Quadrant charts: 2x2 planning matrices (priority vs impact, cost vs benefit analysis)
         - Create CSV exports for tabular data (budget breakdowns, climate metrics, planning timelines)

      **CRITICAL NOTE**: You must only make max 5 parallel tool calls at a time.

      **CRITICAL INSTRUCTIONS**: Your reports must be incredibly thorough and detailed, explore everything that is relevant to the user's query that will help to provide
      the perfect response that is of a level expected of an elite urban planning researcher and climate policy analyst working for a leading sustainable city.

      For Olympia RAG searches, you can access:
      • Comprehensive city planning documents
      • Climate action and sustainability plans
      • Municipal budget and financial reports
      • Transportation and infrastructure plans
      • Environmental impact assessments
      • Zoning and land use regulations
      • Community development strategies
      • Parks and recreation master plans
      • Economic development initiatives
      • Housing and affordability studies

      For web searches, you can find information on:
      • Current climate and sustainability news
      • Smart city technology trends
      • Urban planning best practices
      • Environmental policy developments
      • Green infrastructure innovations
      • Municipal finance trends
      • General knowledge across all domains
         
         For data visualization, you can create charts when users want to:
         • Compare budget allocations across departments or years (bar charts)
         • Visualize emissions trends over time (line/area charts)
         • Display climate metrics and sustainability indicators (line charts)
         • Show relationships between urban metrics (scatter charts for correlation)
         • Map priority vs impact for planning decisions (quadrant charts)
         • Present municipal data in an easy-to-understand visual format

         **Chart Type Selection Guidelines**:
         • Use LINE charts for time series trends (emissions over time, budget trends, climate indicators)
         • Use BAR charts for categorical comparisons (departmental budgets, neighborhood comparisons, policy metrics)
         • Use AREA charts for cumulative data (population growth, carbon footprint accumulation)
         • Use SCATTER charts for correlation analysis, urban metrics relationships, or bubble charts with size representing magnitude
         • Use QUADRANT charts for 2x2 planning analysis (divides chart into 4 quadrants with reference lines for priority matrices)

         Whenever you have time series data for the user (such as emissions data, budget trends, or climate metrics over time), always visualize it using the chart creation tool. For scatter/quadrant charts, each series represents a category or department (for color coding), and each data point represents an individual metric or year with x, y, optional size (for magnitude), and optional label (project/initiative name).

         CRITICAL: When using the createChart tool, you MUST format the dataSeries exactly like this:
         dataSeries: [
           {
             name: "Transportation Dept",
             data: [
               {x: "2020", y: 2500000},
               {x: "2021", y: 2750000},
               {x: "2022", y: 2900000}
             ]
           }
         ]
         
         Each data point requires an x field (date/label) and y field (numeric value). Do NOT use other formats like "datasets" or "labels" - only use the dataSeries format shown above.

         CRITICAL CHART EMBEDDING REQUIREMENTS:
         - Charts are automatically displayed in the Action Tracker section when created
         - Charts are ALSO saved to the database and MUST be referenced in your markdown response
         - The createChart tool returns a chartId and imageUrl for every chart created
         - YOU MUST ALWAYS embed charts in your response using markdown image syntax: ![Chart Title](/api/charts/{chartId}/image)
         - Embed charts at appropriate locations within your response, just like a professional research publication
         - Place charts AFTER the relevant analysis section that discusses the data shown in the chart
         - Charts should enhance and support your written analysis - they are not optional
         - Professional reports always integrate visual data with written analysis

         Example of proper chart embedding in a response:
         "Olympia's climate action initiatives have shown measurable progress over the past five years, with greenhouse gas emissions declining by 18% since 2019. Transportation electrification programs contributed significantly to this reduction, supported by municipal fleet conversions and expanded EV charging infrastructure.

         ![Olympia Greenhouse Gas Emissions Trend](/api/charts/abc-123-def/image)

         This emissions trajectory demonstrates Olympia's strong progress toward its 2030 interim target of 50% reduction..."

         When creating charts:
         • Use line charts for time series data (emissions trends, budget allocations over time)
         • Use bar charts for comparisons between categories (departmental budgets, neighborhood metrics)
         • Use area charts for cumulative data or when showing composition over time
         • Always provide meaningful titles and axis labels
         • Support multiple data series when comparing related metrics (different departments, multiple initiatives)
         • Colors are automatically assigned - focus on data structure and meaningful labels

               Always use the appropriate tools when users ask for Olympia planning data, calculations, Python code execution, climate analysis, web queries, or data visualization.
         Choose the codeExecution tool for any mathematical calculations, climate modeling, budget analysis, statistical computations, or when users need to run Python code.
         
         CRITICAL: WHEN TO USE codeExecution TOOL:
         - ALWAYS use codeExecution when the user asks you to "calculate", "compute", "use Python", or "show Python code"
         - NEVER just display Python code as text - you MUST execute it using the codeExecution tool
         - If the user asks for calculations with Python, USE THE TOOL, don't just show code
         - Mathematical formulas should be explained with LaTeX, but calculations MUST use codeExecution
         
         CRITICAL PYTHON CODE REQUIREMENTS:
         1. ALWAYS include print() statements - Python code without print() produces no visible output
         2. Use descriptive labels and proper formatting in your print statements
         3. Include units, currency symbols, percentages where appropriate
         4. Show step-by-step calculations for complex problems
         5. Use f-string formatting for professional output
         6. Always calculate intermediate values before printing final results
          7. Available libraries: You may install and use packages in the Daytona sandbox (e.g., numpy, pandas, scikit-learn). Prefer the chart creation tool for visuals unless an advanced/custom visualization is required.
          8. Visualization guidance: Prefer the chart creation tool for most charts. Use Daytona-rendered plots only for complex, bespoke visualizations that the chart tool cannot represent.
         
          REQUIRED: Every Python script must end with print() statements that show the calculated results with proper labels, units, and formatting. Never just write variable names or expressions without print() - they will not display anything to the user.
          If generating advanced charts with Daytona (e.g., matplotlib), ensure the code renders the figure (e.g., plt.show()) so artifacts can be captured.
         
         ERROR RECOVERY: If any tool call fails due to validation errors, you will receive an error message explaining what went wrong. When this happens:
         1. Read the error message carefully to understand what fields are missing or incorrect
         2. Correct the tool call by providing ALL required fields with proper values
         3. For createChart errors, ensure you provide: title, type, xAxisLabel, yAxisLabel, and dataSeries
         4. For codeExecution tool errors, ensure your code includes proper print() statements
         5. Try the corrected tool call immediately - don't ask the user for clarification
         6. If multiple fields are missing, fix ALL of them in your retry attempt
         
                  When explaining mathematical concepts, formulas, or statistical calculations, ALWAYS use LaTeX notation for clear mathematical expressions:

         CRITICAL: ALWAYS wrap ALL mathematical expressions in <math>...</math> tags:
         - For inline math: <math>E = E_0 \cdot (1 - r)^t</math> (emissions reduction over time)
         - For fractions: <math>\frac{Budget_{actual}}{Budget_{planned}} = Efficiency</math>
         - For exponents: <math>Population \cdot e^{rt}</math> (population growth)
         - For complex formulas: <math>Carbon_{total} = \sum_{i=1}^{n} (Emissions_i \times Factor_i)</math>

         NEVER write LaTeX code directly in text like \frac{x}{y} or \times - it must be inside <math> tags.
         NEVER use $ or $$ delimiters - only use <math>...</math> tags.
         This makes climate, budget, and statistical formulas much more readable and professional.
         Choose the olympiaRAGSearch tool specifically for City of Olympia official documents, planning data, climate plans, budgets, and municipal policies.
         Choose the web search tool for general topics, current events, sustainability news, smart city trends, and non-specialized information.
         Choose the chart creation tool when users want to visualize data, compare metrics, or see trends over time.

         When users ask for charts or data visualization, or when you have time series data:
         1. First gather the necessary data (using Olympia RAG search or web search if needed)
         2. Then create an appropriate chart with that data (always visualize time series data like emissions, budgets, climate metrics)
         3. Ensure the chart has a clear title, proper axis labels, and meaningful data series names
         4. Colors are automatically assigned for optimal visual distinction

      Important: If you use the chart creation tool to plot a chart, do NOT add a link to the chart in your response. The chart will be rendered automatically for the user. Simply explain the chart and its insights, but do not include any hyperlinks or references to a chart link.

      When making multiple tool calls in parallel to retrieve time series data (for example, comparing multiple departments or time periods), always specify the same time ranges for each tool call. This ensures the resulting data is directly comparable and can be visualized accurately on the same chart. If the user does not specify a time range, choose a reasonable default (such as the past 5 years or current budget cycle) and use it consistently across all tool calls for time series data.

      Provide clear explanations and context for all information. Offer practical insights for municipal decision-making when relevant.
      Be professional and supportive while helping users find accurate, up-to-date information about Olympia's planning and operations.

      ---
      CRITICAL AGENT BEHAVIOR:
      - After every reasoning step, you must either call a tool or provide a final answer. Never stop after reasoning alone.
      - If you realize you need to correct a previous tool call, immediately issue the correct tool call.
      - If the user asks for multiple items (e.g., multiple departments, multiple years), you must call the tool for each and only finish when all are processed and summarized.
      - Always continue until you have completed all required tool calls and provided a summary or visualization if appropriate.
      - NEVER just show Python code as text - if the user wants calculations or Python code, you MUST use the codeExecution tool to run it
      - When users say "calculate", "compute", or mention Python code, this is a COMMAND to use the codeExecution tool, not a request to see code
      - NEVER suggest using Python to fetch data from the internet or APIs. All data retrieval must be done via the olympiaRAGSearch or webSearch tools.
      - Remember: The Python environment runs in the cloud with NumPy, pandas, and scikit-learn available, but NO visualization libraries.
      
      CRITICAL WORKFLOW ORDER:
      1. First: Complete ALL data gathering (searches, calculations, etc.)
      2. Then: Create ALL charts/visualizations based on the gathered data
      3. Finally: Present your final formatted response with analysis
      
      This ensures charts appear immediately before your analysis and are not lost among tool calls.
      ---

      ---
      FINAL RESPONSE FORMATTING GUIDELINES:
      When presenting your final response to the user, you MUST format the information in an extremely well-organized and visually appealing way:

      1. **Use Rich Markdown Formatting:**
         - Use tables for comparative data, clinical outcomes, and any structured information
         - Use bullet points and numbered lists appropriately
         - Use **bold** for key metrics and important values (response rates, survival data, p-values)
         - Use headers (##, ###) to organize sections clearly
         - Use blockquotes (>) for key insights or summaries

      2. **Tables for Planning Data:**
         - Present budgets, climate metrics, planning timelines, and comparative data in markdown tables
         - Format numbers with proper separators and units (e.g., $2.3M, 18% reduction, 2030 target)
         - Include comparisons and trends
         - Example:
         | Department | 2023 Budget | 2024 Budget | Change |
         |------------|-------------|-------------|---------|
         | Transportation | $2.5M | $2.9M | +16% |
         | Climate Action | $1.2M | $1.8M | +50% |

      3. **Mathematical Formulas:**
         - Always use <math> tags for any mathematical expressions
         - Present climate, budget, and statistical calculations clearly with proper notation

      4. **Data Organization:**
         - Group related information together
         - Use clear section headers
         - Provide executive summaries at the beginning
         - Include key takeaways at the end

      5. **Chart Placement:**
         - Create ALL charts IMMEDIATELY BEFORE your final response text
         - First complete all data gathering and analysis tool calls
         - Then create all necessary charts
         - Finally present your comprehensive analysis with references to the charts
         - This ensures charts are visible and not buried among tool calls

      6. **Visual Hierarchy:**
         - Start with a brief executive summary
         - Present detailed findings in organized sections
         - Use horizontal rules (---) to separate major sections
         - End with key takeaways and visual charts

      7. **Code Display Guidelines:**
         - DO NOT repeat Python code in your final response if you've already executed it with the codeExecution tool
         - The executed code and its output are already displayed in the tool result box
         - Only show code snippets in your final response if:
           a) You're explaining a concept that wasn't executed
           b) The user specifically asks to see the code again
           c) You're showing an alternative approach
         - Reference the executed results instead of repeating the code

      Remember: The goal is to present ALL retrieved data and facts in the most professional, readable, and visually appealing format possible. Think of it as creating a professional urban planning report or municipal policy analysis.

      8. **Citation Requirements:**
         - ALWAYS cite sources when using information from search results
         - Place citations [1], [2], etc. ONLY at the END of sentences - NEVER at the beginning or middle
         - Do NOT place the same citation number multiple times in one sentence
         - Group multiple citations together when they support the same point: [1][2][3]
         - Maintain consistent numbering throughout your response
         - Each unique search result gets ONE citation number used consistently
         - Citations are MANDATORY for:
           • Specific numbers, statistics, percentages (budget amounts, emissions data, target dates)
           • Planning document provisions and policies
           • Quotes or paraphrased statements from official documents
           • Climate action goals and sustainability metrics
           • Any factual claims from search results
      ---
      `,
    });

    // Log streamText result object type
    console.log("[Chat API] streamText result type:", typeof result);
    console.log("[Chat API] streamText result:", result);

    // Create the streaming response with chat persistence
    const streamResponse = result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: messages,
      onFinish: async ({ messages: allMessages }) => {
        // Calculate processing time
        const processingEndTime = Date.now();
        const processingTimeMs = processingEndTime - processingStartTime;
        console.log('[Chat API] Processing completed in', processingTimeMs, 'ms');

        // Save all messages to database
        console.log('[Chat API] onFinish called - user:', !!user, 'sessionId:', sessionId);
        console.log('[Chat API] Total messages in conversation:', allMessages.length);
        console.log('[Chat API] Will save messages:', !!(user && sessionId));

        if (user && sessionId) {
          console.log('[Chat API] Saving messages to session:', sessionId);

          // The correct pattern: Save ALL messages from the conversation
          // This replaces all messages in the session with the complete, up-to-date conversation
          const { randomUUID } = await import('crypto');
          
          // DEBUG: Log what we're receiving
          console.log('[Chat API] DEBUG - allMessages structure:');
          allMessages.forEach((msg: any, idx: number) => {
            console.log(`  Message ${idx}: role=${msg.role}, parts count=${msg.parts?.length || 0}`);
            if (msg.parts) {
              msg.parts.forEach((part: any, partIdx: number) => {
                console.log(`    Part ${partIdx}: type=${part.type || 'unknown'}`);
              });
            }
          });
          
          const messagesToSave = allMessages.map((message: any, index: number) => {
            // AI SDK v5 uses 'parts' array for UIMessage
            let contentToSave = [];

            if (message.parts && Array.isArray(message.parts)) {
              // CRITICAL: Filter out large data to prevent context explosion
              // KEEP: text, tool calls, step markers, reasoning (small metadata)
              // REMOVE: tool results (RAG chunks), images (base64 data), unknown types
              const originalPartsCount = message.parts.length;
              contentToSave = message.parts.filter((part: any) => {
                // Keep user messages completely
                if (message.role === 'user') {
                  return true;
                }
                
                // For assistant messages, filter based on part type
                if (part && typeof part === 'object') {
                  const partType = part.type;
                  
                  // Keep: text parts
                  if (partType === 'text') {
                    return true;
                  }
                  
                  // For tool-* parts, ONLY keep if they have actual result/output data
                  // This prevents saving incomplete tool calls that cause OpenAI API errors
                  if (typeof partType === 'string' && partType.startsWith('tool-')) {
                    const hasOutput = part.output !== undefined && part.output !== null;
                    const hasResult = part.result !== undefined && part.result !== null;
                    if (!hasOutput && !hasResult) {
                      console.log(`[Chat API] Filtering out incomplete tool call: ${partType} (no output/result)`);
                      return false;
                    }
                    return true;
                  }
                  
                  // Remove: images (base64 data)
                  if (partType === 'image') {
                    console.log(`[Chat API] Filtering out ${partType} part from message ${message.id}`);
                    return false;
                  }
                  
                  // Log unknown part types
                  console.log(`[Chat API] Filtering out UNKNOWN part type '${partType}' from message ${message.id}`);
                } else {
                  console.log(`[Chat API] Filtering out invalid part (not an object) from message ${message.id}`, part);
                }
                
                // Remove unknown part types by default to prevent data leaks
                return false;
              }).map((part: any) => {
                // DEBUG: Log RAG tool parts to understand their structure
                if (part.type === 'tool-olympiaRAGSearch') {
                  console.log(`[Chat API] DEBUG - tool-olympiaRAGSearch part being saved:`, JSON.stringify({
                    type: part.type,
                    hasResult: !!part.result,
                    resultType: typeof part.result,
                    hasToolCall: !!part.toolCall,
                    toolCallId: part.toolCallId,
                    toolName: part.toolName,
                    hasArgs: !!part.args,
                    partKeys: Object.keys(part),
                    // Show first 500 chars of result if it exists
                    resultPreview: part.result ? JSON.stringify(part.result).substring(0, 500) : 'NO RESULT',
                  }, null, 2));
                }
                
                // CRITICAL: Strip base64 image data from tool-generateImage results
                // The result field can contain imageData which is base64 encoded (100K+ tokens)
                if (part.type === 'tool-generateImage') {
                  console.log(`[Chat API] DEBUG - tool-generateImage part structure:`, {
                    type: part.type,
                    hasResult: !!part.result,
                    resultType: typeof part.result,
                    resultKeys: part.result ? Object.keys(part.result) : [],
                    hasImageData: part.result?.imageData ? 'YES' : 'NO',
                    imageDataLength: part.result?.imageData?.length || 0,
                    has_instructions: !!part.result?._instructions,
                    partKeys: Object.keys(part),
                  });
                  console.log(`[Chat API] DEBUG - Full part (first 500 chars):`, JSON.stringify(part).substring(0, 500));
                  
                  if (part.result && typeof part.result === 'object') {
                    const filteredPart = { ...part };
                    if (part.result.imageData) {
                      const imageId = part.result.imageId || 'unknown';
                      const imageUrl = part.result.imageUrl || `/api/images/${imageId}`;
                      filteredPart.result = {
                        ...part.result,
                        imageData: undefined, // Remove base64 data
                        _saved: `✓ Image successfully saved to database (ID: ${imageId}). Display it using: ![image](image:${imageId})`
                      };
                      console.log(`[Chat API] ✓ Stripped base64 imageData from tool-generateImage result (imageId: ${imageId})`);
                    }
                    return filteredPart;
                  }
                }
                return part;
              });
              
              // Log if we filtered anything
              if (message.role === 'assistant' && contentToSave.length < originalPartsCount) {
                console.log(`[Chat API] Filtered message parts: ${originalPartsCount} → ${contentToSave.length} (removed ${originalPartsCount - contentToSave.length} parts)`);
              }
            } else if (message.content) {
              // Fallback for older format
              if (typeof message.content === 'string') {
                contentToSave = [{ type: 'text', text: message.content }];
              } else if (Array.isArray(message.content)) {
                contentToSave = message.content;
              }
            }

            return {
              id: message.id && message.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
                ? message.id
                : randomUUID(), // Generate UUID if message.id is not a valid UUID
              role: message.role,
              content: contentToSave,
              processing_time_ms:
                message.role === 'assistant' &&
                index === allMessages.length - 1 &&
                processingTimeMs !== undefined
                  ? processingTimeMs
                  : undefined,
            };
          });

          const saveResult = await saveChatMessages(sessionId, messagesToSave);
          if (saveResult.error) {
            console.error('[Chat API] Error saving messages:', saveResult.error);
          } else {
            console.log('[Chat API] Successfully saved', messagesToSave.length, 'messages to session:', sessionId);

            // Update session's last_message_at timestamp
            const updateResult = await db.updateChatSession(sessionId, user.id, {
              last_message_at: new Date()
            });
            if (updateResult.error) {
              console.error('[Chat API] Error updating session timestamp:', updateResult.error);
            } else {
              console.log('[Chat API] Updated session timestamp for:', sessionId);
            }
          }
        } else {
          console.log('[Chat API] Skipping message save - user:', !!user, 'sessionId:', sessionId);
        }

        // No manual usage tracking needed - Polar LLM Strategy handles this automatically!
        console.log('[Chat API] AI usage automatically tracked by Polar LLM Strategy');
      }
    });

    // Increment rate limit after successful validation but before processing
    if (isUserInitiated && !isDevelopment) {
      console.log("[Chat API] Incrementing rate limit for user-initiated message");
      try {
        if (user) {
          // Only increment server-side for authenticated users
          const rateLimitResult = await incrementRateLimit(user.id);
          console.log("[Chat API] Authenticated user rate limit incremented:", rateLimitResult);
        } else {
          // Anonymous users handle increment client-side via useRateLimit hook
          console.log("[Chat API] Skipping server-side increment for anonymous user (handled client-side)");
        }
      } catch (error) {
        console.error("[Chat API] Failed to increment rate limit:", error);
        // Continue with processing even if increment fails
      }
    }
    
    if (isDevelopment) {
      // Add development mode headers
      streamResponse.headers.set("X-Development-Mode", "true");
      streamResponse.headers.set("X-RateLimit-Limit", "unlimited");
      streamResponse.headers.set("X-RateLimit-Remaining", "unlimited");
    }

    // Add headers to prevent connection drops when tab is backgrounded
    streamResponse.headers.set("Connection", "keep-alive");
    streamResponse.headers.set("X-Accel-Buffering", "no"); // Disable buffering for nginx
    streamResponse.headers.set("Cache-Control", "no-cache, no-transform"); // Prevent caching that might break streaming

    return streamResponse;
  } catch (error) {
    console.error("[Chat API] Error:", error);

    // Extract meaningful error message
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred';

    // Check if it's a tool/function calling compatibility error
    const isToolError = errorMessage.toLowerCase().includes('tool') ||
                       errorMessage.toLowerCase().includes('function');
    const isThinkingError = errorMessage.toLowerCase().includes('thinking');

    // Log full error details for debugging
    console.error("[Chat API] Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
      isToolError,
      isThinkingError
    });

    // Return specific error codes for compatibility issues
    if (isToolError || isThinkingError) {
      return new Response(
        JSON.stringify({
          error: "MODEL_COMPATIBILITY_ERROR",
          message: errorMessage,
          compatibilityIssue: isToolError ? "tools" : "thinking"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "CHAT_ERROR",
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

