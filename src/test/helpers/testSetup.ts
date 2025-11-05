/**
 * Test Setup Helpers
 * Provides utilities for setting up test environments
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Creates a mock VS Code ExtensionContext for testing
 */
export function createMockContext(extensionPath: string): vscode.ExtensionContext {
    return {
        subscriptions: [],
        workspaceState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            keys: () => []
        },
        globalState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            setKeysForSync: () => {},
            keys: () => []
        },
        extensionPath: extensionPath,
        storagePath: path.join(extensionPath, '.storage'),
        globalStoragePath: path.join(extensionPath, '.global-storage'),
        logPath: path.join(extensionPath, '.log'),
        extensionUri: vscode.Uri.file(extensionPath),
        environmentVariableCollection: {
            persistent: true,
            description: 'test',
            replace: () => {},
            append: () => {},
            prepend: () => {},
            get: () => undefined,
            forEach: () => {},
            delete: () => {},
            clear: () => {},
            [Symbol.iterator]: function* () {}
        } as any,
        extensionMode: vscode.ExtensionMode.Test,
        storageUri: vscode.Uri.file(path.join(extensionPath, '.storage')),
        globalStorageUri: vscode.Uri.file(path.join(extensionPath, '.global-storage')),
        logUri: vscode.Uri.file(path.join(extensionPath, '.log')),
        asAbsolutePath: (relativePath: string) => path.join(extensionPath, relativePath),
        secrets: {
            get: () => Promise.resolve(undefined),
            store: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
        },
        extension: {
            id: 'young1lin.mybatis-boost',
            extensionUri: vscode.Uri.file(extensionPath),
            extensionPath: extensionPath,
            isActive: true,
            packageJSON: {},
            extensionKind: vscode.ExtensionKind.Workspace,
            exports: undefined,
            activate: () => Promise.resolve(undefined)
        },
        languageModelAccessInformation: {
            onDidChange: new vscode.EventEmitter<void>().event,
            canSendRequest: () => undefined
        }
    } as unknown as vscode.ExtensionContext;
}


/**
 * Waits for a specified amount of time
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Opens a document and returns it
 */
export async function openDocument(filePath: string): Promise<vscode.TextDocument> {
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
    return doc;
}

/**
 * Finds the position of a text pattern in a document
 */
export function findPositionInDocument(doc: vscode.TextDocument, pattern: string | RegExp): vscode.Position | null {
    const content = doc.getText();
    let index: number;

    if (typeof pattern === 'string') {
        index = content.indexOf(pattern);
    } else {
        const match = content.match(pattern);
        index = match ? match.index! : -1;
    }

    if (index === -1) {
        return null;
    }

    return doc.positionAt(index);
}

/**
 * Executes a definition provider and returns the result
 */
export async function executeDefinitionProvider(
    uri: vscode.Uri,
    position: vscode.Position
): Promise<vscode.Location[]> {
    const result = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeDefinitionProvider',
        uri,
        position
    );
    return result || [];
}
