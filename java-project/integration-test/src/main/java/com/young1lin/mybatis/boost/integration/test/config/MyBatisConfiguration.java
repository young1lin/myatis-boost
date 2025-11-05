package com.young1lin.mybatis.boost.integration.test.config;

import java.util.stream.Stream;

import javax.sql.DataSource;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.annotation.MapperScan;

@MapperScan(basePackages = "com.young1lin.mybatis.boost.integration.test.mapper")
@Configuration
public class MyBatisConfiguration {

    @Bean
    public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
        SqlSessionFactoryBean factoryBean = new SqlSessionFactoryBean();
        factoryBean.setDataSource(dataSource);
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

        // merge multiple paths into one array
        Resource[] mapperResources = Stream.of(
                resolver.getResources("classpath*:com.young1lin.mybatis.boost.integration.test.mapper/**/*.xml"),
                resolver.getResources("classpath*:mapper/**/*.xml"),
                resolver.getResources("classpath*:mybatis/**/*.xml"))
                .flatMap(Stream::of)
                .toArray(Resource[]::new);

        factoryBean.setMapperLocations(mapperResources);
        return factoryBean.getObject();
    }

}
