/**
 * Definition provider for resultMap references within XML
 * Handles resultMap="xxx" -> <resultMap id="xxx"> navigation
 */

import * as vscode from 'vscode';

/**
 * Provides go-to-definition for resultMap references
 * 1. resultMap="xxx" -> <resultMap id="xxx">
 * 2. <resultMap id="xxx"> -> all references with resultMap="xxx"
 */
export class XmlResultMapDefinitionProvider implements vscode.DefinitionProvider {

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | vscode.LocationLink[] | null> {
        const line = document.lineAt(position.line).text;

        // Check if cursor is on resultMap attribute (e.g., resultMap="PermissionResultMap")
        const resultMapRefMatch = this.matchResultMapReference(line, position.character);
        if (resultMapRefMatch) {
            console.log(`[XmlResultMapDefinitionProvider] Found resultMap reference: ${resultMapRefMatch.id} at offset ${resultMapRefMatch.cursorOffset}`);
            return this.findResultMapDefinition(document, resultMapRefMatch);
        }

        // Check if cursor is on id attribute in <resultMap> tag
        const resultMapIdMatch = this.matchResultMapId(line, position.character);
        if (resultMapIdMatch) {
            console.log(`[XmlResultMapDefinitionProvider] Found resultMap id: ${resultMapIdMatch.id} at offset ${resultMapIdMatch.cursorOffset}`);
            return this.findAllResultMapReferences(document, resultMapIdMatch);
        }

        return null;
    }

    /**
     * Match resultMap attribute value (e.g., resultMap="xxx")
     * Returns id value and cursor position information
     */
    private matchResultMapReference(line: string, cursorPos: number): { id: string; startColumn: number; endColumn: number; cursorOffset: number } | null {
        const regex = /resultMap\s*=\s*["']([^"']+)["']/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const resultMapId = match[1];
            const matchStart = match.index;
            const resultMapStart = matchStart + match[0].indexOf(resultMapId);
            const resultMapEnd = resultMapStart + resultMapId.length;

            if (cursorPos >= resultMapStart && cursorPos <= resultMapEnd) {
                return {
                    id: resultMapId,
                    startColumn: resultMapStart,
                    endColumn: resultMapEnd,
                    cursorOffset: cursorPos - resultMapStart
                };
            }
        }

