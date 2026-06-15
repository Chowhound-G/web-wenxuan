# 香港1 电商站部署记录（本地私有）

更新时间：2026-06-09

## 结论

- 电商项目线上地址：`https://evanshine.me/`
- 服务器连接信息来源：`C:\Users\殷文炫\Desktop\服务器\香港1.txt`
- 线上部署目录：`/opt/evanshine-shop`
- 当前 release：`/opt/evanshine-shop/releases/20260609-1351-6d01e7f`
- 当前源码基准：GitHub `https://github.com/dengzhekun/projectku-web`，commit `6d01e7f`
- 注意：`D:\OtherProject\web-wenxuan` 是旧工作副本，不是最新发布源；本次实际发布源是 `D:\OtherProject\_reference\projectku-web-main`。

## 线上结构

- 前端静态文件：`/var/www/evanshine.me`
- Nginx 站点：`/etc/nginx/sites-enabled/evanshine.me`
- 后端容器：`evanshine-shop-backend`，监听 `127.0.0.1:18080 -> 8080`
- MySQL 容器：`evanshine-shop-mysql`，数据卷 `evanshine-shop-mysql-data`
- LightRAG 容器：`evanshine-shop-lightrag-lite`，监听 `127.0.0.1:19621`

## 本次发布验证

- `npm run build`：通过
- `mvn -B -DskipTests package`：通过
- `https://evanshine.me/`：HTTP 200
- `https://evanshine.me/api/v1/products`：HTTP 200
- `http://127.0.0.1:18080/api/v3/api-docs`：HTTP 200
- 管理员登录接口：`admin / 123456` 可拿到 token
- 静态资源检查：新版 JS/CSS 和商品图均 200

## 回滚信息

- 发布备份目录：`/opt/evanshine-shop/backups/deploy-20260609-1351-6d01e7f-20260609055420`
- 旧前端目录：`/var/www/evanshine.me.prev-20260609-1351-6d01e7f-20260609055420`
- 旧 release：`/opt/evanshine-shop/releases/202605051150-a99d722`

## 常用命令

```bash
cd /opt/evanshine-shop/current
docker compose ps
docker logs --tail 100 evanshine-shop-backend
curl -k -I https://evanshine.me/
curl -k https://evanshine.me/api/v1/products | head
```
