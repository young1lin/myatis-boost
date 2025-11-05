package com.young1lin.mybatis.boost.integration.test.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.young1lin.mybatis.boost.integration.test.domain.Role;

import jakarta.annotation.Nonnull;

@Mapper
public interface RoleMapper {

    List<Role> listAll();

    Role getById(@Nonnull @Param("id") Long id);

    int updateById(@Nonnull Role role);

    int deleteById(
            @Nonnull @Param("id") Long id,
            @Nonnull @Param("version") Integer version);

}
