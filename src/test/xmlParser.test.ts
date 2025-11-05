/**
 * XML Parser Test Suite
 * Tests for XML file parsing utilities
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import {
    extractXmlNamespace,
    extractXmlStatements,
    findXmlStatementLine,
    extractStatementIdFromPosition
} from '../navigator/parsers/xmlParser';

suite('XML Parser Test Suite', () => {
    let tempDir: string;
    let testXmlFile: string;

    suiteSetup(() => {
        tempDir = path.join(__dirname, 'temp-xml-test');
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
        testXmlFile = path.join(tempDir, 'TestMapper.xml');
    });

    teardown(() => {
        if (fs.existsSync(testXmlFile)) {
            fs.unlinkSync(testXmlFile);
        }
    });

    test('extractXmlNamespace should extract namespace from mapper tag', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">
    <select id="selectById" resultType="User">
        SELECT * FROM users WHERE id = #{id}
    </select>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const namespace = await extractXmlNamespace(testXmlFile);
        assert.strictEqual(namespace, 'com.example.mapper.UserMapper');
    });

    test('extractXmlNamespace should return null for invalid XML', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <invalid>No namespace here</invalid>
</root>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const namespace = await extractXmlNamespace(testXmlFile);
        assert.strictEqual(namespace, null);
    });

    test('extractXmlStatements should extract all SQL statements', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
    <select id="selectById" resultType="User">
        SELECT * FROM users WHERE id = #{id}
    </select>
    <select id="selectAll" resultType="User">
        SELECT * FROM users
    </select>
    <insert id="insert" parameterType="User">
        INSERT INTO users (name, email) VALUES (#{name}, #{email})
    </insert>
    <update id="update" parameterType="User">
        UPDATE users SET name = #{name} WHERE id = #{id}
    </update>
    <delete id="deleteById">
        DELETE FROM users WHERE id = #{id}
    </delete>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const statements = await extractXmlStatements(testXmlFile);
        assert.strictEqual(statements.length, 5);

        assert.ok(statements.some(s => s.id === 'selectById' && s.type === 'select'));
        assert.ok(statements.some(s => s.id === 'selectAll' && s.type === 'select'));
        assert.ok(statements.some(s => s.id === 'insert' && s.type === 'insert'));
        assert.ok(statements.some(s => s.id === 'update' && s.type === 'update'));
        assert.ok(statements.some(s => s.id === 'deleteById' && s.type === 'delete'));
    });

    test('extractXmlStatements should extract resultType attribute', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
    <select id="selectById" resultType="com.example.entity.User">
        SELECT * FROM users WHERE id = #{id}
    </select>
    <select id="selectCount" resultType="int">
        SELECT COUNT(*) FROM users
    </select>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const statements = await extractXmlStatements(testXmlFile);
        assert.strictEqual(statements.length, 2);

        const selectById = statements.find(s => s.id === 'selectById');
        assert.strictEqual(selectById?.resultType, 'com.example.entity.User');

        const selectCount = statements.find(s => s.id === 'selectCount');
        assert.strictEqual(selectCount?.resultType, 'int');
    });

    test('extractXmlStatements should handle multi-line tags', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
    <select
        id="selectById"
        resultType="User"
        parameterType="Long">
        SELECT * FROM users WHERE id = #{id}
    </select>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const statements = await extractXmlStatements(testXmlFile);
        assert.strictEqual(statements.length, 1);
        assert.strictEqual(statements[0].id, 'selectById');
    });

    test('findXmlStatementLine should find correct line number', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
    <select id="selectById" resultType="User">
        SELECT * FROM users WHERE id = #{id}
    </select>
    <select id="selectAll" resultType="User">
        SELECT * FROM users
    </select>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const line = await findXmlStatementLine(testXmlFile, 'selectAll');
        assert.ok(line !== null);
        assert.ok(line >= 0);
    });

    test('findXmlStatementLine should return null for non-existent statement', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
    <select id="selectById" resultType="User">
        SELECT * FROM users WHERE id = #{id}
    </select>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const line = await findXmlStatementLine(testXmlFile, 'nonExistentStatement');
        assert.strictEqual(line, null);
    });

    test('extractStatementIdFromPosition should find nearest statement', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
    <select id="selectById" resultType="User">
        SELECT * FROM users
        WHERE id = #{id}
    </select>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        // Test from position inside the select statement
        const statementId = await extractStatementIdFromPosition(testXmlFile, 4);
        assert.strictEqual(statementId, 'selectById');
    });

    test('extractStatementIdFromPosition should return null if no statement nearby', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const statementId = await extractStatementIdFromPosition(testXmlFile, 1);
        assert.strictEqual(statementId, null);
    });

    test('extractXmlStatements should handle empty mapper', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.EmptyMapper">
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const statements = await extractXmlStatements(testXmlFile);
        assert.strictEqual(statements.length, 0);
    });

    test('extractXmlNamespace should handle namespace with single quotes', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace='com.example.mapper.UserMapper'>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const namespace = await extractXmlNamespace(testXmlFile);
        assert.strictEqual(namespace, 'com.example.mapper.UserMapper');
    });

    test('extractXmlStatements should handle statements without resultType', async () => {
        const content = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.UserMapper">
    <delete id="deleteById">
        DELETE FROM users WHERE id = #{id}
    </delete>
</mapper>`;
        fs.writeFileSync(testXmlFile, content, 'utf-8');

        const statements = await extractXmlStatements(testXmlFile);
        assert.strictEqual(statements.length, 1);
        assert.strictEqual(statements[0].resultType, undefined);
    });
});
