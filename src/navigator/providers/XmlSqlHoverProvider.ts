/**
 * XML SQL Hover Provider
 * Shows composed SQL when hovering over statement id attributes
 */

import * as vscode from 'vscode';
import { composeSql } from '../core/SqlComposer';

/**
 * Provides hover information for SQL statements in XML files
 */
export class XmlSqlHoverProvider implements vscode.HoverProvider {
    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {
        // Get the line text
        const line = document.lineAt(position.line);
        const lineText = line.text;

        // Check if this line contains a statement tag (select, insert, update, delete)
        const statementRegex = /<(select|insert|update|delete)\s+[^>]*id\s*=\s*["']([^"']+)["']/i;
        const match = lineText.match(statementRegex);

        if (!match) {
            return null;
        }

        const statementId = match[2];

        // Check if cursor is on the id attribute value
        const idAttrRegex = /id\s*=\s*["']([^"']+)["']/i;
        const idMatch = lineText.match(idAttrRegex);

        if (!idMatch) {
            return null;
        }

        // Find the position of the id value
        const idValueIndex = lineText.indexOf(idMatch[1], lineText.indexOf('id='));
        const idValueEndIndex = idValueIndex + idMatch[1].length;

        // Check if cursor is within the id value range
        if (position.character < idValueIndex || position.character > idValueEndIndex) {
            return null;
        }

        // Compose the complete SQL
        const composedSql = await composeSql(document.uri.fsPath, statementId);

        if (!composedSql) {
            return null;
        }

        // Format the hover content
        const hoverContent = new vscode.MarkdownString();
        hoverContent.appendMarkdown(`**Composed SQL for \`${statementId}\`**\n\n`);
        hoverContent.appendCodeblock(composedSql, 'sql');
        hoverContent.isTrusted = true;

        return new vscode.Hover(hoverContent);
    }
}
