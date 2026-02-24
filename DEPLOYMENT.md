# Fund Tracker 部署指南

## 目录结构

在NAS上创建如下目录：
```
Docker_SSD/docker/
├── nginx/                  # 已有NGINX配置
└── fund-tracker/           # 新建，项目放这里
    ├── Dockerfile
    ├── .env
    ├── package.json
    ├── package-lock.json
    └── src/ ...            # 项目源码
```

---

## 1. 需要拷贝的文件

把本地项目的以下文件和文件夹拷贝到 `Docker_SSD/docker/fund-tracker/`：

| 文件/文件夹 | 说明 |
|-------------|------|
| `Dockerfile` | 见下方内容 |
| `.env` | 见下方内容 |
| `package.json` | 项目依赖配置 |
| `package-lock.json` | 依赖锁文件 |
| `tsconfig.json` | TypeScript配置 |
| `next.config.ts` | Next.js配置 |
| `next-env.d.ts` | Next.js类型 |
| `src/` | 源代码目录 |
| `public/` | 静态资源 |
| `messages/` | i18n翻译文件 |
| `.eslintrc.json` | ESLint配置(如有) |
| `postcss.config.mjs` | PostCSS配置(如有) |

**不要拷贝**：`.next/`、`node_modules/`、`.git/`、`tests/`

---

## 2. Dockerfile

在 `fund-tracker/` 目录下创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

---

## 3. 环境变量

在 `fund-tracker/` 目录下创建 `.env` 文件，填入以下内容：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
FEISHU_APP_ID=xxx
FEISHU_APP_SECRET=xxx
```

**注意**：把 `xxx` 换成实际值，这些是原开发者的Supabase和飞书配置。

---

## 4. 构建Docker镜像

SSH登录NAS，执行：

```bash
cd /Docker_SSD/docker/fund-tracker
docker build -t fund-tracker .
```

构建完成后删除本地源码（镜像里已有）：

```bash
rm -rf /Docker_SSD/docker/fund-tracker/src
rm -rf /Docker_SSD/docker/fund-tracker/public
# 只保留以下文件即可
ls -la /Docker_SSD/docker/fund-tracker/
```

保留的文件：
- Dockerfile
- .env
- package.json
- package-lock.json

---

## 5. 运行容器

```bash
docker run -d -p 3000:3000 --name fund-tracker --restart unless-stopped fund-tracker
```

验证是否启动成功：

```bash
docker logs fund-tracker
curl http://localhost:3000
```

---

## 6. NGINX反向代理

编辑 `/Docker_SSD/docker/nginx/conf/nginx.conf` 或对应的站点配置文件，在 `server` 块内添加：

```nginx
location / {
    proxy_pass http://172.17.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
}
```

> 注意：`172.17.0.1` 是Docker默认网关IP，如果容器无法访问，检查实际IP或使用 `--network host` 模式。

重载NGINX配置：

```bash
docker exec nginx nginx -s reload
```

或通过极空间UI重启NGINX容器。

---

## 7. 访问

完成以上步骤后，通过域名访问：`https://你的域名`

---

## 常用命令

```bash
# 查看容器日志
docker logs -f fund-tracker

# 重启容器
docker restart fund-tracker

# 停止容器
docker stop fund-tracker

# 更新部署
cd /Docker_SSD/docker/fund-tracker
docker build -t fund-tracker .
docker stop fund-tracker && docker rm fund-tracker
docker run -d -p 3000:3000 --name fund-tracker --restart unless-stopped fund-tracker
```

---

如有疑问联系开发者。
