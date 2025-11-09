/**
 * stdio-based MCP server for MyBatis Boost
 * Supports Cursor IDE and other MCP-compatible AI tools
 *
 * This server implements the Model Context Protocol (MCP) specification
 * using JSON-RPC 2.0 over stdio transport
 */

import * as readline from 'readline';
import { MCPRequestHandler } from './handlers';

/**
 * JSON-RPC 2.0 request structure
 */
interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: string | number;
    method: string;
    params?: any;
}

/**
 * JSON-RPC 2.0 response structure
 */
interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

/**
 * MCP stdio server
 */
class MCPStdioServer {
    private handler: MCPRequestHandler;
    private rl: readline.Interface;

    constructor() {
        this.handler = new MCPRequestHandler();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
    }

    /**
     * Start the server
     */
    start(): void {
        this.logToStderr('MyBatis Boost MCP Server starting...');

        // Handle each line from stdin
        this.rl.on('line', async (line: string) => {
            try {
                const request: JsonRpcRequest = JSON.parse(line);
                const response = await this.handleRequest(request);
                this.sendResponse(response);
            } catch (error) {
                this.logToStderr(`Error processing request: ${error}`);
                // Send error response
                this.sendResponse({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32700,
                        message: 'Parse error',
                        data: error instanceof Error ? error.message : String(error)
                    }
                });
            }
        });

        this.rl.on('close', () => {
            this.logToStderr('MCP Server shutting down...');
            process.exit(0);
        });

        this.logToStderr('MCP Server ready to accept requests');
    }

    /**
     * Handle JSON-RPC request
     */
    private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
        const { id, method, params } = request;

        try {
            // Handle different MCP methods
            let result: any;

            switch (method) {
                case 'initialize':
                    result = await this.handler.handleInitialize(params);
                    break;

                case 'tools/list':
                    result = await this.handler.handleToolsList();
                    break;

                case 'tools/call':
                    result = await this.handler.handleToolCall(params);
                    break;

                default:
                    throw {
                        code: -32601,
                        message: `Method not found: ${method}`
                    };
            }

            return {
                jsonrpc: '2.0',
                id: id ?? null,
                result
            };

        } catch (error: any) {
            return {
                jsonrpc: '2.0',
                id: id ?? null,
                error: {
                    code: error.code || -32603,
                    message: error.message || 'Internal error',
                    data: error.data
                }
            };
        }
    }

    /**
     * Send response to stdout
     */
    private sendResponse(response: JsonRpcResponse): void {
        console.log(JSON.stringify(response));
    }

    /**
     * Log to stderr (stdout is reserved for JSON-RPC responses)
     */
    private logToStderr(message: string): void {
        console.error(`[MCP Server] ${message}`);
    }
}

// Start the server if run directly
if (require.main === module) {
    const server = new MCPStdioServer();
    server.start();
}

export { MCPStdioServer };
