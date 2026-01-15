/**
 * 文件系统资源
 */

import { z } from 'zod';

export const fileSystemResource = {
  uri: 'file://',
  name: '文件系统',
  description: '访问本地文件系统',
  mimeType: 'text/plain',
};

const ReadFileSchema = z.object({
  path: z.string(),
});

export async function readFile(args: unknown): Promise<string> {
  const parsed = ReadFileSchema.parse(args);
  
  // 注意：在浏览器环境中需要使用不同的 API
  // 这里是一个简化示例
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(parsed.path, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`无法读取文件 ${parsed.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function listFiles(directory: string): Promise<string[]> {
  try {
    const fs = await import('fs/promises');
    const files = await fs.readdir(directory);
    return files;
  } catch (error) {
    throw new Error(`无法列出目录 ${directory}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

