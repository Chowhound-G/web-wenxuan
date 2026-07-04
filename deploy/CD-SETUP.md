# CD（持续部署）配置指南

本文档说明如何让 GitHub Actions 自动部署 web-wenxuan 到你的服务器。
完成下方 4 步配置后，**每次 push 到 main 分支会自动：测试 → 构建镜像 → 推送 GHCR → SSH 部署到服务器**。

---

## 架构总览

```
push main
   ↓
[CI/CD 流水线]
   ├─ 1. 后端测试 (mvn verify)
   ├─ 2. 构建镜像 → 推送 GHCR (ghcr.io/chowhound-g/web-wenxuan-{backend,frontend})
   └─ 3. SSH 连服务器 → docker pull → docker compose up -d
              ↓
        你的服务器 (4核8G+)
```

---

## 第 1 步：准备服务器

### 1.1 买服务器（推荐配置 4核8G）

**海外 VPS（CD 最顺，不用备案）**：
- Vultr / Contabo / Hetzner：4C8G 约 ¥80-150/月
- 优势：直连 GHCR，拉镜像秒级

**国内云（国内用户访问快）**：
- 阿里云/腾讯云轻量 4C8G 约 ¥150-250/月
- 注意：拉 ghcr.io 慢，需配 Docker 镜像加速（见 1.3）

### 1.2 装好 Docker

SSH 登录服务器后执行：
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # 当前用户加入 docker 组
newgrp docker

# 验证
docker --version
docker compose version
```

### 1.3 （国内服务器）配置 GHCR 加速

国内服务器拉 ghcr.io 慢/失败，配镜像加速器：
```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://hub.xn--4gqwvd43idqzdx.com"
  ]
}
EOF
sudo systemctl restart docker
```
> 若加速器仍拉不到 ghcr.io，改用阿里云 ACR（见文末"方案 B"）。

---

## 第 2 步：生成 SSH 密钥对

GitHub Actions 用 SSH 私钥连服务器，需要专门的部署密钥（不要用你日常的私钥）。

**在你本地电脑**执行：
```bash
# 生成专用密钥（无密码，CI 自动用）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/web_wenxuan_deploy -N ""

# 把公钥装到服务器（替换成你的服务器 IP 和用户）
ssh-copy-id -i ~/.ssh/web_wenxuan_deploy.pub root@你的服务器IP

# 验证免密登录
ssh -i ~/.ssh/web_wenxuan_deploy root@你的服务器IP "echo OK"
```

**保存好这两个文件**：
- `~/.ssh/web_wenxuan_deploy`（私钥，等下配到 GitHub Secrets）
- `~/.ssh/web_wenxuan_deploy.pub`（公钥，已装服务器）

---

## 第 3 步：配置 GitHub Secrets

打开 `https://github.com/Chowhound-G/web-wenxuan/settings/secrets/actions`，点 **New repository secret**，添加以下 4 个：

| Secret 名 | 值 | 说明 |
|-----------|-----|------|
| `SERVER_HOST` | `你的服务器公网IP` | 如 `1.2.3.4` 或域名 |
| `SERVER_USER` | `root` 或 `deploy` | SSH 登录用户 |
| `SSH_PRIVATE_KEY` | 私钥**完整内容** | `cat ~/.ssh/web_wenxuan_deploy` 的全部输出（含 BEGIN/END 行） |
| `DEPLOY_PATH` | `/opt/web-wenxuan` | 服务器上项目目录（自动创建） |

> ⚠️ 私钥粘贴时：`cat ~/.ssh/web_wenxuan_deploy` 复制全部，包含 `-----BEGIN/END OPENSSH PRIVATE KEY-----`。

### （可选）创建 Environment
在 `https://github.com/Chowhound-G/web-wenxuan/settings/environments` 创建 `production` 环境，可加：
- **Required reviewers**：部署前需人工点 approve（防止误部署）
- **Deployment branches**：限制只允许 main 部署

---

## 第 4 步：初始化服务器目录

