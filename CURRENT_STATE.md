# MuseumAI Studio 当前状态审计

> 审计日期：2026-09-30
> 仓库：`D:\Codex\projects\MuseumAI-Studio`
> 后续更新：同日完成基础架构与 Prisma/SQLite 数据库阶段。下文原审计中的“未发现 Prisma”描述是实施前基线；当前状态以“本阶段实施更新”小节为准。
> 限制：在当前项目目录、`D:\Codex`、原 Codex 文档目录及临时目录中均未找到 `MVP_DEVELOPMENT_PLAN.md`。因此下文的 MVP Gap Analysis 是基于当前仓库和此前确定的产品方向（博物馆数字资产管理、AI 内容生成、文物/资产/知识/版权关联）形成的暂定判断，不能代替对该计划逐项核对。请将计划文件放入仓库根目录后再做正式逐条对照。

## Current Architecture

- 前端位于 `frontend/`，采用 Next.js 15 App Router、React 19、TypeScript strict mode、ESLint、Prettier 和 Tailwind CSS；页面位于 `frontend/app/`，共用表单位于 `frontend/components/`。
- 前端通过 `frontend/lib/api.ts` 调用 FastAPI，API 地址由 `NEXT_PUBLIC_API_URL` 配置。类型集中在 `frontend/types/index.ts`。
- 后端位于 `backend/`，采用 FastAPI、SQLAlchemy 2、Pydantic、Alembic。当前 API 路由集中在 `backend/app/api/routes.py`，实体模型和 schema 分别位于 `models/entities.py`、`schemas/entities.py`。
- SQLite 是本地演示默认数据库；Compose 部署预期使用 PostgreSQL。上传文件保存在本地 `backend/uploads/`，通过 `/uploads` 静态路由访问。
- 既有 FastAPI 数据实体有 `Museum`、`Artifact`、`Asset`、`Document` 四类，由 SQLAlchemy/Alembic 管理。另新增 Prisma SQLite 核心数据层：`Museum`、`MuseumAsset`、`SourceDocument`、`AssetMetadata`、`Narration`、`AuditLog`。
- 存在多个项目副本：根目录、`work/github-upload/`（带有连到 GitHub 的 Git 历史）以及 `outputs/MuseumAI-Studio-GitHub-Upload/`。根目录自己的 `.git` 当前显示为尚无提交的 `master`；GitHub 对应的已提交工作副本实际是 `work/github-upload/`。这会造成开发位置、提交位置不明确。
- `docker-compose.yml` 首行原本混入了 PowerShell 命令，Compose YAML 无法正常解析。本次仅移除了污染内容并恢复 `services:` 顶层键；未进行容器启动验证。

## Existing Features

- 中文工作台首页：显示文物总数、最近新增文物入口。
- 文物记录列表、按名称/藏品编号搜索、详情、新建、编辑、删除。
- 文物字段：名称、朝代、类别、材质、藏品编号、描述及所属博物馆。
- 文物详情页支持图片上传/删除和资料文档上传/删除。
- 后端提供博物馆列表/创建/详情，文物 CRUD，资产/文档上传与删除 API。
- 首次 SQLite 启动会创建表并写入示例博物馆和两条示例文物；同时保留 Alembic 初始迁移。
- 上传扩展名白名单：图片为 JPG/JPEG/PNG/WEBP，文档为 PDF/DOC/DOCX/TXT；配置单文件大小上限 20MB。
- Docker Compose 配置包含 PostgreSQL、FastAPI 和 Next.js 服务；本地 PowerShell 脚本分别启动前后端。
- 新增 Prisma migration、最小工作区 seed、工作流状态类型，以及工作台/文物资产/新增文物/功能演示导航。
- AI 图像识别、知识库/RAG、AI 解说生成、审核、引用、版权授权、用户/角色权限等并未实现。

## Reusable Components

