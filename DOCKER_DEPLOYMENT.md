# Docker 部署到 VPS 完整指南（SQLite 版本）

## 📋 目录

1. [准备工作](#准备工作)
2. [上传项目到 VPS](#上传项目到-vps)
3. [配置环境变量](#配置环境变量)
4. [使用 1Panel 部署](#使用-1panel-部署)
5. [配置反向代理和 SSL](#配置反向代理和-ssl)
6. [测试部署](#测试部署)
7. [数据管理](#数据管理)
8. [常见问题](#常见问题)
9. [维护和更新](#维护和更新)

---

## 🎯 准备工作

### 系统要求

- **VPS 配置**: 2核4G 或以上
- **操作系统**: Linux (Ubuntu/Debian/CentOS)
- **已安装**: Docker + Docker Compose
- **已安装**: 1Panel 面板（可选，推荐）
- **域名**: 已解析到 VPS IP

### 需要准备的信息

在开始之前，请准备以下信息：

1. **管理员密码**
   - 用于登录管理后台的密码

2. **访问密钥**（可选）
   - TV.TXT 的访问保护密钥

3. **域名**
   - 您的域名（如 `tv.example.com`）

---

## 📤 上传项目到 VPS

### 方式一：使用 Git（推荐）

在 VPS 上执行：

```bash
# 1. 进入工作目录
cd /opt

# 2. 克隆项目
git clone https://github.com/your-username/tvlist-mm.git

# 3. 进入项目目录
cd tvlist-mm

# 4. 给部署脚本添加执行权限
chmod +x docker-deploy.sh
```

### 方式二：使用 FTP/SFTP

1. 使用 FTP 工具（如 FileZilla、WinSCP）连接到 VPS
2. 将整个 `tvlist-mm` 文件夹上传到 `/opt/tvlist-mm`

### 验证上传

```bash
cd /opt/tvlist-mm
ls -la

# 应该看到以下关键文件：
# - Dockerfile
# - docker-compose.yml
# - .dockerignore
# - docker-deploy.sh
# - .env.docker.example
```

---

## ⚙️ 配置环境变量

### 步骤 1: 创建 .env 文件

```bash
# 进入项目目录
cd /opt/tvlist-mm

# 复制示例文件
cp .env.docker.example .env

# 编辑 .env 文件
nano .env  # 或使用 vim: vim .env
```

### 步骤 2: 填写配置

编辑 `.env` 文件，填写以下内容：

```bash
# ========================================
# 管理员配置
# ========================================
ADMIN_PASSWORD=YourSecurePassword123

# ========================================
# 数据库配置
# ========================================
# Docker 环境使用 Volume 挂载的路径（通常不需要修改）
DATABASE_PATH=/data/tvlist.db

# ========================================
# TV.TXT 访问保护（可选）
# ========================================
TV_TXT_ACCESS_KEY=your-secret-key-2024
TV_TXT_SECONDARY_KEYS=
TV_TXT_RATE_LIMIT=60
```

**重要提示**：

- ✅ **ADMIN_PASSWORD**: 使用强密码，包含大小写字母、数字和特殊字符
- ✅ **DATABASE_PATH**: 保持默认值即可，数据会存储在 Docker Volume 中
- ✅ **TV_TXT_ACCESS_KEY**: 如需保护 TV.TXT 访问，设置此密钥

### 步骤 3: 保存并退出

- **nano 编辑器**: 按 `Ctrl + X`，然后按 `Y`，最后按 `Enter`
- **vim 编辑器**: 按 `Esc`，输入 `:wq`，按 `Enter`

---

## 🚀 使用 1Panel 部署

### 方式一：使用 1Panel 的 Docker Compose（推荐）

#### 步骤 1: 登录 1Panel

打开浏览器，访问：
```
http://your-vps-ip:port
```

#### 步骤 2: 进入容器管理

1. 在左侧菜单中，点击 **容器** → **Compose**
2. 点击右上角的 **创建 Compose**

#### 步骤 3: 填写 Compose 配置

1. **名称**: 填写 `tvlist-mm`
2. **路径**: 选择或输入 `/opt/tvlist-mm`
3. **描述**: 填写 `电视直播源管理系统`
4. 1Panel 会自动读取目录中的 `docker-compose.yml`
5. 点击 **确定**

#### 步骤 4: 启动容器

1. 在 Compose 列表中找到 `tvlist-mm`
2. 点击右侧的 **启动** 按钮
3. 等待容器启动（首次启动需要构建镜像，约 3-5 分钟）

#### 步骤 5: 查看状态

1. 状态变为 **运行中** 表示启动成功
2. 点击容器名称，可以查看详细信息
3. 点击 **日志** 可以查看运行日志

### 方式二：使用命令行部署（备选）

```bash
# 进入项目目录
cd /opt/tvlist-mm

# 执行一键部署脚本
./docker-deploy.sh
```

---

## 🌐 配置反向代理和 SSL

### 在 1Panel 中配置

#### 步骤 1: 创建网站

1. 在 1Panel 左侧菜单中，点击 **网站**
2. 点击右上角的 **创建网站**

#### 步骤 2: 填写网站信息

1. **类型**: 选择 **反向代理**
2. **主域名**: 填写您的域名（如 `tv.example.com`）
3. **代理地址**: 填写 `http://localhost:3000`
4. **备注**: 填写 `tvlist-mm 直播源管理`

#### 步骤 3: SSL 配置

1. 在网站列表中找到刚创建的网站
2. 点击 **SSL** 图标
3. 选择 **申请 SSL 证书**
4. **证书类型**: 选择 **Let's Encrypt**（免费）
5. **邮箱**: 填写您的邮箱
6. 点击 **申请**

---

## ✅ 测试部署

### 1. 测试登录

1. 访问 `https://tv.example.com/login`
2. 输入您在 `.env` 中配置的 `ADMIN_PASSWORD`
3. 点击登录
4. 应该成功跳转到 `/dashboard`

### 2. 测试数据读写

1. 在 Dashboard 中添加一个测试频道
2. 检查是否保存成功
3. 刷新页面，确认数据已持久化

### 3. 测试公开访问（如果配置了密钥）

访问：
```
https://tv.example.com/tv.txt?key=your-secret-key
```

---

## 💾 数据管理

### 数据存储位置

所有数据存储在 Docker Volume `tvlist-data` 中，位于：
```
/var/lib/docker/volumes/tvlist-data/_data/tvlist.db
```

### 备份数据

```bash
# 方式一：备份整个 Volume
docker run --rm -v tvlist-data:/data -v $(pwd):/backup ubuntu tar czf /backup/tvlist-backup-$(date +%Y%m%d).tar.gz /data

# 方式二：直接复制数据库文件
docker cp tvlist-mm:/data/tvlist.db ./tvlist-backup-$(date +%Y%m%d).db
```

### 恢复数据

```bash
# 停止容器
docker-compose down

# 恢复数据库文件
docker cp ./tvlist-backup.db tvlist-mm:/data/tvlist.db

# 启动容器
docker-compose up -d
```

---

## ❓ 常见问题

### 1. 容器启动失败

**解决方法**:
```bash
# 查看日志
docker logs tvlist-mm

# 常见原因：
# - .env 文件未配置
# - 端口 3000 被占用
# - 内存不足
```

### 2. 数据丢失

**原因**: Docker Volume 被删除

**解决方法**: 定期备份数据库文件

### 3. 性能问题

**解决方法**: 调整 docker-compose.yml 中的资源限制

---

## 🔄 维护和更新

### 更新应用代码

```bash
cd /opt/tvlist-mm
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 查看资源使用

```bash
docker stats tvlist-mm
```

---

## 🎉 完成！

现在您的 tvlist-mm 已成功部署到 VPS 上，所有数据都安全存储在 Docker Volume 中！

**访问地址**:
- 管理后台: `https://tv.example.com/dashboard`
- 公开访问: `https://tv.example.com/tv.txt?key=your-key`