        return null;
    }

    /**
     * Match id attribute in <resultMap> tag
     * Returns id value and cursor position information
     */
    private matchResultMapId(line: string, cursorPos: number): { id: string; startColumn: number; endColumn: number; cursorOffset: number } | null {
        const regex = /<resultMap[^>]+id\s*=\s*["']([^"']+)["']/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const resultMapId = match[1];
            const matchStart = match.index;
            const resultMapIdStart = matchStart + match[0].indexOf(resultMapId);
            const resultMapIdEnd = resultMapIdStart + resultMapId.length;

            if (cursorPos >= resultMapIdStart && cursorPos <= resultMapIdEnd) {
                return {
                    id: resultMapId,
                    startColumn: resultMapIdStart,
                    endColumn: resultMapIdEnd,
                    cursorOffset: cursorPos - resultMapIdStart
                };
            }
        }

        return null;
    }

    /**
     * Find <resultMap id="xxx"> definition in the document with cursor position mapping
     */
    private findResultMapDefinition(
        document: vscode.TextDocument,
        matchInfo: { id: string; startColumn: number; endColumn: number; cursorOffset: number }
    ): vscode.Location | null {
        const text = document.getText();
        const lines = text.split('\n');
        const resultMapId = matchInfo.id;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match <resultMap id="resultMapId">
            const regex = new RegExp(`<resultMap[^>]+id\\s*=\\s*["']${this.escapeRegex(resultMapId)}["']`);
            const match = line.match(regex);

            if (match) {
                console.log(`[XmlResultMapDefinitionProvider] Found resultMap definition at line ${i}`);

                // Find the exact position of the id value in the target line
                const idAttrMatch = line.match(new RegExp(`id\\s*=\\s*["']${this.escapeRegex(resultMapId)}["']`));
                if (idAttrMatch) {
                    const idAttrStart = line.indexOf(idAttrMatch[0]);
                    // Find the opening quote
                    const quotePos = line.indexOf('"', idAttrStart) !== -1
                        ? line.indexOf('"', idAttrStart)
                        : line.indexOf("'", idAttrStart);

                    if (quotePos >= 0) {
                        const targetStartColumn = quotePos + 1;
                        const targetEndColumn = targetStartColumn + resultMapId.length;

                        // Map cursor position proportionally
                        const sourceLength = matchInfo.endColumn - matchInfo.startColumn;
                        const targetLength = targetEndColumn - targetStartColumn;

                        let targetColumn = targetStartColumn;
                        if (sourceLength > 0) {
                            const relativePosition = matchInfo.cursorOffset / sourceLength;
                            const mappedOffset = Math.floor(relativePosition * targetLength);
                            targetColumn = targetStartColumn + Math.min(mappedOffset, targetLength);

                            console.log(`[XmlResultMapDefinitionProvider] Cursor offset in source: ${matchInfo.cursorOffset}/${sourceLength}`);
                            console.log(`[XmlResultMapDefinitionProvider] Mapped to target offset: ${mappedOffset}/${targetLength}`);
                        }

                        return new vscode.Location(document.uri, new vscode.Position(i, targetColumn));
                    }
                }

                // Fallback to line start if we couldn't find the exact position
                return new vscode.Location(document.uri, new vscode.Position(i, 0));
            }
        }

        console.log(`[XmlResultMapDefinitionProvider] ResultMap ${resultMapId} not found`);
        return null;
    }

    /**
     * Find all resultMap="xxx" references in the document with cursor position mapping
     */
    private findAllResultMapReferences(
        document: vscode.TextDocument,
        matchInfo: { id: string; startColumn: number; endColumn: number; cursorOffset: number }
    ): vscode.Location[] {
        const text = document.getText();
        const lines = text.split('\n');
        const locations: vscode.Location[] = [];
        const resultMapId = matchInfo.id;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Match resultMap="resultMapId" (but not in <resultMap> tag itself)
            if (!line.includes('<resultMap')) {
                const regex = new RegExp(`resultMap\\s*=\\s*["']${this.escapeRegex(resultMapId)}["']`);
                const match = line.match(regex);

                if (match) {
                    console.log(`[XmlResultMapDefinitionProvider] Found resultMap reference at line ${i}`);

                    // Find the exact position of the resultMap value in this line
                    const resultMapAttrMatch = line.match(new RegExp(`resultMap\\s*=\\s*["']${this.escapeRegex(resultMapId)}["']`));
                    if (resultMapAttrMatch) {
                        const resultMapAttrStart = line.indexOf(resultMapAttrMatch[0]);
                        // Find the opening quote
                        const quotePos = line.indexOf('"', resultMapAttrStart) !== -1
                            ? line.indexOf('"', resultMapAttrStart)
                            : line.indexOf("'", resultMapAttrStart);

                        if (quotePos >= 0) {
                            const targetStartColumn = quotePos + 1;
                            const targetEndColumn = targetStartColumn + resultMapId.length;

                            // Map cursor position proportionally
                            const sourceLength = matchInfo.endColumn - matchInfo.startColumn;
                            const targetLength = targetEndColumn - targetStartColumn;

                            let targetColumn = targetStartColumn;
                            if (sourceLength > 0) {
                                const relativePosition = matchInfo.cursorOffset / sourceLength;
                                const mappedOffset = Math.floor(relativePosition * targetLength);
                                targetColumn = targetStartColumn + Math.min(mappedOffset, targetLength);

                                console.log(`[XmlResultMapDefinitionProvider] Cursor offset in resultMap id: ${matchInfo.cursorOffset}/${sourceLength}`);
                                console.log(`[XmlResultMapDefinitionProvider] Mapped to reference offset: ${mappedOffset}/${targetLength}`);
                            }

                            locations.push(new vscode.Location(document.uri, new vscode.Position(i, targetColumn)));
                            continue;
                        }
                    }

                    // Fallback to line start if we couldn't find the exact position
                    locations.push(new vscode.Location(document.uri, new vscode.Position(i, 0)));
                }
            }
        }

        console.log(`[XmlResultMapDefinitionProvider] Found ${locations.length} references to ${resultMapId}`);
        return locations.length > 0 ? locations : [];
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
