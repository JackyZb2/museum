# MuseumAI Studio 架构说明

## 当前结构

- `frontend/`：Next.js App Router、React、TypeScript strict mode 和 Tailwind CSS，负责中文管理界面。
- `frontend/prisma/`：Prisma schema、SQLite migration 和基础种子脚本，承载本阶段的核心领域数据模型。
- `frontend/lib/prisma.ts`：Prisma Client 单例，供 Next.js 服务端代码复用。
- `frontend/lib/ai/`：服务端 AI Provider 接口、兼容模型实现、Mock 实现、结果校验与安全回退；提示词集中在 `frontend/lib/prompts/`。`frontend/app/api/assets/` 提供知识卡创建、图片读取、流式分析、基本字段和标签编辑。详见 [AI Provider 设计](ai-design.md)。
- `backend/`：保留现有 FastAPI、SQLAlchemy 和 Alembic 服务，继续提供 v0.1 文物及文件管理 API。
- `backend/uploads/`：本地演示文件存储；未来可由对象存储适配器替换。

## 数据库边界

本阶段的 Prisma SQLite 数据库由 `PRISMA_DATABASE_URL` 配置，默认文件位于 `frontend/prisma/museumai-core.db`。现有 FastAPI 使用 `DATABASE_URL`，本地默认文件为 `backend/museumai.db`。两者暂时独立：这是为了保留现有 API 和 SQLAlchemy 数据，不在基础架构阶段重写后端。

新 `/assets` 知识卡页面/API 使用 Prisma 数据；旧 `/artifacts` 页面/API 继续使用 FastAPI 数据。两套记录目前不能互查；整合前应制定旧 `Museum`、`Artifact`、`Asset`、`Document` 数据迁移方案，并选定唯一的 schema 迁移责任方。

## Prisma 核心模型

- `Museum`：博物馆/工作区，是藏品资产的归属主体。
- `MuseumAsset`：文物数字资产主记录，含藏品编号、类别、朝代、材质、尺寸、描述、图片地址、授权状态和工作流状态。
- `SourceDocument`：可关联藏品的来源文档和文本资料。
- `AssetMetadata`：藏品的可扩展键值元数据。
- `Narration`：与藏品关联的四种中文讲解、版本号、来源资料 ID、来源引用和待审核状态。
- `AuditLog`：记录操作主体、动作、目标实体和详情。

藏品状态在 SQLite 中以字符串存储，并由数据库检查约束限制为 `DRAFT`、`PROCESSING`、`REVIEW_REQUIRED`、`APPROVED`、`PUBLISHED`。SQLite 的 Prisma connector 不支持原生 enum，因此 TypeScript 侧另有字面量联合类型。

## 迁移与种子

进入 `frontend/` 后运行 `pnpm db:generate` 生成客户端，运行 `pnpm db:deploy` 应用已提交迁移；开发时可用 `pnpm db:migrate` 创建新迁移。`pnpm db:seed` 只确保基础“博物馆工作区”存在，不导入完整示例藏品。

FastAPI 现有表继续由 Alembic 管理。本阶段 Prisma 迁移只管理 Prisma SQLite 文件中的 schema，禁止让两套 ORM 同时修改同一数据库。

## 页面与分析流程

共享后台布局提供“工作台”“文物资产”“新增文物”“AI 文物知识卡”“功能演示”五个中文导航入口。`/assets/new` 创建文物草稿，`/assets/[id]` 提供知识卡、分析进度和人工编辑。分析开始后状态进入 `PROCESSING`，成功后进入 `REVIEW_REQUIRED`。`AssetMetadata` 的键值记录 AI 字段、置信度、推荐/人工标签和原始输出；`AuditLog` 记录开始、完成、失败与人工修改。

新流程上传的图片保存在 `frontend/.local-uploads/`，文件名随机生成，读取经对应文物记录核对；当前只接收 JPEG/PNG/WebP，最大 8 MB。来源资料目前为粘贴的文字，不解析 PDF/Word。部署公网前必须补齐身份认证、馆别权限和文件访问策略。

讲解生成在 `/api/assets/[id]/narrations` 中进行。页面仅向本地 API 提交工作人员资料，模型请求仍由服务端 AI Provider 负责。结果入库前校验四种类型、目标字数及来源 ID/引文；无证据时使用受限模板，模型故障时不保存。生成记录状态为 `AI_GENERATED`，不自动发布。

`/assets/[id]/review` 是讲解审核工作台。编辑和审核分别使用 `/api/assets/[id]/narrations/[narrationId]` 的 `PATCH`、`POST`；更新带 `updatedAt` 乐观并发校验，避免过期页面覆盖新内容。编辑设为 `EDITED`，审核设为 `APPROVED`，已审核版本不可原地修改。重新生成仍通过原有生成 API 追加版本；`/api/assets/[id]/timeline` 汇总文物处理日志。编辑、审核写入 `NARRATION_EDITED`、`NARRATION_APPROVED`。讲解审核状态与文物资产状态相互独立，审核讲解不会把文物自动发布。当前缺少账号认证和人员身份核验，因此这套审核只适用于可信本地演示环境。

`POST /api/assets/[id]/publish` 在事务中检查至少一条 `APPROVED` 讲解且文物未在处理，然后把文物设为 `PUBLISHED` 并写入 `ASSET_PUBLISHED`。游客页 `/exhibit/[id]` 由服务端仅查询已发布文物及已审核讲解，按类型选取最新的已审核版本；未发布返回 404。公开图片接口也要求文物已发布。游客路由不渲染后台导航。现有后台 API 和原图片接口仍无身份认证，故尚不能安全部署公网；正式部署前须增加账号、馆别权限和未发布资产访问控制。

## 工程约定

- 前端使用 TypeScript strict mode。
- ESLint 负责静态检查，Prettier 负责格式化。
- 运行 `pnpm lint`、`pnpm typecheck`、`pnpm build` 作为前端基础质量检查。
- 用户可见界面和提示均使用中文；代码标识、数据库字段和 API 路径使用英文。
