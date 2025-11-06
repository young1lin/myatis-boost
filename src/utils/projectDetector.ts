/**
 * Project detection utilities
 * These functions contain pure logic that can be unit tested without VS Code API
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Type for file existence check function (for dependency injection in tests)
 */
export type FileExistsFn = (filePath: string) => boolean;

/**
 * Walk up the directory tree to find Java project indicator files (pom.xml, build.gradle, etc.)
 * @param startPath The starting directory path
 * @param maxLevels Maximum number of parent directories to search (default: 10)
 * @param fileExists Function to check file existence (default: fs.existsSync, injectable for testing)
 * @returns The path to the found project file, or null if not found
 */
export function findProjectFileInParents(
    startPath: string,
    maxLevels: number = 10,
    fileExists: FileExistsFn = fs.existsSync
): string | null {
    let currentPath = startPath;

    // Search up to maxLevels to prevent infinite recursion
    for (let i = 0; i < maxLevels; i++) {
        const indicators = [
            path.join(currentPath, 'pom.xml'),
            path.join(currentPath, 'build.gradle'),
            path.join(currentPath, 'build.gradle.kts'),
        ];

        for (const indicator of indicators) {
            if (fileExists(indicator)) {
                return indicator;
            }
        }

        // Move to parent directory
        const parent = path.dirname(currentPath);
        // Stop if we've reached the filesystem root
        if (parent === currentPath) {
            break;
        }
        currentPath = parent;
    }

    return null;
}

/**
 * Check if a directory contains Java project indicator files
 * This is a simpler check that only looks in the specified directory
 * @param directoryPath The directory to check
 * @param fileExists Function to check file existence (default: fs.existsSync, injectable for testing)
 * @returns true if any project indicator file is found
 */
export function hasProjectFiles(directoryPath: string, fileExists: FileExistsFn = fs.existsSync): boolean {
    const indicators = [
        path.join(directoryPath, 'pom.xml'),
        path.join(directoryPath, 'build.gradle'),
        path.join(directoryPath, 'build.gradle.kts'),
        path.join(directoryPath, 'src', 'main', 'java')
    ];

    return indicators.some(indicator => fileExists(indicator));
}
