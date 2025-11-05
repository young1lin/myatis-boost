package com.example.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

/**
 * User mapper interface for testing
 */
@Mapper
public interface UserMapper {

    /**
     * Select user by ID
     */
    User selectById(Long id);

    /**
     * Select all users
     */
    List<User> selectAll();

    /**
     * Select users by age
     */
    List<User> selectByAge(@Param("age") Integer age);

    /**
     * Insert a new user
     */
    int insert(User user);

    /**
     * Update user information
     */
    int update(User user);

    /**
     * Delete user by ID
     */
    void delete(Long id);

    /**
     * Count all users
     */
    int count();
}
