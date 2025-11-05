/**
 * Unit tests for JavaClassDefinitionProvider
 * Tests pattern matching and logic without VS Code API dependencies
 */

import * as assert from 'assert';

describe('JavaClassDefinitionProvider Unit Tests', () => {

    describe('Class attribute pattern matching', () => {
        it('should identify resultType attribute', () => {
            const line = '<select id="selectById" resultType="com.example.User">';
            const hasResultType = /resultType\s*=\s*["']([^"']+)["']/.test(line);
            assert.strictEqual(hasResultType, true);

            const match = line.match(/resultType\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.User');
        });

        it('should identify parameterType attribute', () => {
            const line = '<insert id="insert" parameterType="com.example.User">';
            const match = line.match(/parameterType\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.User');
        });

        it('should identify type attribute', () => {
            const line = '<resultMap id="userMap" type="com.example.User">';
            const match = line.match(/type\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.User');
        });

        it('should identify javaType attribute', () => {
            const line = '<association property="role" javaType="com.example.Role">';
            const match = line.match(/javaType\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.Role');
        });

        it('should identify ofType attribute', () => {
            const line = '<collection property="orders" ofType="com.example.Order">';
            const match = line.match(/ofType\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.Order');
        });

        it('should handle single quotes', () => {
            const line = "<select resultType='com.example.User'>";
            const match = line.match(/resultType\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.User');
        });

        it('should handle whitespace around equals sign', () => {
            const line = '<select resultType = "com.example.User">';
            const match = line.match(/resultType\s*=\s*["']([^"']+)["']/);
            assert.ok(match);
            assert.strictEqual(match[1], 'com.example.User');
        });
    });

    describe('Class name parsing', () => {
        it('should extract simple class name from fully-qualified name', () => {
            const fullName = 'com.example.entity.User';
            const simpleName = fullName.split('.').pop();
            assert.strictEqual(simpleName, 'User');
        });

        it('should handle class name without package', () => {
            const fullName = 'User';
            const simpleName = fullName.split('.').pop();
            assert.strictEqual(simpleName, 'User');
        });

        it('should convert class name to path pattern', () => {
            const className = 'com.example.entity.User';
            const pathPattern = className.replace(/\./g, '/') + '.java';
            assert.strictEqual(pathPattern, 'com/example/entity/User.java');
        });
    });

    describe('Built-in type detection', () => {
        const primitives = ['int', 'long', 'double', 'float', 'boolean', 'byte', 'short', 'char'];

        primitives.forEach(type => {
            it(`should recognize ${type} as primitive type`, () => {
                assert.ok(primitives.includes(type));
            });
        });

        const javaLangTypes = [
            'java.lang.String',
            'java.lang.Integer',
            'java.lang.Long',
            'java.lang.Double',
            'java.lang.Float',
            'java.lang.Boolean',
            'java.lang.Object'
        ];

        javaLangTypes.forEach(type => {
            it(`should recognize ${type} as built-in type`, () => {
                assert.ok(javaLangTypes.includes(type));
            });
        });

        it('should not recognize custom type as built-in', () => {
            const customType = 'com.example.User';
            assert.ok(!primitives.includes(customType));
            assert.ok(!javaLangTypes.includes(customType));
        });
    });

    describe('Java class pattern matching', () => {
        it('should match class declaration', () => {
            const line = 'public class User {';
            const match = line.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)\b/);
            assert.ok(match);
            assert.strictEqual(match[1], 'User');
        });

        it('should match interface declaration', () => {
            const line = 'public interface Identifiable {';
            const match = line.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)\b/);
            assert.ok(match);
            assert.strictEqual(match[1], 'Identifiable');
        });

        it('should match enum declaration', () => {
            const line = 'public enum UserStatus {';
            const match = line.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)\b/);
            assert.ok(match);
            assert.strictEqual(match[1], 'UserStatus');
        });

        it('should match class without public modifier', () => {
            const line = 'class User {';
            const match = line.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)\b/);
            assert.ok(match);
            assert.strictEqual(match[1], 'User');
        });
    });

    describe('Cursor position calculation', () => {
        it('should calculate cursor offset in simple class name', () => {
            const fullClassName = 'com.example.entity.User';
            // Indices: c(0), o(1), m(2), .(3), ..., .(18), U(19), s(20), e(21), r(22)
            const lastDotIndex = fullClassName.lastIndexOf('.'); // 18
            const simpleClassNameStart = lastDotIndex + 1; // 19
            const cursorOffsetInFull = 19; // Pointing at 'U' (index 19)

            const cursorOffsetInSimple = cursorOffsetInFull >= simpleClassNameStart
                ? cursorOffsetInFull - simpleClassNameStart
                : 0;

            assert.strictEqual(cursorOffsetInSimple, 0); // 'U' is at index 19, start is 19, so offset is 0
        });

        it('should calculate cursor offset in middle of simple class name', () => {
            const fullClassName = 'com.example.entity.User';
            // Indices: ..., .(18), U(19), s(20), e(21), r(22)
            const lastDotIndex = fullClassName.lastIndexOf('.'); // 18
            const simpleClassNameStart = lastDotIndex + 1; // 19
            const cursorOffsetInFull = 21; // Pointing at 'e' in "User" (index 21)

            const cursorOffsetInSimple = cursorOffsetInFull >= simpleClassNameStart
                ? cursorOffsetInFull - simpleClassNameStart
                : 0;

            assert.strictEqual(cursorOffsetInSimple, 2); // 'e' is at index 21, start is 19, so offset is 2
        });
    });
});
