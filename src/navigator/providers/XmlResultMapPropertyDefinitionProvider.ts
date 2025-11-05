/**
 * Definition provider for navigating from XML resultMap property attributes to Java class fields
 * Handles navigation like: <result property="taskId"/> -> Java field declaration
 */

import * as vscode from 'vscode';

/**
 * Provides go-to-definition for property attributes in resultMap tags
 * Supports: <result>, <id>, <association>, <collection>
 */
export class XmlResultMapPropertyDefinitionProvider implements vscode.DefinitionProvider {
    // Tags that contain property attributes
    private readonly PROPERTY_TAGS = ['result', 'id', 'association', 'collection'];

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | null> {
        const line = document.lineAt(position.line).text;

        // Check if cursor is on property attribute value
        const propertyMatch = this.matchPropertyAttribute(line, position.character);
        if (!propertyMatch) {
            return null;
        }

        console.log(`[XmlResultMapPropertyDefinitionProvider] Found property: ${propertyMatch.propertyName}`);
        console.log(`[XmlResultMapPropertyDefinitionProvider] Cursor offset in XML: ${propertyMatch.cursorOffset}/${propertyMatch.propertyName.length}`);

        // Find the parent resultMap tag to get the type attribute
        const javaClassName = await this.findResultMapType(document, position.line);
        if (!javaClassName) {
            console.log('[XmlResultMapPropertyDefinitionProvider] No resultMap type found');
            return null;
        }

        console.log(`[XmlResultMapPropertyDefinitionProvider] Java class: ${javaClassName}`);

        // Find the Java class and field
        return this.findJavaField(javaClassName, propertyMatch);
    }

    /**
     * Match property attribute value at cursor position
     * Returns property name and cursor offset information
     */
    private matchPropertyAttribute(line: string, cursorPos: number): { propertyName: string; startColumn: number; endColumn: number; cursorOffset: number } | null {
        const regex = /property\s*=\s*["']([^"']+)["']/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const propertyValue = match[1];
            const matchStart = match.index;
            const propertyStart = matchStart + match[0].indexOf(propertyValue);
            const propertyEnd = propertyStart + propertyValue.length;

            // Check if cursor is within the property value
            if (cursorPos >= propertyStart && cursorPos <= propertyEnd) {
                return {
                    propertyName: propertyValue,
                    startColumn: propertyStart,
                    endColumn: propertyEnd,
                    cursorOffset: cursorPos - propertyStart
                };
            }
        }