- `frontend/lib/api.ts`：统一 API 封装和文物、上传、删除调用，可扩展分页、错误处理及新业务端点。
- `frontend/types/index.ts`：前端实体类型与后端响应结构对应，可沿用并逐步拆分领域类型。
- `frontend/components/ArtifactForm.tsx`：新建和编辑共用的文物表单组件。
- `backend/app/models/entities.py` 与 `backend/app/schemas/entities.py`：SQLAlchemy 实体和 Pydantic 输入/输出 DTO 分层可延续。
- `backend/app/services/storage.py`：文件校验、随机文件名、分块读写和大小限制，可作为本地存储适配器基础。
- `backend/app/db/session.py`、`backend/alembic/`：数据库连接、会话和迁移机制可复用。
- `frontend/prisma/schema.prisma`、Prisma migration 和 `frontend/lib/prisma.ts`：可作为新核心模型和后续服务端数据操作的基础。
- `backend/app/main.py` 的 lifespan 示例数据逻辑可用于演示环境；正式部署前应区分开发种子数据和生产初始化。
- 中文文物字段和界面文案可继续作为产品中文化基础；产品中出现的代码标识、API 路径及数据库字段仍使用英文。

## Missing Features

以下缺失项按既定产品方向归纳，待拿到 `MVP_DEVELOPMENT_PLAN.md` 后确认优先级和范围：

- 多馆/用户身份认证、组织隔离、角色权限及馆藏数据访问控制。
- 更完整的数字资产元数据：来源、版权状态、授权范围、用途限制、分辨率、校验值、版本和水印状态。
- 史料/知识文档独立管理、文档解析、检索、与文物和生成内容之间的可追溯关联。
- AI 任务编排及结果数据模型：视觉标签、解说生成、人工审核、引用来源和版本记录。
- 数据操作审计日志、导入导出、列表分页/筛选/排序、表单校验与明确的失败反馈。
- 对象存储替换接口、孤儿文件清理策略、备份恢复和存储一致性处理。
- 自动化测试、CI、部署配置与运维说明。
- 全产品中文体验仍需收尾：前端 API 错误回退文字含英文，README、架构文档、API 标题及部分安装说明为英文或中英混合。

## Technical Risks

1. **Git 工作目录不清楚**：根目录没有已提交历史，真正连接 GitHub 的仓库在 `work/github-upload/`。如果在根目录直接提交/推送，可能不会更新 GitHub 上的项目。
2. **重复项目副本易漂移**：根目录、GitHub 上传副本和输出副本可能不一致；应先确定唯一主工作树，再制定副本生成方式。
3. **数据库边界暂时并存**：既有 API 使用 SQLAlchemy SQLite/可选 PostgreSQL，新核心模型使用独立 Prisma SQLite 文件。页面和 API 尚未切换到 Prisma，未来需要数据迁移并选定单一 schema 迁移责任方。
4. **文件与数据库事务不一致**：删除资产/文档只删数据库记录，不删磁盘文件；数据库提交失败时上传文件也可能遗留。数据库级联删除同样不会清理文件。
5. **上传校验有限**：仅按扩展名检查，未验证真实文件类型；尺寸上限有配置但错误信息写死为 20MB；目标路径和 URL 的表示方式依赖当前工作目录。
6. **错误处理不一致**：通用错误响应使用 `message`，FastAPI `HTTPException` 默认使用 `detail`；前端普通请求只读取 `message`，上传则读取 `detail`。一些页面使用空 catch，可能把网络/API 错误表现成空列表。
7. **前端职责集中且代码压缩**：页面、API 类型和展示逻辑缺少组件/领域模块边界；单行密集代码降低维护性。编辑页通过新建页导入表单组件也让页面模块耦合。
8. **更新接口语义偏宽**：更新使用完整 `ArtifactCreate` schema 的 PUT，前端却传 `Partial<Artifact>`；字段缺失会被 Pydantic/schema 默认值处理，后续扩展时易造成字段意外清空。
9. **安全与部署设置仅适合演示**：CORS 只允许 localhost:3000；没有认证；Compose 使用演示数据库口令；上传文件以静态形式公开。不能直接视为生产部署方案。
10. **本地启动依赖机器特定路径**：`frontend/run-local.ps1` 写入 Codex Node/pnpm 绝对路径；若本机没有该路径且缺少系统 Node.js，脚本不能启动。前端 `node_modules` 在当前目录存在但 `node_modules/next/package.json` 检查未通过，依赖安装状态可疑。
11. **Compose 配置刚修复但未运行**：已恢复 `services:` 顶层声明；本次未运行 Docker 验证，主机此前也遇到 Docker Desktop 虚拟化/引擎问题。
12. **计划文件缺失**：无法验证当前实现是否符合阶段边界、验收条件、文件清单或用户优先级。

## MVP Gap Analysis

> 暂定对照：项目定位为博物馆数字资产管理与 AI 内容生成工作台。由于开发计划文件缺失，以下状态是审计推断，不代表计划原文要求。

