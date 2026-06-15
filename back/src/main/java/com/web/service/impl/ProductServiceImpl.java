package com.web.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.json.JSONUtil;
import com.web.mapper.ProductMapper;
import com.web.pojo.Product;
import com.web.pojo.ProductMedia;
import com.web.pojo.ProductSku;
import com.web.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductMapper productMapper;

    @Override
    @Cacheable(value = "productById", key = "#id")
    public Product getProductById(Long id) {
        return productMapper.getById(id);
    }

    @Override
    @Cacheable(value = "productDetail", key = "#id")
    public Map<String, Object> getProductDetail(Long id) {
        Product product = productMapper.getById(id);
        if (product == null) return null;

        Map<String, Object> detail = BeanUtil.beanToMap(product, false, true);

        List<ProductMedia> mediaList = productMapper.getMediaByProductId(id);
        List<String> mediaUrls = mediaList.stream()
                .map(ProductMedia::getUrl)
                .collect(Collectors.toList());
        detail.put("media", mediaUrls);

        List<ProductSku> skus = productMapper.getSkusByProductId(id);
        List<Map<String, Object>> skuMaps = skus.stream().map(sku -> {
            Map<String, Object> m = BeanUtil.beanToMap(sku, false, true);
            if (sku.getAttrs() != null && !sku.getAttrs().isEmpty()) {
                m.put("attrs", JSONUtil.parseObj(sku.getAttrs()));
            } else {
                m.put("attrs", Map.of());
            }
            return m;
        }).collect(Collectors.toList());
        detail.put("skus", skuMaps);

        return detail;
    }

    @Override
    @Cacheable(value = "productList", key = "#keyword + '_' + #categoryId + '_' + #page + '_' + #size")
    public List<Product> getProductList(String keyword, Long categoryId, int page, int size) {
        int offset = (page - 1) * size;
        return productMapper.getList(keyword, categoryId, offset, size);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = {"productById", "productDetail", "productList"}, allEntries = true)
    public boolean createProduct(Product product) {
        product.setStatus(1);
        return productMapper.insert(product) > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = {"productById", "productDetail", "productList"}, allEntries = true)
    public boolean updateProduct(Product product) {
        return productMapper.update(product) > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = {"productById", "productDetail", "productList"}, allEntries = true)
    public boolean deleteProduct(Long id) {
        return productMapper.delete(id) > 0;
    }
}