        return null;
    }

    /**
     * Find the parent resultMap tag and extract type attribute
     * Searches backward from current position
     */
    private async findResultMapType(
        document: vscode.TextDocument,
        startLine: number
    ): Promise<string | null> {
        const text = document.getText();
        const lines = text.split('\n');

        // Search backward from current line to find <resultMap> tag
        let resultMapStartLine = -1;
        for (let i = startLine; i >= 0; i--) {
            const line = lines[i];

            // If we encounter a closing resultMap tag, stop searching
            if (line.includes('</resultMap>')) {
                break;
            }

            // Check if this line contains the opening resultMap tag
            if (/<resultMap\b/.test(line)) {
                resultMapStartLine = i;
                break;
            }
        }

        if (resultMapStartLine === -1) {
            return null;
        }

        // Now extract the entire resultMap opening tag (may span multiple lines)
        let resultMapTag = '';
        for (let i = resultMapStartLine; i < lines.length; i++) {
            const line = lines[i];
            resultMapTag += line + ' ';

            // Stop when we find the closing > of the opening tag
            if (line.includes('>')) {
                break;
            }
        }

        // Extract type attribute from the complete tag
        const typeMatch = resultMapTag.match(/type\s*=\s*["']([^"']+)["']/);
        return typeMatch ? typeMatch[1] : null;
    }

    /**
     * Find Java class and field by fully-qualified class name and field name
     * Maps cursor position proportionally from XML property to Java field
     */
    private async findJavaField(
        className: string,
        matchInfo: { propertyName: string; startColumn: number; endColumn: number; cursorOffset: number }
    ): Promise<vscode.Definition | null> {
        const fieldName = matchInfo.propertyName;

        // Handle primitive types and java.lang classes (skip navigation)
        if (this.isBuiltInType(className)) {
            return null;
        }

        // Convert fully-qualified class name to file path
        // Example: com.example.entity.User -> **/com/example/entity/User.java
        const pathPattern = className.replace(/\./g, '/') + '.java';
        const searchPattern = `**/${pathPattern}`;

        try {
            const files = await vscode.workspace.findFiles(
                searchPattern,
                '**/{ node_modules,target,.git,.vscode,.idea,.settings,build,dist,out,bin}/**',
                1 // Limit to first match
            );

            if (files.length === 0) {
                console.log(`[XmlResultMapPropertyDefinitionProvider] Java class not found: ${className}`);
                return null;
            }

            // Find the field declaration line
            const javaUri = files[0];
            const document = await vscode.workspace.openTextDocument(javaUri);
            const content = document.getText();
            const lines = content.split('\n');

            // Look for field declaration
            // Matches patterns like: private String taskId;
            //                    or: private String taskId = "default";
            //                    or: @NotNull
            //                        private String taskId;  (multi-line with annotations)
            const fieldRegex = new RegExp(
                `(?:private|protected|public)?\\s+\\w+(?:<[^>]+>)?\\s+${this.escapeRegex(fieldName)}\\s*[;=]`
            );

            // Track if we're in a class body
            let inClassBody = false;
            let braceLevel = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();

                // Track class boundaries
                if (/(?:class|interface|enum)\s+\w+/.test(line)) {
                    inClassBody = false; // Will become true when we see the opening brace
                }

                // Track brace level
                braceLevel += (line.match(/{/g) || []).length;
                braceLevel -= (line.match(/}/g) || []).length;

                // We're in class body if brace level is 1 (inside class but not in methods)
                if (braceLevel > 0) {
                    inClassBody = true;
                }

                // Skip if not in class body
                if (!inClassBody || braceLevel < 1) {
                    continue;
                }

                // Try to match field on current line
                if (fieldRegex.test(trimmedLine)) {
                    console.log(`[XmlResultMapPropertyDefinitionProvider] Found field at line ${i}`);

                    // Find the exact column position of the field name
                    const fieldNameRegex = new RegExp(`\\b${this.escapeRegex(fieldName)}\\b`);
                    const match = line.match(fieldNameRegex);

                    if (match && match.index !== undefined) {
                        const fieldStartColumn = match.index;
                        const fieldEndColumn = fieldStartColumn + fieldName.length;

                        // Map cursor position proportionally
                        const sourceLength = matchInfo.endColumn - matchInfo.startColumn;
                        const targetLength = fieldEndColumn - fieldStartColumn;

                        let targetColumn = fieldStartColumn;
                        if (sourceLength > 0 && targetLength > 0) {
                            const relativePosition = matchInfo.cursorOffset / sourceLength;
                            const mappedOffset = Math.floor(relativePosition * targetLength);
                            targetColumn = fieldStartColumn + Math.min(mappedOffset, targetLength);

                            console.log(`[XmlResultMapPropertyDefinitionProvider] Mapped offset: ${matchInfo.cursorOffset}/${sourceLength} -> ${mappedOffset}/${targetLength}`);
                        }

                        console.log(`[XmlResultMapPropertyDefinitionProvider] Field position: line ${i}, column ${targetColumn}`);
                        return new vscode.Location(javaUri, new vscode.Position(i, targetColumn));
                    }

                    // Fallback to line start if we can't find the exact position
                    return new vscode.Location(javaUri, new vscode.Position(i, 0));
                }
            }

            // If not found, return first line
            console.log(`[XmlResultMapPropertyDefinitionProvider] Field ${fieldName} not found in class`);
            return null;

        } catch (error) {
            console.error('[XmlResultMapPropertyDefinitionProvider] Error finding Java field:', error);
            return null;
        }
    }

    /**
     * Check if a class name is a built-in type that doesn't need navigation
     */
    private isBuiltInType(className: string): boolean {
        const primitives = ['int', 'long', 'double', 'float', 'boolean', 'byte', 'short', 'char'];
        const javaLang = [
            'java.lang.String',
            'java.lang.Integer',
            'java.lang.Long',
            'java.lang.Double',
            'java.lang.Float',
            'java.lang.Boolean',
            'java.lang.Byte',
            'java.lang.Short',
            'java.lang.Character',
            'java.lang.Object'
        ];

        return primitives.includes(className) || javaLang.includes(className);
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
