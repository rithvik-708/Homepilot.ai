import { Message } from '@aws-sdk/client-bedrock-runtime';
import { AgentProvider, InvokeOptions } from './AgentProvider.js';
import { dynamicRegistry } from '../../tools/dynamic/registry.js';

export class NIMProvider implements AgentProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor() {
    const base = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    this.baseUrl = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    this.model = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.2-90b-vision-instruct';
    
    if (!process.env.NVIDIA_NIM_API_KEY) {
      throw new Error('NVIDIA_NIM_API_KEY is required when AI_PROVIDER=nim');
    }
    this.apiKey = process.env.NVIDIA_NIM_API_KEY;
  }

  private getNIMTools() {
    return dynamicRegistry.getActiveTools().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  public async invoke(messages: Message[], options?: InvokeOptions): Promise<Message | undefined> {
    const formattedMessages: any[] = [];

    for (const m of messages) {
      let role = (m.role as string) === 'system' ? 'system' : (m.role === 'user' ? 'user' : 'assistant');

      if (typeof m.content === 'string') {
        formattedMessages.push({ role, content: m.content });
      } else if (Array.isArray(m.content)) {
        const toolResultBlocks = m.content.filter((c: any) => c.toolResult);
        if (toolResultBlocks.length > 0) {
          // OpenAI expects each tool result as a separate message with role "tool"
          for (const block of toolResultBlocks) {
            const tr = block.toolResult;
            if (!tr) continue;
            let resContent = '';
            if (Array.isArray(tr.content) && tr.content.length > 0) {
              resContent = tr.content[0].text || JSON.stringify(tr.content[0].json);
            } else if (typeof tr.content === 'string') {
              resContent = tr.content;
            } else {
              resContent = JSON.stringify(tr.content);
            }

            formattedMessages.push({
              role: 'tool',
              tool_call_id: tr.toolUseId,
              content: `${resContent || 'success'}\n(Note: The requested action completed successfully. If this fulfills the homeowner's request, provide your final summary and do not call any more tools.)`
            });
          }
        } else {
          // Normal message or tool use
          const texts = m.content.filter(c => c.text).map(c => c.text);
          let contentStr = texts.join('\n');
          
          const toolUses = m.content.filter(c => c.toolUse);
          let tool_calls: any[] | undefined = undefined;
          
          if (toolUses.length > 0) {
            tool_calls = toolUses.map(c => ({
              id: c.toolUse!.toolUseId,
              type: 'function',
              function: {
                name: c.toolUse!.name,
                arguments: typeof c.toolUse!.input === 'string' ? c.toolUse!.input : JSON.stringify(c.toolUse!.input)
              }
            }));
          }

          const msgObj: any = { role };
          // OpenAI API accepts empty content if tool_calls is provided
          if (contentStr || !tool_calls) {
            msgObj.content = contentStr;
          }
          if (tool_calls) {
            msgObj.tool_calls = tool_calls;
          }
          
          formattedMessages.push(msgObj);
        }
      }
    }

    const requestPayload: any = {
      model: this.model,
      messages: formattedMessages,
      temperature: 0.4,
      max_tokens: 4096,
    };

    if (options?.forceSummary) {
      requestPayload.tool_choice = 'none';
    } else {
      requestPayload.tools = this.getNIMTools();
    }

    const maxRetries = 1;
    let data: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutMs = parseInt(process.env.NVIDIA_NIM_TIMEOUT_MS || '45000', 10);
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errText = '';
          try { errText = await response.text(); } catch (e) {}

          if ([502, 503, 504, 429].includes(response.status) && attempt < maxRetries) {
            console.warn(
              `[NIMProvider] Upstream ${response.status} ${response.statusText}. Retrying in 2s (attempt ${attempt + 1}/${maxRetries})...`
            );
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }

          throw new Error(`NVIDIA NIM connection failed: ${response.status} ${response.statusText} ${errText}`);
        }

        data = (await response.json()) as any;
        break;
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          if (attempt < maxRetries) {
            console.warn(`[NIMProvider] Request timed out after ${timeoutMs / 1000}s. Retrying once...`);
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw new Error(
            `NVIDIA NIM inference timed out after ${timeoutMs / 1000}s. Upstream NVIDIA cloud is experiencing heavy load. Please try again or switch to local/Bedrock provider.`
          );
        }

        if (attempt >= maxRetries) {
          throw err;
        }
      }
    }

    if (!data) return undefined;
    const msg = data.choices?.[0]?.message;

    if (!msg) return undefined;

    const contentBlocks: any[] = [];
    if (msg.content) {
      contentBlocks.push({ text: msg.content });
    }
    
    if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const tc = msg.tool_calls[0];
      let inputObj = {};
      try {
        inputObj = JSON.parse(tc.function.arguments);
      } catch (e) {
        console.warn("Failed to parse tool arguments from NIM", tc.function.arguments);
      }
      contentBlocks.push({
        toolUse: {
          toolUseId: tc.id || `call_${Math.random().toString(36).slice(2, 9)}`,
          name: tc.function.name,
          input: inputObj,
        },
      });
    } else if (typeof msg.content === 'string') {
      // Fallback: Llama 3 / open-weights models frequently emit function calls with <|python_tag|> or raw JSON in content
      let cleanContent = msg.content.trim();
      if (cleanContent.startsWith('<|python_tag|>')) {
        cleanContent = cleanContent.replace('<|python_tag|>', '').trim();
      }

      // Check if content contains tool call JSON object(s)
      if (cleanContent.includes('"name"') && (cleanContent.includes('"parameters"') || cleanContent.includes('"arguments"'))) {
        const segments = cleanContent.split(';').map((s: string) => s.trim()).filter(Boolean);
        const extractedTools: any[] = [];
        const activeToolNames = dynamicRegistry.getActiveTools().map((t: any) => t.name);

        for (const seg of segments) {
          const firstBrace = seg.indexOf('{');
          const lastBrace = seg.lastIndexOf('}');
          if (firstBrace === -1 || lastBrace <= firstBrace) continue;

          let jsonCandidate = seg.slice(firstBrace, lastBrace + 1)
            .replace(/\bTrue\b/g, 'true')
            .replace(/\bFalse\b/g, 'false')
            .replace(/\bNone\b/g, 'null');

          let parsed: any = null;
          try {
            parsed = JSON.parse(jsonCandidate);
          } catch {
            try {
              parsed = JSON.parse(jsonCandidate.replace(/'/g, '"'));
            } catch {}
          }

          if (parsed && typeof parsed === 'object') {
            const toolName = parsed.name || parsed.tool || parsed.function;
            const params = parsed.parameters || parsed.arguments || parsed.input || {};

            if (toolName && typeof toolName === 'string' && activeToolNames.includes(toolName)) {
              let normalizedParams: any = typeof params === 'string' ? JSON.parse(params.replace(/'/g, '"')) : { ...params };

              for (const [k, v] of Object.entries(normalizedParams)) {
                if (typeof v === 'string') {
                  const tv = v.trim();
                  if (tv.startsWith('{') || tv.startsWith('[')) {
                    try {
                      normalizedParams[k] = JSON.parse(tv.replace(/'/g, '"'));
                    } catch {}
                  }
                }
              }

              extractedTools.push({
                toolUse: {
                  toolUseId: `call_${Math.random().toString(36).slice(2, 9)}`,
                  name: toolName,
                  input: normalizedParams,
                },
              });
            }
          }
        }

        if (extractedTools.length > 0) {
          contentBlocks.length = 0;
          // NVIDIA NIM enforces a hard limit: only single tool-calls at once
          contentBlocks.push(extractedTools[0]);
        }
      }
    }

    return {
      role: 'assistant',
      content: contentBlocks,
    };
  }
}
