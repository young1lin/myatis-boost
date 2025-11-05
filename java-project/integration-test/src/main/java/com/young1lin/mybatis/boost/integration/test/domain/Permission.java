package com.young1lin.mybatis.boost.integration.test.domain;

import lombok.Data;
import java.io.Serializable;
import java.sql.Timestamp;

@Data
public class Permission implements Serializable {

    /**
     * Primary key ID
     */
    private Long id;

    /**
     * Permission name, unique identifier
     */
    private String permissionName;

    /**
     * Resource path or identifier for the permission
     */
    private String resource;

    /**
     * Operation type: 1-read, 2-write, 3-execute, 4-other
     */
    private Integer action;

    /**
     * Permission type: 1-menu permission, 2-button permission, 3-API permission, 4-data permission
     */
    private Integer type;

    /**
     * Permission description
     */
    private String description;

    /**
     * Permission status: 0-disabled, 1-enabled
     */
    private Integer status;

    /**
     * Parent permission ID, used for permission hierarchy structure
     */
    private Long parentId;

    /**
     * Sort order field
     */
    private Integer sortOrder;

    /**
     * Creation time
     */
    private Timestamp createTime;

    /**
     * Update time
     */
    private Timestamp updateTime;

    /**
     * Optimistic lock version number
     */
    private Integer version;

}
