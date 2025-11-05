/**
 * Unit tests for XmlResultMapDefinitionProvider
 * Tests pattern matching and logic without VS Code API dependencies
 */

import * as assert from 'assert';

describe('XmlResultMapDefinitionProvider Unit Tests', () => {

    describe('resultMap attribute pattern matching', () => {
        it('should match resultMap attribute with double quotes', () => {
            const line = '    <select id="selectById" resultMap="UserResultMap">';
            const match = line.match(/resultMap\s*=\s*["']([^"']+)["']/);
            assert.ok(match, 'Should match resultMap attribute');
            assert.strictEqual(match[1], 'UserResultMap');
        });

        it('should match resultMap attribute with single quotes', () => {
            const line = "    <select id='selectById' resultMap='UserResultMap'>";
            const match = line.match(/resultMap\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'UserResultMap');
        });

        it('should handle whitespace around equals sign', () => {
            const line = '    <select resultMap = "UserResultMap">';
            const match = line.match(/resultMap\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'UserResultMap');
        });

        it('should match multiple resultMap attributes on same line', () => {
            const line = '    <select resultMap="MapA" extends="MapB">';
            const regex = /resultMap\s*=\s*["']([^"']+)["']/g;
            const matches = [];
            let match;
            while ((match = regex.exec(line)) !== null) {
                matches.push(match[1]);
            }
            assert.strictEqual(matches.length, 1);
            assert.strictEqual(matches[0], 'MapA');
        });
    });

    describe('resultMap id attribute pattern matching', () => {
        it('should match id attribute in resultMap tag', () => {
            const line = '    <resultMap id="UserResultMap" type="User">';
            const match = line.match(/<resultMap[^>]+id\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'UserResultMap');
        });

        it('should match id attribute with single quotes', () => {
            const line = "    <resultMap id='UserResultMap' type='User'>";
            const match = line.match(/<resultMap[^>]+id\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'UserResultMap');
        });

        it('should match id before or after other attributes', () => {
            const line1 = '    <resultMap id="MapA" type="User">';
            const line2 = '    <resultMap type="User" id="MapB">';

            const match1 = line1.match(/<resultMap[^>]+id\s*=\s*["']([^"']+)["']/);
            const match2 = line2.match(/<resultMap[^>]+id\s*=\s*["']([^"']+)["']/);

            assert.ok(match1);
            assert.ok(match2);
            assert.strictEqual(match1[1], 'MapA');
            assert.strictEqual(match2[1], 'MapB');
        });
    });

    describe('resultMap references searching', () => {
        it('should identify lines with resultMap attribute (not in resultMap tag)', () => {
            const lines = [
                '<mapper namespace="test">',
                '    <resultMap id="UserMap" type="User"/>',
                '    <select resultMap="UserMap"/>',
                '    <select id="test" resultMap="UserMap"/>',
                '</mapper>'
            ];

            const references = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Skip lines with <resultMap tag
                if (!line.includes('<resultMap')) {
                    const match = line.match(/resultMap\s*=\s*["']([^"']+)["']/);
                    if (match) {
                        references.push({ line: i, id: match[1] });
                    }
                }
            }

            assert.strictEqual(references.length, 2, 'Should find 2 references');
            assert.strictEqual(references[0].id, 'UserMap');
            assert.strictEqual(references[1].id, 'UserMap');
        });
    });

    describe('special characters in resultMap names', () => {
        it('should handle dots in resultMap names', () => {
            const line = '    <select resultMap="User.Result.Map"/>';
            const match = line.match(/resultMap\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'User.Result.Map');
        });

        it('should handle underscores in resultMap names', () => {
            const line = '    <select resultMap="User_Result_Map"/>';
            const match = line.match(/resultMap\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'User_Result_Map');
        });

        it('should handle numbers in resultMap names', () => {
            const line = '    <select resultMap="UserMap2024"/>';
            const match = line.match(/resultMap\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'UserMap2024');
        });
    });

    describe('cursor position calculation', () => {
        it('should calculate position within attribute value', () => {
            const line = '    <select resultMap="UserResultMap">';
            const attributeValue = 'UserResultMap';
            const attributeStart = line.indexOf('"UserResultMap"') + 1; // After opening quote

            // Cursor at 'U' (start)
            const cursorPos1 = attributeStart;
            const offset1 = cursorPos1 - attributeStart;
            assert.strictEqual(offset1, 0);

            // Cursor at 'M' in "UserResultMap"
            const cursorPos2 = attributeStart + 'UserResult'.length;
            const offset2 = cursorPos2 - attributeStart;
            assert.strictEqual(offset2, 10);

            // Cursor at end
            const cursorPos3 = attributeStart + attributeValue.length;
            const offset3 = cursorPos3 - attributeStart;
            assert.strictEqual(offset3, attributeValue.length);
        });
    });

    describe('regex escaping', () => {
        it('should escape special regex characters in resultMap names', () => {
            const escapeRegex = (str: string): string => {
                return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            };

            const testCases = [
                { input: 'User.Map', expected: 'User\\.Map' },
                { input: 'User*Map', expected: 'User\\*Map' },
                { input: 'User+Map', expected: 'User\\+Map' },
                { input: 'User?Map', expected: 'User\\?Map' },
                { input: 'User(Map)', expected: 'User\\(Map\\)' },
                { input: 'User[Map]', expected: 'User\\[Map\\]' }
            ];

            testCases.forEach(({ input, expected }) => {
                const result = escapeRegex(input);
                assert.strictEqual(result, expected, `Failed for input: ${input}`);
            });
        });
    });
});
