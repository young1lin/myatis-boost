/**
 * Tool: Query generation history
 */

import * as vscode from 'vscode';
import { GenerateReuslt } from '../../generator/type';

interface QueryHistoryInput {
    limit?: number;
}

/**
 * History record structure
 */
interface HistoryRecord {
    timestamp: number;
    ddl: string;
    results: GenerateReuslt[];
}

const MAX_HISTORY_SIZE = 30;
const MCP_HISTORY_STORAGE_KEY = 'mybatis-boost.mcp.history';

/**
 * Tool for querying generation history
 */
export class QueryGenerationHistoryTool implements vscode.LanguageModelTool<QueryHistoryInput> {

    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<QueryHistoryInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {

        if (token.isCancellationRequested) {
            throw new Error('Operation cancelled');
        }

        const limit = Math.min(options.input.limit || 10, MAX_HISTORY_SIZE);
        const history = this.getHistory();
        const limitedHistory = history.slice(0, limit);

        const historyData = limitedHistory.map(record => ({
            timestamp: record.timestamp,
            timestampFormatted: new Date(record.timestamp).toISOString(),
            ddl: record.ddl,
            filesCount: record.results.length,
            files: record.results.map(r => ({
                name: r.name,
                outputPath: r.outputPath,
                type: r.type,
                contentPreview: r.content.substring(0, 200) + '...'
            }))
        }));

        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify({
                success: true,
                totalRecords: history.length,
                returnedRecords: limitedHistory.length,
                history: historyData
            }, null, 2))
        ]);
    }

    /**
     * Get history records from GlobalState
     */
    private getHistory(): HistoryRecord[] {
        return this.context.globalState.get<HistoryRecord[]>(MCP_HISTORY_STORAGE_KEY, []);
    }
}
