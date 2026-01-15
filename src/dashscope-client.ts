/**
 * 阿里百炼 DashScope API 客户端
 */

// 注意：需要 Node.js 18+ 以使用内置的 fetch API
// 对于旧版本 Node.js，需要安装 node-fetch: npm install node-fetch

// Fetch API 类型声明（Node.js 18+ 内置）
declare global {
  function fetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>;
}

export interface DashScopeConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface ChatCompletionResponse {
  output: {
    choices: Array<{
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }>;
    usage: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    };
  };
  request_id: string;
}

export class DashScopeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: DashScopeConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/api/v1';
  }

  /**
   * 调用 DashScope Chat API
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/services/aigc/text-generation/generation`;
    
    // 使用 Node.js 内置的 fetch (Node.js 18+)
    // 如果使用旧版本 Node.js，需要安装 node-fetch
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-DashScope-SSE': 'disable',
      },
      body: JSON.stringify({
        model: request.model || 'qwen-turbo',
        input: {
          messages: request.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        },
        parameters: {
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 2000,
          top_p: request.top_p ?? 0.8,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DashScope API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    // 适配 DashScope 响应格式
    return {
      output: {
        choices: [
          {
            message: {
              role: 'assistant',
              content: data.output?.text || data.output?.choices?.[0]?.message?.content || '',
            },
            finish_reason: data.output?.finish_reason || 'stop',
          },
        ],
        usage: {
          input_tokens: data.usage?.input_tokens || 0,
          output_tokens: data.usage?.output_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        },
      },
      request_id: data.request_id || '',
    };
  }

  /**
   * 流式调用（简化版，返回完整响应）
   */
  async chatCompletionStream(
    request: ChatCompletionRequest,
    onChunk?: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    // 简化实现：先使用非流式，后续可以扩展
    return this.chatCompletion(request);
  }
}
