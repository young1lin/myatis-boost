package com.young1lin.mybatis.boost.integration.test;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import com.young1lin.mybatis.boost.integration.test.mapper.PermissionMapper;
import com.young1lin.mybatis.boost.integration.test.mapper.RoleMapper;
import com.young1lin.mybatis.boost.integration.test.mapper.UserMapper;
import com.young1lin.mybatis.boost.integration.test.mapper.UserRoleMapper;

@SpringBootApplication
public class IntegrationTestApplication {

    public static void main(String[] args) {
        SpringApplication.run(IntegrationTestApplication.class, args);
    }

    @Bean
    public MapperRunner mapperRunner(UserMapper userMapper,
            RoleMapper roleMapper,
            PermissionMapper permissionMapper,
            UserRoleMapper userRoleMapper) {
        return new MapperRunner(userMapper, roleMapper, permissionMapper, userRoleMapper);
    }

}
