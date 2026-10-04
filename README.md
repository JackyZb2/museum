# MuseumAI Studio

## MVP 最终验收（2026-10-04）

当前是可在可信本地环境演示的 MVP，不是生产发布版本。新增、图片上传、来源文字、分析、四种讲解、人工编辑与审核、发布、游客展示闭环已验证；**新流程馆藏资料文件上传与授权确认尚未实现，严格全项验收未通过**。详见 [最终验收报告](MVP_FINAL_REPORT.md)、[当前状态](CURRENT_STATE.md)、[产品概览](docs/product-overview.md) 和 [后续规划](ROADMAP.md)。

首页 `/`，工作台 `/dashboard`，标准流程 `/assets/new`，离线演示 `/demo`。新核心流程只需 Next.js 本地服务和 SQLite，**无需 Docker，也无需启动 Python 后端**；下方双终端说明只在同时使用旧 `/artifacts` 功能时需要。

首次准备：安装兼容 Node.js（至少 20.9，建议已受支持的版本）和 pnpm，在项目根目录仅当 `frontend/.env` 不存在时复制 `.env.example`，避免覆盖已有密钥：

```powershell
cd D:\Codex\projects\MuseumAI-Studio
if (-not (Test-Path frontend/.env)) { Copy-Item .env.example frontend/.env }
cd frontend
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

已安装环境日常启动：在项目根目录执行 `.\frontend\run-local.ps1`。无系统 Node/pnpm 时，该脚本会尝试本机 Codex 缓存运行时；此回退路径并不适用于每台电脑。

断网前完成依赖安装、迁移和客户端生成。`DEMO_MODE=true` 或未配置 `AI_API_KEY` 使用 Mock；`/demo` 无论全局配置如何都使用本地模拟模型。普通业务配置真实密钥后若 AI 断连，讲解会提示失败，不会悄悄伪造真实生成结果，此时请使用 `/demo`。

最终验收命令（在 `frontend` 目录，隔离数据库与上传目录）：

```powershell
$env:MUSEUMAI_BUILD_DIR = '.next-publish-test'
pnpm lint
pnpm typecheck
pnpm build
pnpm test:ai
pnpm test:mvp
pnpm test:demo
pnpm test:stability
Remove-Item Env:MUSEUMAI_BUILD_DIR
```

`test:mvp` 使用 33160 端口。自动接口耗时不等于人工演示耗时；本次浏览器标准闭环实测约 71 秒，未包含缺失的资料文件上传与授权确认。不要把这两个缺失项展示为已完成。

新用户请先阅读 [当前功能与使用说明](docs/USER_GUIDE.md)，包含 D 盘项目的 PyCharm 环境设置、启动方法与 AI 知识卡操作。

创业答辩请打开 `/demo`，并阅读 [三分钟离线演示脚本](docs/demo-script.md)。提供青铜鼎、青花瓷瓶、陶俑三个本地演示样本，可完成分析、四种讲解、人工确认、发布和游客浏览，无需真实 AI 或互联网。首次安装依赖与迁移请在断网前完成，演示仅需前端本地服务。

下载本版本完整源码：[MuseumAI-Studio-v0.3.0-source.zip](MuseumAI-Studio-v0.3.0-source.zip)。压缩包不包含本地密钥、数据库、上传文件、依赖目录或旧版压缩包。版本说明见 [v0.3.0](docs/releases/v0.3.0.md)。

MuseumAI Studio 是面向博物馆数字资产管理与文化内容工作的开源项目。当前版本保留已有文物管理演示，并提供中文后台、Prisma/SQLite 核心数据模型，以及基于 AI Provider 的文物知识卡分析流程。

## 本地运行（无需 Docker）

仅使用旧版馆藏管理时需要 Python 3.12 或兼容版本，以及 Node.js。下列配置复制前请确认目标文件不存在，避免覆盖已有配置：

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

异常处理与稳定性检查结果见 [QA 报告](QA_REPORT.md)。前端图片完整性校验使用 Sharp，Node.js 需要 20.9 或更新版本。

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
