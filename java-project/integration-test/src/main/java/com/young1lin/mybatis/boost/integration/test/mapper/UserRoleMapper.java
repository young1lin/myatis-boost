package com.young1lin.mybatis.boost.integration.test.mapper;

import java.util.List;

import com.young1lin.mybatis.boost.integration.test.domain.UserRole;

import jakarta.annotation.Nonnull;

public interface UserRoleMapper {

    List<UserRole> listAllByUserId(@Nonnull Long userId);

}
