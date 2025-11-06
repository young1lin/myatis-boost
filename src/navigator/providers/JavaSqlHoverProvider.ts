/**
 * Java SQL Hover Provider
 * Shows composed SQL when hovering over mapper method names
 */

import * as vscode from 'vscode';
import { FileMapper } from '../core/FileMapper';
import { composeSql } from '../core/SqlComposer';
import { extractJavaMethods } from '../parsers/javaParser';

/**
 * Provides hover information for mapper methods in Java files
 */
export class JavaSqlHoverProvider implements vscode.HoverProvider {
    constructor(private fileMapper: FileMapper) {}

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {
        // Extract all methods from the Java file
        const methods = await extractJavaMethods(document.uri.fsPath);

        // Find the method at the cursor position
        const method = methods.find(m => {
            return m.line === position.line &&
                   position.character >= m.startColumn &&
                   position.character <= m.endColumn;
        });

        if (!method) {
            return null;
        }

        const methodName = method.name;

        // Get the corresponding XML file
        const xmlPath = await this.fileMapper.getXmlPath(document.uri.fsPath);

        if (!xmlPath) {
            return null;
        }

        // Compose the complete SQL
        const composedSql = await composeSql(xmlPath, methodName);

        if (!composedSql) {
            return null;
        }

        // Format the hover content
        const hoverContent = new vscode.MarkdownString();
        hoverContent.appendMarkdown(`**Composed SQL for \`${methodName}\`**\n\n`);
        hoverContent.appendCodeblock(composedSql, 'sql');
        hoverContent.isTrusted = true;

        return new vscode.Hover(hoverContent);
    }
}
