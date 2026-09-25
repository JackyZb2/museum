# MuseumAI Studio v0.1 Demo 使用说明书

## 1. Demo 简介

MuseumAI Studio 是一个面向博物馆数字资产管理的开源 Web Demo。

当前版本支持：

- 查看文物列表
- 创建、编辑、删除文物
- 查看文物详情
- 上传文物图片
- 上传 PDF、Word、TXT 资料
- PostgreSQL 数据持久化

当前版本暂不包含 AI、RAG、OCR、AR、3D、登录和权限系统。

## 2. 启动前准备

需要安装：

- Python 3.12.x
- PyCharm
- Node.js
- Docker Desktop

在 PyCharm 中将项目解释器设置为：

```text
backend/.venv/Scripts/python.exe
```

## 3. 启动项目

在 PyCharm 终端进入项目根目录：

```powershell
cd C:\Users\1\Documents\Codex\2026-09-25\files-pasted-by-the-user-museumai
```

启动全部服务：

```powershell
docker compose up --build
```

首次启动会自动：

1. 启动 PostgreSQL
2. 执行数据库 migration
3. 创建 Demo Museum
4. 创建两件示例文物
5. 启动 FastAPI 后端
6. 启动 Next.js 前端

## 4. 访问地址

| 服务 | 地址 |
|---|---|
| 前端 Dashboard | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| Swagger 文档 | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

## 5. Dashboard 使用

打开：

```text
http://localhost:3000
```

Dashboard 页面包含：

- Artifacts：文物数量
- Assets：数字资产区域
- Documents：资料区域
- Recent Artifacts：最近创建的文物

点击左侧导航中的 `Artifacts`，进入文物管理页面。

## 6. 创建一件文物

1. 点击 `+ New Artifact`
2. 填写：

```text
Artifact Name: Test Bronze Vessel
Dynasty: Shang
Category: Bronze
Material: Bronze
Inventory Number: TEST-001
Description: Demo artifact for MuseumAI Studio.
```

3. 点击 `Create Artifact`
4. 创建成功后会自动进入详情页

## 7. 查看文物列表

进入：

```text
http://localhost:3000/artifacts
```

列表显示：

- 名称
- 朝代
- 类别
- 材质
- 编号
- View
- Edit
- Delete

可以使用顶部搜索框搜索文物名称或编号。

## 8. 上传图片

1. 打开任意文物详情页
2. 找到 `Digital Assets`
3. 点击 `Upload`
4. 选择图片文件

支持格式：

```text
.jpg
.jpeg
.png
.webp
```

上传后图片会显示在数字资产区域中，并包含：

- 图片预览
- 原始文件名
- 文件大小
- 删除按钮

## 9. 上传文档

1. 打开文物详情页
2. 找到 `Documents`
3. 点击 `Upload`
4. 选择资料文件

支持格式：

```text
.pdf
.doc
.docx
.txt
```

单个文件最大限制为 20MB。

## 10. 编辑文物

1. 在文物列表点击 `Edit`
2. 修改文物基础信息
3. 点击 `Save Changes`

可修改字段：

- Name
- Dynasty
- Category
- Material
- Inventory Number
- Description

## 11. 删除文物

在文物列表点击 `Delete`，确认后会删除文物数据库记录，以及关联的 Asset 和 Document 数据记录。

当前版本的本地上传文件不会自动删除，这是 Week 1 的简化处理，后续接入对象存储时再完善。

## 12. Swagger API 检查

打开：

```text
http://localhost:8000/docs
```

可以测试以下 API：

```text
GET    /api/museums
POST   /api/museums
GET    /api/museums/{id}
GET    /api/artifacts
POST   /api/artifacts
GET    /api/artifacts/{id}
PUT    /api/artifacts/{id}
DELETE /api/artifacts/{id}
POST   /api/artifacts/{id}/assets
DELETE /api/assets/{id}
POST   /api/artifacts/{id}/documents
DELETE /api/documents/{id}
```

## 13. 数据持久化验证

完成创建、上传和编辑后，刷新浏览器。

如果数据仍然存在，说明数据已保存到 PostgreSQL，而不是只存在于浏览器内存中。

也可以停止服务后重新启动：

```powershell
docker compose down
docker compose up
```

只要没有执行 `docker compose down -v`，数据库数据应该仍然保留。

## 14. 常见问题

### 页面无法打开

确认 Docker Desktop 正在运行，并检查：

```powershell
docker compose ps
```

### 端口被占用

检查 3000、8000、5432 端口是否被其他程序使用。

### 上传失败

检查：

- 文件格式是否支持
- 文件是否超过 20MB
- backend 容器是否正常运行

### 看不到初始化文物

查看后端日志：

```powershell
docker compose logs backend
```

### 重新初始化数据库

仅在需要清空 Demo 数据时执行：

```powershell
docker compose down -v
docker compose up --build
```

注意：该命令会删除本地 Docker 数据卷中的数据库数据。

## 15. 推荐验收流程

按以下顺序完成一次完整 Demo：

1. 打开 Dashboard
2. 进入 Artifacts
3. 创建 `Test Bronze Vessel`
4. 上传一张 JPG 图片
5. 上传一个 PDF 文件
6. 刷新详情页
7. 编辑 Description
8. 返回列表确认数据存在
9. 删除该测试文物
10. 打开 Swagger 确认 API 可用

## 16. 当前版本

```text
MuseumAI Studio v0.1
```

本版本目标是建立稳定、简单、可扩展的博物馆数字资产管理基础架构。AI 功能将在后续版本中加入。

