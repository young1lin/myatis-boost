/**
 * Tool: Parse SQL and generate MyBatis code
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { parseDDLWithConfig } from '../../generator/vscodeHelper';
import { CodeGenerator, GeneratorConfig } from '../../generator/template/templateGenerator';

interface ParseSqlInput {
    ddl: string;
}

/**
 * Tool for parsing SQL DDL and generating MyBatis code
 */
export class ParseSqlAndGenerateTool implements vscode.LanguageModelTool<ParseSqlInput> {

    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<ParseSqlInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {

        if (token.isCancellationRequested) {
            throw new Error('Operation cancelled');
        }

        const { ddl } = options.input;

        // Parse DDL
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

        // Generate code (in memory only)
        const generator = new CodeGenerator(config, parseResult.data);

        const templateDir = path.join(__dirname, '..', '..', 'generator', 'template');

        const results = [
            generator.generateEntity(path.join(templateDir, 'entity.ejs')),
            generator.generateMapper(path.join(templateDir, 'mapper.ejs')),
            generator.generateMapperXml(path.join(templateDir, 'mapper-xml.ejs')),
            generator.generateService(path.join(templateDir, 'service.ejs'))
        ];

        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify({
                success: true,
                results: results.map(r => ({
                    name: r.name,
                    outputPath: r.outputPath,
                    content: r.content,
                    type: r.type
                }))
            }, null, 2))
        ]);
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
}
