/**
 * Tool: Export generated files to disk
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GenerateReuslt } from '../../generator/type';

interface ExportFilesInput {
    ddl: string;
    results: Array<{
        name: string;
        outputPath: string;
        content: string;
        type: 'java' | 'xml';
    }>;
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
 * Tool for exporting generated files to disk
 */
export class ExportGeneratedFilesTool implements vscode.LanguageModelTool<ExportFilesInput> {

    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ExportFilesInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {

        if (token.isCancellationRequested) {
            throw new Error('Operation cancelled');
        }

        const { ddl, results } = options.input;

        if (!results || !Array.isArray(results)) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({
                    success: false,
                    error: 'Invalid results format: expected an array'
                }, null, 2))
            ]);
        }

        const exportedFiles: string[] = [];

        try {
            // Write files to disk
            for (const result of results) {
                // Ensure directory exists
                const dir = path.dirname(result.outputPath);
                await fs.promises.mkdir(dir, { recursive: true });

                // Write file
                await fs.promises.writeFile(result.outputPath, result.content, 'utf-8');
                exportedFiles.push(result.outputPath);
            }

            // Save to history
            await this.saveHistoryRecord(ddl, results as GenerateReuslt[]);

            // Show success notification
            vscode.window.showInformationMessage(
                `Successfully exported ${results.length} files via Language Model Tool`
            );

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({
                    success: true,
                    exportedFiles,
                    message: `Successfully exported ${results.length} files`
                }, null, 2))
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error occurred'
                }, null, 2))
            ]);
        }
    }

    /**
     * Save history record to GlobalState
     */
    private async saveHistoryRecord(ddl: string, results: GenerateReuslt[]): Promise<void> {
        let history = this.getHistory();

        // Add new record
        history.unshift({
            timestamp: Date.now(),
            ddl,
            results
        });

        // Keep only latest MAX_HISTORY_SIZE records
        if (history.length > MAX_HISTORY_SIZE) {
            history = history.slice(0, MAX_HISTORY_SIZE);
        }

        await this.context.globalState.update(MCP_HISTORY_STORAGE_KEY, history);
    }

    /**
     * Get history records from GlobalState
     */
    private getHistory(): HistoryRecord[] {
        return this.context.globalState.get<HistoryRecord[]>(MCP_HISTORY_STORAGE_KEY, []);
    }
}
