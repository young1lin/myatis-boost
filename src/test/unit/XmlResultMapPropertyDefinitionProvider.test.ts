/**
 * Unit tests for XmlResultMapPropertyDefinitionProvider
 * Tests pattern matching and logic without VS Code API dependencies
 */

import * as assert from 'assert';

describe('XmlResultMapPropertyDefinitionProvider Unit Tests', () => {

    describe('property attribute pattern matching', () => {
        it('should match property attribute in result tag', () => {
            const line = '        <result property="name" column="user_name"/>';
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'name');
        });

        it('should match property attribute in id tag', () => {
            const line = '        <id property="id" column="id"/>';
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'id');
        });

        it('should match property attribute in association tag', () => {
            const line = '        <association property="role" javaType="Role"/>';
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'role');
        });

        it('should match property attribute in collection tag', () => {
            const line = '        <collection property="orders" ofType="Order"/>';
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'orders');
        });

        it('should handle single quotes', () => {
            const line = "        <result property='name' column='user_name'/>";
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'name');
        });

        it('should handle whitespace around equals sign', () => {
            const line = '        <result property = "name" column="user_name"/>';
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'name');
        });
    });

    describe('resultMap type attribute pattern matching', () => {
        it('should extract type from resultMap tag', () => {
            const line = '    <resultMap id="UserResultMap" type="com.example.entity.User">';
            const match = line.match(/<resultMap[^>]*type\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.entity.User');
        });

        it('should handle type attribute with single quotes', () => {
            const line = "    <resultMap id='UserResultMap' type='com.example.entity.User'>";
            const match = line.match(/<resultMap[^>]*type\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.entity.User');
        });

        it('should match type attribute regardless of order', () => {
            const line1 = '    <resultMap type="User" id="UserMap">';
            const line2 = '    <resultMap id="UserMap" type="User">';

            const match1 = line1.match(/<resultMap[^>]*type\s*=\s*["']([^"']+)["']/);
            const match2 = line2.match(/<resultMap[^>]*type\s*=\s*["']([^"']+)["']/);

            assert.ok(match1);
            assert.ok(match2);
            assert.strictEqual(match1[1], 'User');
            assert.strictEqual(match2[1], 'User');
        });
    });

    describe('Java field pattern matching', () => {
        it('should match field declaration with type and name', () => {
            const line = '    private String name;';
            const fieldName = 'name';
            const regex = new RegExp(`(?:private|protected|public)?\\s+\\w+(?:<[^>]+>)?\\s+${fieldName}\\s*[;=]`);
            assert.ok(regex.test(line));
        });

        it('should match field with annotation', () => {
            // Annotations are on separate lines, so field regex should still work
            const line = '    private String email;';
            const fieldName = 'email';
            const regex = new RegExp(`(?:private|protected|public)?\\s+\\w+(?:<[^>]+>)?\\s+${fieldName}\\s*[;=]`);
            assert.ok(regex.test(line));
        });

        it('should match field with generic type', () => {
            const line = '    private List<User> users;';
            const fieldName = 'users';
            const regex = new RegExp(`(?:private|protected|public)?\\s+\\w+(?:<[^>]+>)?\\s+${fieldName}\\s*[;=]`);
            assert.ok(regex.test(line));
        });

        it('should match field with initialization', () => {
            const line = '    private String name = "default";';
            const fieldName = 'name';
            const regex = new RegExp(`(?:private|protected|public)?\\s+\\w+(?:<[^>]+>)?\\s+${fieldName}\\s*[;=]`);
            assert.ok(regex.test(line));
        });

        it('should not match method declarations', () => {
            const line = '    public String getName() {';
            const fieldName = 'name';
            const regex = new RegExp(`(?:private|protected|public)?\\s+\\w+(?:<[^>]+>)?\\s+${fieldName}\\s*[;=]`);
            assert.strictEqual(regex.test(line), false);
        });
    });

    describe('special characters in property names', () => {
        it('should handle camelCase property names', () => {
            const line = '        <result property="userName" column="user_name"/>';
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'userName');
        });

        it('should handle underscores in property names', () => {
            const line = '        <result property="user_name" column="user_name"/>';
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'user_name');
        });

        it('should handle numbers in property names', () => {
            const line = '        <result property="field123" column="col123"/>';
            const match = line.match(/property\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'field123');
        });
    });

    describe('finding resultMap tag', () => {
        it('should identify resultMap opening tag', () => {
            const line = '    <resultMap id="UserMap" type="User">';
            const isResultMapTag = /<resultMap\b/.test(line);
            assert.ok(isResultMapTag);
        });

        it('should identify resultMap closing tag', () => {
            const line = '    </resultMap>';
            const isClosingTag = /<\/resultMap>/.test(line);
            assert.ok(isClosingTag);
        });

        it('should detect when inside resultMap context', () => {
            const lines = [
                '<mapper>',
                '    <resultMap id="UserMap" type="User">',
                '        <result property="name"/>',
                '    </resultMap>',
                '</mapper>'
            ];

            let inResultMap = false;
            const resultLines = [];

            for (const line of lines) {
                if (/<resultMap\b/.test(line)) {
                    inResultMap = true;
                } else if (/<\/resultMap>/.test(line)) {
                    inResultMap = false;
                }
                if (inResultMap && /property\s*=/.test(line)) {
                    resultLines.push(line);
                }
            }

            assert.strictEqual(resultLines.length, 1);
            assert.ok(resultLines[0].includes('property="name"'));
        });
    });

    describe('cursor position calculation', () => {
        it('should calculate cursor offset in property value', () => {
            const line = '        <result property="userName" column="user_name"/>';
            const propertyValue = 'userName';
            const propertyStart = line.indexOf('"userName"') + 1;

            // Cursor at 'u' (start)
            const offset1 = 0;
            assert.strictEqual(offset1, 0);

            // Cursor at 'N' (middle)
            const offset2 = 4; // 'user'.length
            assert.strictEqual(offset2, 4);

            // Cursor at 'e' (end)
            const offset3 = propertyValue.length - 1;
            assert.strictEqual(offset3, 7);
        });

        it('should map cursor position proportionally', () => {
            const sourceLength = 8; // "userName"
            const targetLength = 8; // "userName" in Java
            const cursorOffsetInSource = 4; // At 'N'

            const relativePosition = cursorOffsetInSource / sourceLength;
            const mappedOffset = Math.floor(relativePosition * targetLength);

            assert.strictEqual(relativePosition, 0.5);
            assert.strictEqual(mappedOffset, 4);
        });
    });

    describe('regex escaping', () => {
        it('should escape special regex characters in field names', () => {
            const escapeRegex = (str: string): string => {
                return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            };

            const testCases = [
                { input: 'field.name', expected: 'field\\.name' },
                { input: 'field+name', expected: 'field\\+name' },
                { input: 'field*name', expected: 'field\\*name' },
                { input: 'field?name', expected: 'field\\?name' }
            ];

            testCases.forEach(({ input, expected }) => {
                const result = escapeRegex(input);
                assert.strictEqual(result, expected, `Failed for input: ${input}`);
            });
        });
    });

    describe('class body detection', () => {
        it('should detect when inside class body', () => {
            const lines = [
                'package com.example;',
                '',
                'public class User {',
                '    private Long id;',
                '    private String name;',
                '}',
                ''
            ];

            let inClassBody = false;
            let braceLevel = 0;
            const fieldsFound = [];

            for (const line of lines) {
                if (/(?:class|interface|enum)\s+\w+/.test(line)) {
                    inClassBody = false;
                }

                braceLevel += (line.match(/{/g) || []).length;
                braceLevel -= (line.match(/}/g) || []).length;

                if (braceLevel > 0) {
                    inClassBody = true;
                }

                if (inClassBody && braceLevel === 1 && /private\s+\w+\s+\w+\s*;/.test(line)) {
                    fieldsFound.push(line.trim());
                }

                if (braceLevel === 0) {
                    inClassBody = false;
                }
            }

            assert.strictEqual(fieldsFound.length, 2);
            assert.ok(fieldsFound[0].includes('id'));
            assert.ok(fieldsFound[1].includes('name'));
        });
    });
});
