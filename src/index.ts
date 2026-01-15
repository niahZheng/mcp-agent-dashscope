/**
 * MCP Agent 主入口文件
 */

import dotenv from 'dotenv';
import { MCPServer } from './server.js';

// 加载环境变量
dotenv.config();

const apiKey = process.env.DASHSCOPE_API_KEY;

if (!apiKey) {
  console.error('错误: 未找到 DASHSCOPE_API_KEY 环境变量');
  console.error('请在 .env 文件中设置 DASHSCOPE_API_KEY');
  process.exit(1);
}

// 创建并启动 MCP 服务器
const server = new MCPServer(apiKey);

server.start().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});

