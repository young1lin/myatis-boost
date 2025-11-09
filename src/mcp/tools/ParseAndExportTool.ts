/**
 * Tool: Parse SQL and immediately export (combined operation)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseDDLWithConfig } from '../../generator/vscodeHelper';
import { CodeGenerator, GeneratorConfig } from '../../generator/template/templateGenerator';
import { GenerateReuslt } from '../../generator/type';

interface ParseAndExportInput {
    ddl: string;
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
 * Tool for parsing SQL and immediately exporting files (combined operation)
 */
export class ParseAndExportTool implements vscode.LanguageModelTool<ParseAndExportInput> {

    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ParseAndExportInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {

        if (token.isCancellationRequested) {
            throw new Error('Operation cancelled');
        }

        const { ddl } = options.input;

        try {
            // Step 1: Parse DDL
            const parseResult = parseDDLWithConfig(ddl);

            if (!parseResult.success || !parseResult.data) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        success: false,
                        error: parseResult.error?.message || 'Failed to parse DDL'
                    }, null, 2))
                ]);
            }

            // Load configuration
            const config = this.loadConfiguration();

            // Step 2: Generate code
            const generator = new CodeGenerator(config, parseResult.data);

            const templateDir = path.join(__dirname, '..', '..', 'generator', 'template');

            const results = [
                generator.generateEntity(path.join(templateDir, 'entity.ejs')),
                generator.generateMapper(path.join(templateDir, 'mapper.ejs')),
                generator.generateMapperXml(path.join(templateDir, 'mapper-xml.ejs')),
                generator.generateService(path.join(templateDir, 'service.ejs'))
            ];

            // Step 3: Export files
            const exportedFiles: string[] = [];

            for (const result of results) {
                // Ensure directory exists
                const dir = path.dirname(result.outputPath);
                await fs.promises.mkdir(dir, { recursive: true });

                // Write file
                await fs.promises.writeFile(result.outputPath, result.content, 'utf-8');
                exportedFiles.push(result.outputPath);
            }

            // Step 4: Save to history
            await this.saveHistoryRecord(ddl, results);

            // Show success notification
            vscode.window.showInformationMessage(
                `Successfully parsed and exported ${results.length} files via Language Model Tool`
            );

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({
                    success: true,
                    exportedFiles,
                    message: `Successfully parsed and exported ${results.length} files`
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
     * Load configuration from VS Code settings
     */
    private loadConfiguration(): GeneratorConfig {
        const config = vscode.workspace.getConfiguration('mybatis-boost.generator');

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const outputDir = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath
            : '';

        return {
            basePackage: config.get<string>('basePackage', 'com.example.mybatis'),
            author: config.get<string>('author', 'MyBatis Boost'),
            outputDir: outputDir,
            useLombok: config.get<boolean>('useLombok', true),
            useSwagger: config.get<boolean>('useSwagger', false),
            useSwaggerV3: config.get<boolean>('useSwaggerV3', false),
            useMyBatisPlus: config.get<boolean>('useMyBatisPlus', false),
            entitySuffix: config.get<string>('entitySuffix', 'PO'),
            mapperSuffix: config.get<string>('mapperSuffix', 'Mapper'),
            serviceSuffix: config.get<string>('serviceSuffix', 'Service')
        };
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
