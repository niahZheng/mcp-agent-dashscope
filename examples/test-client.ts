/**
 * 测试客户端示例
 * 演示如何与 MCP 服务器交互
 */

import { MCPServer } from '../src/server.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMCPServer() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error('未找到 DASHSCOPE_API_KEY');
    return;
  }

  const server = new MCPServer(apiKey);

  // 测试对话功能
  console.log('测试 DashScope 对话...');
  const response = await server.chat([
    {
      role: 'user',
      content: '你好，请介绍一下你自己',
    },
  ]);
  console.log('回复:', response);
}

// 注意：这个测试文件需要在实际的 MCP 客户端环境中运行
// 或者需要修改为直接调用工具函数
if (import.meta.url === `file://${process.argv[1]}`) {
  testMCPServer().catch(console.error);
}

