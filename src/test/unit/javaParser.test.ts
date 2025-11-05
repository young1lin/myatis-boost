/**
 * Unit tests for javaParser
 * These tests use mocked file system and do not require VS Code API
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { extractJavaNamespace, isMyBatisMapper, extractJavaMethods, findJavaMethodLine, findJavaMethodPosition } from '../../navigator/parsers/javaParser';
import * as fileUtils from '../../utils/fileUtils';

describe('javaParser Unit Tests', () => {
    let readFirstLinesStub: sinon.SinonStub;
    let readFileStub: sinon.SinonStub;

    beforeEach(() => {
        readFirstLinesStub = sinon.stub(fileUtils, 'readFirstLines');
        readFileStub = sinon.stub(fileUtils, 'readFile');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('extractJavaNamespace', () => {
        it('should extract namespace from valid mapper interface', async () => {
            const mockContent = `
package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    User selectById(Long id);
}
`;
            readFirstLinesStub.resolves(mockContent);

            const result = await extractJavaNamespace('/fake/path/UserMapper.java');
            assert.strictEqual(result, 'com.example.mapper.UserMapper');
            assert.ok(readFirstLinesStub.calledWith('/fake/path/UserMapper.java', 100));
        });

        it('should return null for non-interface files', async () => {
            const mockContent = `
package com.example.service;

public class UserService {
    public void doSomething() {}
}
`;
            readFirstLinesStub.resolves(mockContent);

            const result = await extractJavaNamespace('/fake/path/UserService.java');
            assert.strictEqual(result, null);
        });

        it('should return null when package is missing', async () => {
            const mockContent = `
public interface UserMapper {
    User selectById(Long id);
}
`;
            readFirstLinesStub.resolves(mockContent);

            const result = await extractJavaNamespace('/fake/path/UserMapper.java');
            assert.strictEqual(result, null);
        });
    });

    describe('isMyBatisMapper', () => {
        it('should return true for interface with @Mapper annotation', async () => {
            const mockContent = `
package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    User selectById(Long id);
}
`;
            readFirstLinesStub.resolves(mockContent);

            const result = await isMyBatisMapper('/fake/path/UserMapper.java');
            assert.strictEqual(result, true);
        });

        it('should return true for interface with MyBatis imports', async () => {
            const mockContent = `
package com.example.mapper;

import org.apache.ibatis.session.SqlSession;

public interface UserMapper {
    User selectById(Long id);
}
`;
            readFirstLinesStub.resolves(mockContent);

            const result = await isMyBatisMapper('/fake/path/UserMapper.java');
            assert.strictEqual(result, true);
        });

        it('should return true for interface with @Select annotation', async () => {
            const mockContent = `
package com.example.mapper;

import org.apache.ibatis.annotations.Select;

public interface UserMapper {
    @Select("SELECT * FROM users WHERE id = #{id}")
    User selectById(Long id);
}
`;
            readFirstLinesStub.resolves(mockContent);

            const result = await isMyBatisMapper('/fake/path/UserMapper.java');
            assert.strictEqual(result, true);
        });

        it('should return false for regular interface without MyBatis indicators', async () => {
            const mockContent = `
package com.example.service;

public interface UserService {
    User getUser(Long id);
}
`;
            readFirstLinesStub.resolves(mockContent);

            const result = await isMyBatisMapper('/fake/path/UserService.java');
            assert.strictEqual(result, false);
        });

        it('should return false for non-interface files', async () => {
            const mockContent = `
package com.example.model;

public class User {
    private Long id;
    private String name;
}
`;
            readFirstLinesStub.resolves(mockContent);

            const result = await isMyBatisMapper('/fake/path/User.java');
            assert.strictEqual(result, false);
        });
    });

    describe('extractJavaMethods', () => {
        it('should extract all method declarations from interface', async () => {
            const mockContent = `
package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    User selectById(Long id);

    List<User> selectAll();

    int insert(User user);

    void delete(Long id);
}
`;
            readFileStub.resolves(mockContent);

            const result = await extractJavaMethods('/fake/path/UserMapper.java');
            assert.strictEqual(result.length, 4);
            assert.strictEqual(result[0].name, 'selectById');
            assert.strictEqual(result[1].name, 'selectAll');
            assert.strictEqual(result[2].name, 'insert');
            assert.strictEqual(result[3].name, 'delete');
        });

        it('should handle methods with annotations', async () => {
            const mockContent = `
package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {
    @Select("SELECT * FROM users WHERE id = #{id}")
    User selectById(@Param("id") Long id);
}
`;
            readFileStub.resolves(mockContent);

            const result = await extractJavaMethods('/fake/path/UserMapper.java');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'selectById');
        });

        it('should handle generic return types', async () => {
            const mockContent = `
package com.example.mapper;

public interface UserMapper {
    List<User> findByAge(int age);
    Map<String, Object> getUserMap(Long id);
}
`;
            readFileStub.resolves(mockContent);

            const result = await extractJavaMethods('/fake/path/UserMapper.java');
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].name, 'findByAge');
            assert.strictEqual(result[1].name, 'getUserMap');
        });

        it('should return empty array for non-interface files', async () => {
            const mockContent = `
package com.example.model;

public class User {
    private Long id;
}
`;
            readFileStub.resolves(mockContent);

            const result = await extractJavaMethods('/fake/path/User.java');
            assert.strictEqual(result.length, 0);
        });
    });

    describe('findJavaMethodLine', () => {
        it('should find correct line number for method', async () => {
            const mockContent = `
package com.example.mapper;

public interface UserMapper {
    User selectById(Long id);

    List<User> selectAll();
}
`;
            readFileStub.resolves(mockContent);

            const result = await findJavaMethodLine('/fake/path/UserMapper.java', 'selectAll');
            // Line 6 (0-indexed) - template literal starts with newline
            assert.strictEqual(result, 6);
        });

        it('should return null for non-existent method', async () => {
            const mockContent = `
package com.example.mapper;

public interface UserMapper {
    User selectById(Long id);
}
`;
            readFileStub.resolves(mockContent);

            const result = await findJavaMethodLine('/fake/path/UserMapper.java', 'nonExistentMethod');
            assert.strictEqual(result, null);
        });
    });

    describe('findJavaMethodPosition', () => {
        it('should find correct position (line and column range) for method', async () => {
            const mockContent = `
package com.example.mapper;

public interface UserMapper {
    User selectById(Long id);

    TestVO selectAllById(Long id);
}
`;
            readFileStub.resolves(mockContent);

            const result = await findJavaMethodPosition('/fake/path/UserMapper.java', 'selectAllById');
            assert.ok(result !== null);
            assert.strictEqual(result.line, 6);
            // The method name "selectAllById" should have start and end columns
            assert.ok(result.startColumn > 0);
            assert.strictEqual(result.endColumn, result.startColumn + 'selectAllById'.length);
        });

        it('should find correct column range for indented method', async () => {
            const mockContent = `
package com.example.mapper;

public interface UserMapper {
    User selectById(Long id);
}
`;
            readFileStub.resolves(mockContent);

            const result = await findJavaMethodPosition('/fake/path/UserMapper.java', 'selectById');
            assert.ok(result !== null);
            assert.strictEqual(result.line, 4);
            // Method name should be after "User " which has 4 spaces indent + "User "
            const line = mockContent.split('\n')[4];
            const expectedStartColumn = line.indexOf('selectById');
            assert.strictEqual(result.startColumn, expectedStartColumn);
            assert.strictEqual(result.endColumn, expectedStartColumn + 'selectById'.length);
        });

        it('should return null for non-existent method', async () => {
            const mockContent = `
package com.example.mapper;

public interface UserMapper {
    User selectById(Long id);
}
`;
            readFileStub.resolves(mockContent);

            const result = await findJavaMethodPosition('/fake/path/UserMapper.java', 'nonExistentMethod');
            assert.strictEqual(result, null);
        });

        it('should handle methods with generic return types', async () => {
            const mockContent = `
package com.example.mapper;

public interface UserMapper {
    List<User> findByAge(int age);
}
`;
            readFileStub.resolves(mockContent);

            const result = await findJavaMethodPosition('/fake/path/UserMapper.java', 'findByAge');
            assert.ok(result !== null);
            assert.strictEqual(result.line, 4);
            const line = mockContent.split('\n')[4];
            const expectedStartColumn = line.indexOf('findByAge');
            assert.strictEqual(result.startColumn, expectedStartColumn);
            assert.strictEqual(result.endColumn, expectedStartColumn + 'findByAge'.length);
        });
    });

    describe('extractJavaMethods - column tracking', () => {
        it('should track column range for each method', async () => {
            const mockContent = `
package com.example.mapper;

public interface UserMapper {
    User selectById(Long id);
    List<User> selectAll();
    int insert(User user);
}
`;
            readFileStub.resolves(mockContent);

            const result = await extractJavaMethods('/fake/path/UserMapper.java');
            assert.strictEqual(result.length, 3);

            // All methods should have start and end column positions
            result.forEach(method => {
                assert.ok(method.startColumn >= 0, `Method ${method.name} should have startColumn >= 0`);
                assert.ok(method.endColumn > method.startColumn, `Method ${method.name} endColumn should be > startColumn`);
                assert.strictEqual(method.endColumn - method.startColumn, method.name.length, `Column range should equal method name length`);
            });

            // Check specific column positions
            const lines = mockContent.split('\n');
            assert.strictEqual(result[0].startColumn, lines[4].indexOf('selectById'));
            assert.strictEqual(result[0].endColumn, lines[4].indexOf('selectById') + 'selectById'.length);
            assert.strictEqual(result[1].startColumn, lines[5].indexOf('selectAll'));
            assert.strictEqual(result[1].endColumn, lines[5].indexOf('selectAll') + 'selectAll'.length);
            assert.strictEqual(result[2].startColumn, lines[6].indexOf('insert'));
            assert.strictEqual(result[2].endColumn, lines[6].indexOf('insert') + 'insert'.length);
        });
    });
});
