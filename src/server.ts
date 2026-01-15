/**
 * MCP 服务器实现
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DashScopeClient } from './dashscope-client.js';
import { aiChatTool, executeAIChat } from './tools/ai-chat.js';
import { fileSystemResource, readFile, listFiles } from './resources/file-system.js';

export class MCPServer {
  private server: Server;
  private dashscopeClient: DashScopeClient;

  constructor(apiKey: string) {
    this.server = new Server(
      {
        name: 'dashscope-mcp-agent',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.dashscopeClient = new DashScopeClient({ apiKey });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          aiChatTool, // AI 对话工具 - 使用阿里百炼大模型
        ],
      };
    });

    // 调用工具
    this.server.setRequestHandler(CallToolRequestSchema, async (request: { params: { name: string; arguments?: unknown } }) => {
      const { name, arguments: args } = request.params;

      try {
        let result: string;

        switch (name) {
          case 'ai_chat':
            // 使用阿里百炼 DashScope 大模型
            result = await executeAIChat(args, this.dashscopeClient);
            break;
          default:
            throw new Error(`未知工具: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `错误: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    // 列出可用资源
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'file://',
            name: fileSystemResource.name,
            description: fileSystemResource.description,
            mimeType: fileSystemResource.mimeType,
          },
        ],
      };
    });

    // 读取资源
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: { params: { uri: string } }) => {
      const { uri } = request.params;

      try {
        if (uri.startsWith('file://')) {
          const path = uri.replace('file://', '');
          
          // 检查是否是目录
          try {
            const fs = await import('fs/promises');
            const stats = await fs.stat(path);
            
            if (stats.isDirectory()) {
              const files = await listFiles(path);
              return {
                contents: [
                  {
                    uri,
                    mimeType: 'application/json',
                    text: JSON.stringify({ files }, null, 2),
                  },
                ],
              };
            } else {
              const content = await readFile({ path });
              return {
                contents: [
                  {
                    uri,
                    mimeType: 'text/plain',
                    text: content,
                  },
                ],
              };
            }
          } catch (error) {
            throw new Error(`文件系统错误: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          throw new Error(`不支持的资源 URI: ${uri}`);
        }
      } catch (error) {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `错误: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  /**
   * 使用 DashScope 进行对话
   */
  async chat(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): Promise<string> {
    const response = await this.dashscopeClient.chatCompletion({
      model: 'qwen-turbo',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.output.choices[0].message.content;
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Server 已启动 (stdio)');
  }
}

