/**
 * Definition provider for SQL fragment references within XML
 * Handles <include refid="xxx"> -> <sql id="xxx"> navigation
 */

import * as vscode from 'vscode';

/**
 * Provides go-to-definition for SQL fragment references
 * 1. <include refid="xxx"> -> <sql id="xxx"> with cursor position mapping
 * 2. <sql id="xxx"> -> all <include refid="xxx"> (shows all references)
 */
export class XmlSqlFragmentDefinitionProvider implements vscode.DefinitionProvider {

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | vscode.LocationLink[] | null> {
        const line = document.lineAt(position.line).text;

        // Check if cursor is on refid attribute in <include> tag
        const includeMatch = this.matchIncludeRefId(line, position.character);
        if (includeMatch) {
            console.log(`[XmlSqlFragmentDefinitionProvider] Found include refid: ${includeMatch.id} at offset ${includeMatch.cursorOffset}`);
            return this.findSqlFragmentDefinition(document, includeMatch);
        }

        // Check if cursor is on id attribute in <sql> tag
        const sqlIdMatch = this.matchSqlId(line, position.character);
        if (sqlIdMatch) {
            console.log(`[XmlSqlFragmentDefinitionProvider] Found sql id: ${sqlIdMatch.id} at offset ${sqlIdMatch.cursorOffset}`);
            return this.findAllIncludeReferences(document, sqlIdMatch);
        }

        return null;
    }

    /**
     * Match refid attribute in <include> tag
     * Returns id value and cursor position information
     */
    private matchIncludeRefId(line: string, cursorPos: number): { id: string; startColumn: number; endColumn: number; cursorOffset: number } | null {
        const regex = /<include[^>]+refid\s*=\s*["']([^"']+)["']/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const refId = match[1];
            const matchStart = match.index;
            const refIdStart = matchStart + match[0].indexOf(refId);
            const refIdEnd = refIdStart + refId.length;

            if (cursorPos >= refIdStart && cursorPos <= refIdEnd) {
                return {
                    id: refId,
                    startColumn: refIdStart,
                    endColumn: refIdEnd,
                    cursorOffset: cursorPos - refIdStart
                };
            }
        }