| 能力域 | 当前状态 | 初步差距 |
| --- | --- | --- |
| 文物档案 | 已有基础 CRUD 与搜索 | 缺少完整筛选/分页、数据校验、批量操作及更丰富字段 |
| 数字资产管理 | 可关联图片并上传/删除 | 元数据、版权授权、来源、版本、预览能力和文件清理未覆盖 |
| 知识资料 | 文档可关联文物并上传/删除 | 没有独立知识文档管理、解析、索引、检索和来源片段 |
| AI 内容生成 | 未实现 | 没有 AI 服务接入、任务状态、生成内容版本和可配置提示词 |
| 审核与可信引用 | 未实现 | 没有审核流、引用/证据绑定、修改记录或发布状态 |
| 用户与多馆隔离 | 未实现 | 缺少登录、角色、权限和馆际数据隔离 |
| 持久化与文件存储 | 既有 SQLAlchemy 数据库与新 Prisma SQLite migration 分别可用 | 两个 SQLite 数据库尚未整合；备份、对象存储、事务一致性和文件生命周期尚待完善 |
| 中文产品体验 | 核心页面主要为中文 | 错误信息、文档和 API 元信息存在英文/混合语言；无系统性文案盘点 |
| 工程质量 | 有类型、迁移、启动脚本 | 无测试/CI；开发主工作树不清；依赖安装状态及 Docker 配置尚未端到端验证 |

## Recommended Development Order

1. 将 `MVP_DEVELOPMENT_PLAN.md` 放入项目根目录，确认 Phase 1 范围、验收标准和禁止提前实现的内容；按其原文重做正式 Gap Analysis。
2. 确认唯一 Git 主工作树，统一在该位置开发；处理根目录 Git 元数据与 GitHub 上传副本的关系，避免跨副本修改。
3. 按计划优先补齐 Phase 1 的数据模型/API/界面闭环；保持每个阶段可运行、可验收。
4. 在数据模型扩展前明确博物馆、文物、资产、知识、版权/用途之间的关系，并用 Alembic 管理 schema 演进。
5. 对上传、删除、错误反馈、表单状态和数据一致性做针对性完善；再接入计划中要求的 AI 与审核能力。
6. 建立与 Phase 1 验收项对应的自动化验证和启动说明，最后进行端到端验收。

## 下一阶段文件清单（暂定，需以计划原文校准）

此列表只做规划，本次未新增或删除这些文件：

- **可能新增**：`backend/app/api/` 下按领域拆分的路由模块、`backend/app/services/` 下业务服务、`frontend/components/` 下共用表单/状态/布局组件、`frontend/lib/` 下 API 错误与配置辅助、`backend/alembic/versions/` 新迁移、与验收点对应的前后端测试文件。
- **可能修改**：`backend/app/models/entities.py`、`backend/app/schemas/entities.py`、`backend/app/api/routes.py`、`backend/app/core/config.py`、`frontend/types/index.ts`、`frontend/lib/api.ts`、相关 `frontend/app/` 页面、`frontend/package.json`、`.env.example`、`README.md`。
- **可能删除或归档**：确认唯一主工作树后，才评估是否移除/重新生成 `outputs/MuseumAI-Studio-GitHub-Upload/` 等过期副本；当前不建议删除任何副本，也不应在未查明 Git 历史前删改 `.git`。
- **必要输入**：项目根目录的 `MVP_DEVELOPMENT_PLAN.md`。缺少它时，不应开始任何 Phase 1 之后的开发。

## 修改记录

- 本次新增本文件作为审计结果。
- 本次修正 `docker-compose.yml` 中导致 Compose 文件无法解析的污染首行；未实现新功能，也未进行大规模重构。
- 本次未执行自动化测试或容器启动；运行状态需在具备可用 Node/Python 依赖和 Docker 引擎的环境中确认。

## 本阶段实施更新

- 已新增 Prisma schema、SQLite migration 和最小 seed；migration `20260930010000_init_core` 已在本地 Prisma 数据库应用。
- 已配置 TypeScript strict、ESLint、Prettier、Prisma Client 和数据库脚本；Next.js 升级到 15.5.26。
- 已新增后台中文导航及功能演示占位页，并将文物表单从页面文件移到共用组件目录，以通过 Next.js 页面导出检查。
- lint、typecheck、build 均通过。当前数据库状态为一条 migration 已应用；完整运行结果见本次交付说明。
