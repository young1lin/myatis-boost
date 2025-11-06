/**
 * Unit tests for SqlComposer
 * These tests use mocked file system and do not require VS Code API
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { composeSql, hasIncludes } from '../../navigator/core/SqlComposer';
import * as fileUtils from '../../utils/fileUtils';

describe('SqlComposer Unit Tests', () => {
    let readFileStub: sinon.SinonStub;

    beforeEach(() => {
        readFileStub = sinon.stub(fileUtils, 'readFile');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('composeSql', () => {
        it('should compose SQL with simple include', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="Base_Column_List">
        id, account_cfg_id, symbol_cfg_id, profit
    </sql>

    <select id="selectByCondition" resultMap="BaseResultMap">
        select
        <include refid="Base_Column_List"/>
        from t_bo_account_symbol_cfg t
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'selectByCondition');

            assert.ok(result);
            assert.ok(result.includes('id, account_cfg_id, symbol_cfg_id, profit'));
            assert.ok(result.includes('select'));
            assert.ok(result.includes('from t_bo_account_symbol_cfg t'));
        });

        it('should compose SQL with multiple includes', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="Base_Column_List">
        id, account_cfg_id, symbol_cfg_id, profit, gmt_create, gmt_modified
    </sql>

    <sql id="where_condition">
        <trim prefix="WHERE" prefixOverrides="AND | OR">
            <if test="accountCfgId != null and accountCfgId!=''">
                AND t.account_cfg_id = #{accountCfgId}
            </if>
            <if test="symbolCfgId != null ">
                AND t.symbol_cfg_id = #{symbolCfgId}
            </if>
        </trim>
    </sql>

    <select id="selectByCondition" resultMap="BaseResultMap">
        select
        <include refid="Base_Column_List"/>
        from t_bo_account_symbol_cfg t
        <include refid="where_condition"/>
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'selectByCondition');

            assert.ok(result);
            assert.ok(result.includes('id, account_cfg_id, symbol_cfg_id, profit'));
            assert.ok(result.includes('WHERE'));
            assert.ok(result.includes('accountCfgId'));
        });

        it('should handle nested includes', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="base_fields">
        id, name
    </sql>

    <sql id="all_fields">
        <include refid="base_fields"/>, age, email
    </sql>

    <select id="selectUser" resultType="User">
        select
        <include refid="all_fields"/>
        from users
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'selectUser');

            assert.ok(result);
            assert.ok(result.includes('id, name'));
            assert.ok(result.includes('age, email'));
            assert.ok(!result.includes('<include'));
        });

        it('should detect circular references', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="fragment_a">
        <include refid="fragment_b"/>
    </sql>

    <sql id="fragment_b">
        <include refid="fragment_a"/>
    </sql>

    <select id="selectWithCircular" resultType="User">
        select * from users
        <include refid="fragment_a"/>
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'selectWithCircular');

            assert.ok(result);
            assert.ok(result.includes('Circular reference detected'));
        });

        it('should handle missing fragment references', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="existing_fragment">
        id, name
    </sql>

    <select id="selectWithMissingRef" resultType="User">
        select
        <include refid="non_existent_fragment"/>
        from users
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'selectWithMissingRef');

            assert.ok(result);
            assert.ok(result.includes('Fragment not found: non_existent_fragment'));
        });

        it('should return null for non-existent statement', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <select id="selectUser" resultType="User">
        select * from users
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'nonExistentStatement');

            assert.strictEqual(result, null);
        });

        it('should compose SQL without includes unchanged', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <select id="selectUser" resultType="User">
        select id, name, age
        from users
        where id = #{id}
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'selectUser');

            assert.ok(result);
            assert.ok(result.includes('select id, name, age'));
            assert.ok(result.includes('from users'));
            assert.ok(result.includes('where id = #{id}'));
        });

        it('should handle insert statements with includes', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="insert_columns">
        name, age, email
    </sql>

    <insert id="insertUser" parameterType="User">
        insert into users (<include refid="insert_columns"/>)
        values (#{name}, #{age}, #{email})
    </insert>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'insertUser');

            assert.ok(result);
            assert.ok(result.includes('name, age, email'));
            assert.ok(result.includes('insert into users'));
            assert.ok(result.includes('values'));
        });

        it('should handle update statements with includes', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="set_clause">
        <set>
            <if test="name != null">name = #{name},</if>
            <if test="age != null">age = #{age},</if>
        </set>
    </sql>

    <update id="updateUser" parameterType="User">
        update users
        <include refid="set_clause"/>
        where id = #{id}
    </update>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'updateUser');

            assert.ok(result);
            assert.ok(result.includes('update users'));
            assert.ok(result.includes('name = #{name}'));
            assert.ok(result.includes('where id = #{id}'));
        });

        it('should handle delete statements with includes', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="where_clause">
        where id = #{id}
    </sql>

    <delete id="deleteUser" parameterType="long">
        delete from users
        <include refid="where_clause"/>
    </delete>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await composeSql('/fake/path/TestMapper.xml', 'deleteUser');

            assert.ok(result);
            assert.ok(result.includes('delete from users'));
            assert.ok(result.includes('where id = #{id}'));
        });
    });

    describe('hasIncludes', () => {
        it('should return true when statement has includes', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <sql id="columns">
        id, name
    </sql>

    <select id="selectUser" resultType="User">
        select <include refid="columns"/> from users
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await hasIncludes('/fake/path/TestMapper.xml', 'selectUser');

            assert.strictEqual(result, true);
        });

        it('should return false when statement has no includes', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <select id="selectUser" resultType="User">
        select id, name from users
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await hasIncludes('/fake/path/TestMapper.xml', 'selectUser');

            assert.strictEqual(result, false);
        });

        it('should return false for non-existent statement', async () => {
            const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.mapper.TestMapper">
    <select id="selectUser" resultType="User">
        select * from users
    </select>
</mapper>`;
            readFileStub.resolves(mockContent);

            const result = await hasIncludes('/fake/path/TestMapper.xml', 'nonExistent');

            assert.strictEqual(result, false);
        });
    });
});
