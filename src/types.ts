/**
 * TypeScript 类型定义
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

