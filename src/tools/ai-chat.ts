/**
 * AI 对话工具 - 使用阿里百炼 DashScope 大模型
 */

import { z } from 'zod';
import { DashScopeClient } from '../dashscope-client.js';

export const aiChatTool = {
  name: 'ai_chat',
  description: '使用阿里百炼 DashScope 大模型进行对话（支持多轮对话）',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: '用户消息内容',
      },
      system_prompt: {
        type: 'string',
        description: '系统提示词（可选）',
      },
      model: {
        type: 'string',
        description: '使用的模型（可选，默认 qwen-turbo）',
        default: 'qwen-turbo',
      },
      temperature: {
        type: 'number',
        description: '温度参数（0-1，可选，默认 0.7）',
        default: 0.7,
      },
    },
    required: ['message'],
  } as const,
};

const AIChatSchema = z.object({
  message: z.string(),
  system_prompt: z.string().optional(),
  model: z.string().optional().default('qwen-turbo'),
  temperature: z.number().min(0).max(1).optional().default(0.7),
});

export async function executeAIChat(
  args: unknown,
  dashscopeClient: DashScopeClient
): Promise<string> {
  const parsed = AIChatSchema.parse(args);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  // 添加系统提示词（如果有）
  if (parsed.system_prompt) {
    messages.push({
      role: 'system',
      content: parsed.system_prompt,
    });
  }

  // 添加用户消息
  messages.push({
    role: 'user',
    content: parsed.message,
  });

  try {
    const response = await dashscopeClient.chatCompletion({
      model: parsed.model,
      messages,
      temperature: parsed.temperature,
      max_tokens: 2000,
    });

    const content = response.output.choices[0].message.content;
    const usage = response.output.usage;

    return `🤖 AI 回复（模型: ${parsed.model}）:\n\n${content}\n\n---\n📊 Token 使用: 输入 ${usage.input_tokens}, 输出 ${usage.output_tokens}, 总计 ${usage.total_tokens}`;
  } catch (error) {
    throw new Error(`AI 调用失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

