package com.young1lin.mybatis.boost.integration.test;

import org.springframework.boot.CommandLineRunner;

import com.young1lin.mybatis.boost.integration.test.mapper.PermissionMapper;
import com.young1lin.mybatis.boost.integration.test.mapper.RoleMapper;
import com.young1lin.mybatis.boost.integration.test.mapper.UserMapper;
import com.young1lin.mybatis.boost.integration.test.mapper.UserRoleMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RequiredArgsConstructor
@Slf4j
public class MapperRunner implements CommandLineRunner {

    private final UserMapper userMapper;

    private final RoleMapper roleMapper;

    private final PermissionMapper permissionMapper;

    private final UserRoleMapper userRoleMapper;

    @Override
    public void run(String... args) throws Exception {
        log.info("UserMapper: {}", userMapper.selectById(1L));
        log.info("RoleMapper: {}", roleMapper.getById(1L));
        log.info("PermissionMapper: {}", permissionMapper.selectById(1L));
        log.info("PermissionMapper: {}", permissionMapper.listAll());
        log.info("UserRoleMapper: {}", userRoleMapper.listAllByUserId(1L));
    }

}
