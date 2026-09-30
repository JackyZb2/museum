# MuseumAI Studio

新用户请先阅读 [当前功能与使用说明](docs/USER_GUIDE.md)，包含 D 盘项目的 PyCharm 环境设置、启动方法与 AI 知识卡操作。

MuseumAI Studio 是面向博物馆数字资产管理与文化内容工作的开源项目。当前版本保留已有文物管理演示，并提供中文后台、Prisma/SQLite 核心数据模型，以及基于 AI Provider 的文物知识卡分析流程。

## 本地运行（无需 Docker）

需要 Python 3.12 或兼容版本，以及 Node.js。首次运行前，在项目根目录执行：

```powershell
Copy-Item .env.example frontend/.env
Copy-Item .env.example backend/.env
```

在 `frontend/.env` 中，`PRISMA_DATABASE_URL` 配置 Prisma SQLite 文件；在 `backend/.env` 中，`DATABASE_URL` 配置 FastAPI 使用的 SQLite 文件。

分别打开两个 PowerShell 终端：

```powershell
# 终端一：启动后端 API
cd D:\Codex\projects\MuseumAI-Studio
.\backend\run-local.ps1
```

```powershell
# 终端二：初始化 Prisma 数据库并启动前端
cd D:\Codex\projects\MuseumAI-Studio
.\frontend\run-local.ps1
```

前端地址为 http://localhost:3000，后端接口文档为 http://localhost:8000/docs。

## Prisma 数据库命令

在 `frontend/` 目录运行：

```powershell
pnpm db:generate  # 生成 Prisma Client
pnpm db:migrate   # 开发时创建并应用迁移
pnpm db:deploy    # 应用已提交的迁移
pnpm db:seed      # 写入最小工作区种子
```

## 质量检查

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
```

## 当前功能

- 中文工作台、文物资产列表、新增/编辑/详情页面和演示入口。
- “AI 文物知识卡”入口：上传图片与来源文字，启动六阶段分析，查看待审核知识卡，并人工修改基础信息和标签。
- 文物详情可一次生成普通游客、儿童、专业和 30 秒四种 AI 讲解；显示内容依据，保存版本和审计记录。无资料时只生成受限内容，结果均需人工审核。
- `/assets/[id]/review` 提供四种讲解的中文审核界面：人工编辑、保存、审核通过、重新生成保留旧版，以及处理记录时间线；审核不会自动发布。
- 至少一条讲解审核通过后，后台可发布文物；`/exhibit/[id]` 提供移动端可浏览的中文游客展示页，只展示已审核讲解，未发布文物返回 404。
- 现有 FastAPI 文物记录 API，以及本地图片和资料文档管理。
- Prisma SQLite 核心模型：博物馆工作区、文物资产、来源文档、扩展元数据、讲解内容和审计日志。
- SQLite 支持的文物状态：草稿、处理中、待审核、已通过、已发布（代码值分别为 `DRAFT`、`PROCESSING`、`REVIEW_REQUIRED`、`APPROVED`、`PUBLISHED`）。

Prisma 数据库和既有 FastAPI/SQLAlchemy 数据库目前独立，详细边界与后续整合注意事项见 [架构说明](docs/ARCHITECTURE.md)。

## 目录

- `frontend/`：Next.js、TypeScript、Prisma 和中文管理界面。
- `backend/`：FastAPI、SQLAlchemy、Alembic 和本地文件存储。
- `docs/`：架构与项目说明。

本项目采用 Apache License 2.0。

## AI Provider 基础层

AI 能力统一从服务端 `frontend/lib/ai/` 获取 Provider；提示词集中在 `frontend/lib/prompts/`。`.env.example` 默认开启 `DEMO_MODE=true`，本地无需 API Key，返回明确标记为模拟的结果。缺少密钥时也自动使用 Mock。当前可在 `/assets/new` 上传文物，再于 `/assets/[id]` 点击“开始 AI 分析”或“生成 AI 讲解”。讲解必须依据资料，生成后仍须人工审核。详见 [AI Provider 设计](docs/ai-design.md)。

新知识卡使用 Prisma/SQLite；旧 `/artifacts` 页面仍使用 FastAPI/SQLAlchemy，两套数据暂不互通。图片保存在 `frontend/.local-uploads/`，不会提交到 Git。当前仅支持粘贴文字作为来源资料，不解析 PDF/Word；Mock 模式不会真实识图。项目尚未接入登录与权限控制，请只在可信本地环境试用，不要直接对公网开放。

Mock 端到端验证：先启动前端，再在 `frontend/` 执行 `pnpm test:flow`（默认测试 `http://127.0.0.1:3100`；若前端在常用的 3000 端口，先设置 `$env:TEST_BASE_URL='http://127.0.0.1:3000'`）。测试会创建并清理一条临时文物记录。
