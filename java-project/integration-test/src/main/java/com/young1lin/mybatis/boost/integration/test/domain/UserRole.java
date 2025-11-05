package com.young1lin.mybatis.boost.integration.test.domain;

import java.io.Serializable;
import java.sql.Timestamp;

import lombok.Data;

@Data
public class UserRole implements Serializable {

    private Long id;

    private Long userId;

    private Long roleId;

    private Timestamp createTime;

    private Timestamp updateTime;

    private Integer version;

}