SSH 到服务器，创建部署目录和数据初始化（**仅首次**）：
```bash
sudo mkdir -p /opt/web-wenxuan
sudo chown $USER:$USER /opt/web-wenxuan
cd /opt/web-wenxuan

# 创建 .env（数据库密码，改掉默认 123456）
cat > .env <<'EOF'
MYSQL_ROOT_PASSWORD=改成强密码
MYSQL_DATABASE=web
EOF

# 首次需导入数据库 schema（CD 只起 backend 容器，需先有 MySQL）
# 方案：先单独起一个 MySQL 导入，或用 init_db.sql 挂载
# 最简：临时起 mysql 导入
docker run --rm -v $(pwd):/data -e MYSQL_ROOT_PASSWORD=改成强密码 mysql:8.0 \
  sh -c "sleep 20 && mysql -h 127.0.0.1 -uroot -p\$MYSQL_ROOT_PASSWORD -e 'source /data/init_db.sql'"
```

> 完整的 MySQL + 数据初始化建议参考 `docker-compose.prod.yml`（含 mysql 服务的完整定义）。
> CD workflow 里的 `docker-compose.cd.yml` 只覆盖 backend + frontend 两个镜像，MySQL 建议在服务器上单独持久化运行（数据更安全）。

---

## 第 5 步：触发部署

完成以上配置后，**push 到 main**：
```bash
git push origin main
```

GitHub Actions 会自动：
1. ✅ 跑后端测试
2. ✅ 构建并推送镜像到 ghcr.io
3. ✅ SSH 到服务器拉新镜像并重启

在 `https://github.com/Chowhound-G/web-wenxuan/actions` 查看运行状态。

如需把 CI/CD 结果推送到飞书群，参考 `deploy/FEISHU-NOTIFY.md` 配置 `FEISHU_BOT_WEBHOOK` 和可选的 `FEISHU_BOT_SECRET`。

---

## 运维命令（部署后在服务器上用）

```bash
cd /opt/web-wenxuan

# 查看服务状态
docker compose -f docker-compose.cd.yml ps

# 查看日志
docker compose -f docker-compose.cd.yml logs -f backend
docker compose -f docker-compose.cd.yml logs -f frontend

# 手动重启
docker compose -f docker-compose.cd.yml restart

# 手动回滚（拉旧 sha）
docker pull ghcr.io/chowhound-g/web-wenxuan-backend:<旧sha>
docker compose -f docker-compose.cd.yml up -d
```

---

## 常见问题

### Q: 部署失败 "docker login ghcr.io 权限不足"
GHCR 私有镜像需要 token。在 GitHub Secrets 加 `GHCR_PAT`（Personal Access Token，勾选 `read:packages`），或把仓库的包设为 public：`https://github.com/users/Chowhound-G/packages/container/web-wenxuan-backend/settings` → Change visibility → Public。

### Q: 国内服务器拉 ghcr.io 超时
见 1.3 配镜像加速。仍不行用方案 B（阿里云 ACR）。

### Q: 部署后网站打不开
1. 检查防火墙：`sudo ufw allow 80`（或云厂商安全组放行 80）
2. 检查容器：`docker ps` 看 frontend 是否 running
3. 看日志：`docker logs projectku-frontend-prod`

### Q: 不想自动部署，想手动控制
在 workflow 里把 deploy job 的触发改为 `workflow_dispatch`：
```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:  # 加这行，就能在 Actions 页面手动点 Run
```
然后删掉 deploy job 的 `if: github.event_name == 'push'`。

---

## 方案 B：改用阿里云 ACR（国内服务器首选）

如果 GHCR 国内拉不动，改用阿里云容器镜像服务 ACR：

1. 开通阿里云 ACR 个人版（免费）：https://cr.console.aliyun.com
2. 创建命名空间 + 镜像仓库（backend、frontend）
3. 在 GitHub Secrets 加：
   - `REGISTRY`：`registry.cn-hangzhou.aliyuncs.com`
   - `REGISTRY_USERNAME`：阿里云账号
   - `REGISTRY_PASSWORD`：访问凭证密码
4. 改 ci.yml 的 `REGISTRY` 和 `IMAGE_PREFIX` 为阿里云地址

国内服务器拉 ACR 同内网，秒级。

---

## 资源建议

| 服务规模 | 配置 | 月费 |
|---------|------|------|
| 测试/Demo | 2C4G | ¥50-100 |
| **小规模生产** | **4C8G** | **¥150-250** |
| 中规模 | 8C16G | ¥400-600 |

内存分配（8G 参考）：backend JVM 2G + MySQL 1G + 系统 1G + 其他 2G + buffer 2G。
