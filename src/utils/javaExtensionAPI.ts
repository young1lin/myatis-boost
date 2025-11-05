/**
 * Java Extension API integration
 * Provides utilities for interacting with Java language server
 */

import * as vscode from 'vscode';

export interface JavaExtensionAPI {
    serverReady(): Promise<void>;
    getClasspaths(uri: string): Promise<string[]>;
    getProjects(uri: string): Promise<any[]>;
}

/**
 * Get Java extension API if available
 */
export async function getJavaExtensionAPI(): Promise<JavaExtensionAPI | null> {
    try {
        const javaExtension = vscode.extensions.getExtension('redhat.java');

        if (!javaExtension) {
            return null;
        }

        if (!javaExtension.isActive) {
            await javaExtension.activate();
        }

        return javaExtension.exports as JavaExtensionAPI;
    } catch (error) {
        console.warn('[JavaExtensionAPI] Failed to load Java extension:', error);
        return null;
    }
}

/**
 * Wait for Java language server to be ready
 */
export async function waitForJavaServer(timeoutMs: number = 30000): Promise<boolean> {
    const api = await getJavaExtensionAPI();

    if (!api) {
        return false;
    }

    try {
        await Promise.race([
            api.serverReady(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), timeoutMs)
            )
        ]);
        return true;
    } catch (error) {
        console.warn('[JavaExtensionAPI] Java server not ready:', error);
        return false;
    }
}
