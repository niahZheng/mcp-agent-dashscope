/**
 * MCP API 服务器
 * 提供 HTTP API 接口，让 Web 客户端或其他应用可以通过 HTTP 调用 MCP 服务器
 */

import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '.'))); // 提供静态文件（HTML）

// MCP 服务器进程
let mcpServerProcess: ReturnType<typeof spawn> | null = null;
let requestQueue: Array<{
  id: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];
let requestIdCounter = 1;

// 启动 MCP 服务器进程
function startMCPServer() {
  const serverPath = join(__dirname, '..', 'dist', 'index.js');
  
  mcpServerProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || 'sk-51a208c1a4364820bd2faea140468764'
    }
  });

  let buffer = '';

  mcpServerProcess.stdout?.on('data', (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          const request = requestQueue.find(r => r.id === response.id);
          if (request) {
            requestQueue = requestQueue.filter(r => r.id !== response.id);
            if (response.error) {
              request.reject(new Error(response.error.message || 'MCP Error'));
            } else {
              request.resolve(response.result);
            }
          }
        } catch (e) {
          console.error('解析响应失败:', e);
        }
      }
    }
  });

  mcpServerProcess.stderr?.on('data', (data: Buffer) => {
    console.error('MCP Server:', data.toString());
  });

  mcpServerProcess.on('error', (error) => {
    console.error('MCP 服务器启动失败:', error);
  });

  mcpServerProcess.on('exit', (code) => {
    console.error(`MCP 服务器退出，代码: ${code}`);
    mcpServerProcess = null;
    // 重新启动
    setTimeout(startMCPServer, 1000);
  });
}

// 发送 MCP 请求
function sendMCPRequest(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!mcpServerProcess || !mcpServerProcess.stdin) {
      reject(new Error('MCP 服务器未启动'));
      return;
    }

    const id = requestIdCounter++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    requestQueue.push({ id, resolve, reject });

    mcpServerProcess.stdin.write(JSON.stringify(request) + '\n');

    // 超时处理
    setTimeout(() => {
      const index = requestQueue.findIndex(r => r.id === id);
      if (index !== -1) {
        requestQueue.splice(index, 1);
        reject(new Error('请求超时'));
      }
    }, 30000);
  });
}

// API 路由

// 健康检查
app.get('/api/mcp/status', (req, res) => {
  res.json({
    status: mcpServerProcess ? 'connected' : 'disconnected',
    pid: mcpServerProcess?.pid
  });
});

// 列出工具
app.get('/api/mcp/tools', async (req, res) => {
  try {
    const result = await sendMCPRequest('tools/list', {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 调用工具
app.post('/api/mcp/tools/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    if (!name) {
      return res.status(400).json({ error: '工具名称不能为空' });
    }
    
    const result = await sendMCPRequest('tools/call', {
      name,
      arguments: args || {}
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 列出资源
app.get('/api/mcp/resources', async (req, res) => {
  try {
    const result = await sendMCPRequest('resources/list', {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 读取资源
app.post('/api/mcp/resources/read', async (req, res) => {
  try {
    const { uri } = req.body;
    if (!uri) {
      return res.status(400).json({ error: '资源 URI 不能为空' });
    }
    
    const result = await sendMCPRequest('resources/read', { uri });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 提供 Web 界面
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'web-client.html'));
});

// 启动服务器
startMCPServer();

app.listen(PORT, () => {
  console.log(`🚀 MCP API 服务器运行在 http://localhost:${PORT}`);
  console.log(`📱 Web 客户端: http://localhost:${PORT}`);
  console.log(`📚 API 文档: http://localhost:${PORT}/api/mcp/status`);
});

