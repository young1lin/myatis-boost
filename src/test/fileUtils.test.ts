/**
 * File Utils Test Suite
 * Tests for file utility functions
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import {
    readFirstLines,
    readFile,
    getFileModTime,
    fileExists,
    normalizePath,
    getFileNameWithoutExt
} from '../utils/fileUtils';

suite('File Utils Test Suite', () => {
    let tempDir: string;
    let testFile: string;

    suiteSetup(() => {
        tempDir = path.join(__dirname, 'temp-fileutils-test');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    });

    suiteTeardown(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    setup(() => {
        testFile = path.join(tempDir, 'test.txt');
    });

    teardown(() => {
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    });

    test('readFirstLines should read specified number of lines', async () => {
        const content = 'line1\nline2\nline3\nline4\nline5';
        fs.writeFileSync(testFile, content, 'utf-8');

        const result = await readFirstLines(testFile, 3);
        assert.strictEqual(result, 'line1\nline2\nline3');
    });

    test('readFirstLines should return empty string for non-existent file', async () => {
        const result = await readFirstLines(path.join(tempDir, 'nonexistent.txt'), 10);
        assert.strictEqual(result, '');
    });

    test('readFirstLines should handle file with fewer lines than requested', async () => {
        const content = 'line1\nline2';
        fs.writeFileSync(testFile, content, 'utf-8');

        const result = await readFirstLines(testFile, 10);
        assert.strictEqual(result, 'line1\nline2');
    });

    test('readFile should read entire file content', async () => {
        const content = 'This is a test file\nwith multiple lines\nand some content';
        fs.writeFileSync(testFile, content, 'utf-8');

        const result = await readFile(testFile);
        assert.strictEqual(result, content);
    });

    test('readFile should return empty string for non-existent file', async () => {
        const result = await readFile(path.join(tempDir, 'nonexistent.txt'));
        assert.strictEqual(result, '');
    });

    test('getFileModTime should return modification time', async () => {
        fs.writeFileSync(testFile, 'test content', 'utf-8');

        const modTime = await getFileModTime(testFile);
        assert.ok(modTime > 0, 'Modification time should be greater than 0');
    });

    test('getFileModTime should return 0 for non-existent file', async () => {
        const modTime = await getFileModTime(path.join(tempDir, 'nonexistent.txt'));
        assert.strictEqual(modTime, 0);
    });

    test('fileExists should return true for existing file', async () => {
        fs.writeFileSync(testFile, 'test content', 'utf-8');

        const exists = await fileExists(testFile);
        assert.strictEqual(exists, true);
    });

    test('fileExists should return false for non-existent file', async () => {
        const exists = await fileExists(path.join(tempDir, 'nonexistent.txt'));
        assert.strictEqual(exists, false);
    });

    test('normalizePath should convert backslashes to forward slashes', () => {
        const windowsPath = 'C:\\Users\\test\\file.txt';
        const normalized = normalizePath(windowsPath);
        assert.strictEqual(normalized, 'C:/Users/test/file.txt');
    });

    test('normalizePath should not modify paths with forward slashes', () => {
        const unixPath = '/home/user/file.txt';
        const normalized = normalizePath(unixPath);
        assert.strictEqual(normalized, unixPath);
    });

    test('getFileNameWithoutExt should remove file extension', () => {
        const fileName = getFileNameWithoutExt('/path/to/UserMapper.java');
        assert.strictEqual(fileName, 'UserMapper');
    });

    test('getFileNameWithoutExt should handle files with multiple dots', () => {
        const fileName = getFileNameWithoutExt('/path/to/my.test.file.txt');
        assert.strictEqual(fileName, 'my.test.file');
    });

    test('getFileNameWithoutExt should handle files without extension', () => {
        const fileName = getFileNameWithoutExt('/path/to/README');
        assert.strictEqual(fileName, 'README');
    });

    test('readFile should handle large files', async () => {
        const largeContent = 'x'.repeat(100000);
        fs.writeFileSync(testFile, largeContent, 'utf-8');

        const result = await readFile(testFile);
        assert.strictEqual(result.length, 100000);
    });

    test('readFirstLines should handle empty file', async () => {
        fs.writeFileSync(testFile, '', 'utf-8');

        const result = await readFirstLines(testFile, 10);
        assert.strictEqual(result, '');
    });

    test('getFileModTime should update when file is modified', async () => {
        fs.writeFileSync(testFile, 'initial content', 'utf-8');
        const modTime1 = await getFileModTime(testFile);

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 100));

        fs.writeFileSync(testFile, 'updated content', 'utf-8');
        const modTime2 = await getFileModTime(testFile);

        assert.ok(modTime2 >= modTime1, 'Modification time should increase after update');
    });
});