        return null;
    }

    /**
     * Match id attribute in <sql> tag
     * Returns id value and cursor position information
     */
    private matchSqlId(line: string, cursorPos: number): { id: string; startColumn: number; endColumn: number; cursorOffset: number } | null {
        const regex = /<sql[^>]+id\s*=\s*["']([^"']+)["']/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const sqlId = match[1];
            const matchStart = match.index;
            const sqlIdStart = matchStart + match[0].indexOf(sqlId);
            const sqlIdEnd = sqlIdStart + sqlId.length;

            if (cursorPos >= sqlIdStart && cursorPos <= sqlIdEnd) {
                return {
                    id: sqlId,
                    startColumn: sqlIdStart,
                    endColumn: sqlIdEnd,
                    cursorOffset: cursorPos - sqlIdStart
                };
            }
        }

        return null;
    }

    /**
     * Find <sql id="xxx"> definition in the document with cursor position mapping
     */
    private findSqlFragmentDefinition(
        document: vscode.TextDocument,
        matchInfo: { id: string; startColumn: number; endColumn: number; cursorOffset: number }
    ): vscode.Location | null {
        const text = document.getText();
        const lines = text.split('\n');
        const fragmentId = matchInfo.id;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match <sql id="fragmentId">
            const regex = new RegExp(`<sql[^>]+id\\s*=\\s*["']${this.escapeRegex(fragmentId)}["']`);
            const match = line.match(regex);

            if (match) {
                console.log(`[XmlSqlFragmentDefinitionProvider] Found sql fragment at line ${i}`);

                // Find the exact position of the id value in the target line
                const idAttrMatch = line.match(new RegExp(`id\\s*=\\s*["']${this.escapeRegex(fragmentId)}["']`));
                if (idAttrMatch) {
                    const idAttrStart = line.indexOf(idAttrMatch[0]);
                    // Find the opening quote
                    const quotePos = line.indexOf('"', idAttrStart) !== -1
                        ? line.indexOf('"', idAttrStart)
                        : line.indexOf("'", idAttrStart);

                    if (quotePos >= 0) {
                        const targetStartColumn = quotePos + 1;
                        const targetEndColumn = targetStartColumn + fragmentId.length;

                        // Map cursor position proportionally
                        const sourceLength = matchInfo.endColumn - matchInfo.startColumn;
                        const targetLength = targetEndColumn - targetStartColumn;

                        let targetColumn = targetStartColumn;
                        if (sourceLength > 0) {
                            const relativePosition = matchInfo.cursorOffset / sourceLength;
                            const mappedOffset = Math.floor(relativePosition * targetLength);
                            targetColumn = targetStartColumn + Math.min(mappedOffset, targetLength);

                            console.log(`[XmlSqlFragmentDefinitionProvider] Cursor offset in source: ${matchInfo.cursorOffset}/${sourceLength}`);
                            console.log(`[XmlSqlFragmentDefinitionProvider] Mapped to target offset: ${mappedOffset}/${targetLength}`);
                        }

                        return new vscode.Location(document.uri, new vscode.Position(i, targetColumn));
                    }
                }

                // Fallback to line start if we couldn't find the exact position
                return new vscode.Location(document.uri, new vscode.Position(i, 0));
            }
        }

        console.log(`[XmlSqlFragmentDefinitionProvider] SQL fragment ${fragmentId} not found`);
        return null;
    }

    /**
     * Find all <include refid="xxx"> references in the document with cursor position mapping
     */
    private findAllIncludeReferences(
        document: vscode.TextDocument,
        matchInfo: { id: string; startColumn: number; endColumn: number; cursorOffset: number }
    ): vscode.Location[] {
        const text = document.getText();
        const lines = text.split('\n');
        const locations: vscode.Location[] = [];
        const fragmentId = matchInfo.id;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match <include refid="fragmentId">
            const regex = new RegExp(`<include[^>]+refid\\s*=\\s*["']${this.escapeRegex(fragmentId)}["']`);
            const match = line.match(regex);

            if (match) {
                console.log(`[XmlSqlFragmentDefinitionProvider] Found include reference at line ${i}`);

                // Find the exact position of the refid value in this line
                const refidAttrMatch = line.match(new RegExp(`refid\\s*=\\s*["']${this.escapeRegex(fragmentId)}["']`));
                if (refidAttrMatch) {
                    const refidAttrStart = line.indexOf(refidAttrMatch[0]);
                    // Find the opening quote
                    const quotePos = line.indexOf('"', refidAttrStart) !== -1
                        ? line.indexOf('"', refidAttrStart)
                        : line.indexOf("'", refidAttrStart);

                    if (quotePos >= 0) {
                        const targetStartColumn = quotePos + 1;
                        const targetEndColumn = targetStartColumn + fragmentId.length;

                        // Map cursor position proportionally
                        const sourceLength = matchInfo.endColumn - matchInfo.startColumn;
                        const targetLength = targetEndColumn - targetStartColumn;

                        let targetColumn = targetStartColumn;
                        if (sourceLength > 0) {
                            const relativePosition = matchInfo.cursorOffset / sourceLength;
                            const mappedOffset = Math.floor(relativePosition * targetLength);
                            targetColumn = targetStartColumn + Math.min(mappedOffset, targetLength);

                            console.log(`[XmlSqlFragmentDefinitionProvider] Cursor offset in sql id: ${matchInfo.cursorOffset}/${sourceLength}`);
                            console.log(`[XmlSqlFragmentDefinitionProvider] Mapped to include refid offset: ${mappedOffset}/${targetLength}`);
                        }

                        locations.push(new vscode.Location(document.uri, new vscode.Position(i, targetColumn)));
                        continue;
                    }
                }

                // Fallback to line start if we couldn't find the exact position
                locations.push(new vscode.Location(document.uri, new vscode.Position(i, 0)));
            }
        }

        console.log(`[XmlSqlFragmentDefinitionProvider] Found ${locations.length} references to ${fragmentId}`);
        return locations.length > 0 ? locations : [];
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
