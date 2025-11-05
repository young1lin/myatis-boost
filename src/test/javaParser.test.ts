/**
 * Java Parser Test Suite
 * Tests for Java file parsing utilities
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import {
    extractJavaNamespace,
    isMyBatisMapper,
    extractJavaMethods,
    findJavaMethodLine
} from '../navigator/parsers/javaParser';

suite('Java Parser Test Suite', () => {
    let tempDir: string;
    let testJavaFile: string;

    suiteSetup(() => {
        tempDir = path.join(__dirname, 'temp-java-test');
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
        testJavaFile = path.join(tempDir, 'TestMapper.java');
    });

    teardown(() => {
        if (fs.existsSync(testJavaFile)) {
            fs.unlinkSync(testJavaFile);
        }
    });

    test('extractJavaNamespace should extract package and interface name', async () => {
        const content = `package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    User selectById(Long id);
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const namespace = await extractJavaNamespace(testJavaFile);
        assert.strictEqual(namespace, 'com.example.mapper.UserMapper');
    });

    test('extractJavaNamespace should return null for invalid file', async () => {
        const content = `// Not a valid interface
public class SomeClass {
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const namespace = await extractJavaNamespace(testJavaFile);
        assert.strictEqual(namespace, null);
    });

    test('isMyBatisMapper should identify mapper with @Mapper annotation', async () => {
        const content = `package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const result = await isMyBatisMapper(testJavaFile);
        assert.strictEqual(result, true);
    });

    test('isMyBatisMapper should identify mapper with MyBatis imports', async () => {
        const content = `package com.example.mapper;

import org.mybatis.spring.mapper.MapperScan;

public interface UserMapper {
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const result = await isMyBatisMapper(testJavaFile);
        assert.strictEqual(result, true);
    });

    test('isMyBatisMapper should reject non-interface files', async () => {
        const content = `package com.example.service;

public class UserService {
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const result = await isMyBatisMapper(testJavaFile);
        assert.strictEqual(result, false);
    });

    test('isMyBatisMapper should reject interface without MyBatis markers', async () => {
        const content = `package com.example.service;

public interface UserService {
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const result = await isMyBatisMapper(testJavaFile);
        assert.strictEqual(result, false);
    });

    test('extractJavaMethods should extract all method declarations', async () => {
        const content = `package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    User selectById(Long id);
    List<User> selectAll();
    int insert(User user);
    int update(User user);
    int deleteById(Long id);
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const methods = await extractJavaMethods(testJavaFile);
        assert.strictEqual(methods.length, 5);
        assert.ok(methods.some(m => m.name === 'selectById'));
        assert.ok(methods.some(m => m.name === 'selectAll'));
        assert.ok(methods.some(m => m.name === 'insert'));
        assert.ok(methods.some(m => m.name === 'update'));
        assert.ok(methods.some(m => m.name === 'deleteById'));
    });

    test('extractJavaMethods should handle methods with generic return types', async () => {
        const content = `package com.example.mapper;

@Mapper
public interface UserMapper {
    List<User> selectAll();
    Map<Long, User> selectMap();
    Optional<User> selectOptional(Long id);
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const methods = await extractJavaMethods(testJavaFile);
        assert.strictEqual(methods.length, 3);
        assert.ok(methods.some(m => m.name === 'selectAll'));
        assert.ok(methods.some(m => m.name === 'selectMap'));
        assert.ok(methods.some(m => m.name === 'selectOptional'));
    });

    test('extractJavaMethods should ignore comments and annotations', async () => {
        const content = `package com.example.mapper;

@Mapper
public interface UserMapper {
    // This is a comment
    /* Multi-line comment */
    @Select("SELECT * FROM users WHERE id = #{id}")
    User selectById(Long id);
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const methods = await extractJavaMethods(testJavaFile);
        assert.strictEqual(methods.length, 1);
        assert.strictEqual(methods[0].name, 'selectById');
    });

    test('findJavaMethodLine should find correct line number', async () => {
        const content = `package com.example.mapper;

@Mapper
public interface UserMapper {
    User selectById(Long id);
    List<User> selectAll();
    int insert(User user);
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const line = await findJavaMethodLine(testJavaFile, 'selectAll');
        assert.ok(line !== null);
        assert.ok(line >= 0);
    });

    test('findJavaMethodLine should return null for non-existent method', async () => {
        const content = `package com.example.mapper;

@Mapper
public interface UserMapper {
    User selectById(Long id);
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const line = await findJavaMethodLine(testJavaFile, 'nonExistentMethod');
        assert.strictEqual(line, null);
    });

    test('extractJavaNamespace should handle files with many imports', async () => {
        const content = `package com.example.mapper;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.entity.User;
import com.example.entity.Role;

@Mapper
public interface UserMapper {
    User selectById(Long id);
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const namespace = await extractJavaNamespace(testJavaFile);
        assert.strictEqual(namespace, 'com.example.mapper.UserMapper');
    });

    test('extractJavaMethods should handle empty interface', async () => {
        const content = `package com.example.mapper;

@Mapper
public interface EmptyMapper {
}`;
        fs.writeFileSync(testJavaFile, content, 'utf-8');

        const methods = await extractJavaMethods(testJavaFile);
        assert.strictEqual(methods.length, 0);
    });
});
