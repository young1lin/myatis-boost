package com.young1lin.mybatis.boost.integration.test.domain;

import java.io.Serializable;
import java.sql.Timestamp;

import lombok.Data;

@Data
public class Role implements Serializable {

    private Long id;

    /**
     * unique
     */
    private String roleName;

    private String remark;

    private Timestamp createTime;

    private Timestamp updateTime;

    private Integer version;

}
