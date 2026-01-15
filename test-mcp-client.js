/**
 * 简单的 MCP 客户端测试脚本
 * 用于测试 MCP 服务器是否正常工作
 * 
 * 使用方法: node test-mcp-client.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

const serverPath = join(__dirname, 'dist', 'index.js');

console.log('启动 MCP 服务器...');
console.log('服务器路径:', serverPath);
console.log('API Key:', process.env.DASHSCOPE_API_KEY ? '已配置' : '未配置');
console.log('');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || 'sk-51a208c1a4364820bd2faea140468764'
  }
});

let requestId = 1;

// 发送 MCP 请求
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };
  
  console.log(`\n📤 发送请求: ${method}`);
  console.log('请求内容:', JSON.stringify(request, null, 2));
  
  server.stdin.write(JSON.stringify(request) + '\n');
}

// 处理响应
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      console.log('\n📥 收到响应:');
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      // 忽略非 JSON 行
      if (line.trim()) {
        console.log('输出:', line);
      }
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('服务器日志:', data.toString());
});

server.on('error', (error) => {
  console.error('❌ 服务器启动失败:', error);
  process.exit(1);
});

// 等待服务器启动
setTimeout(() => {
  console.log('开始测试...\n');
  
  // 测试 1: 列出可用工具
  sendRequest('tools/list');
  
  // 测试 2: 调用 AI 对话工具
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'ai_chat',
      arguments: {
        message: '你好，请介绍一下你自己',
        model: 'qwen-turbo'
      }
    });
  }, 1000);
  
  // 测试 3: 列出资源
  setTimeout(() => {
    sendRequest('resources/list');
  }, 3000);
  
  // 测试完成后退出
  setTimeout(() => {
    console.log('\n✅ 测试完成');
    server.kill();
    process.exit(0);
  }, 5000);
}, 500);

