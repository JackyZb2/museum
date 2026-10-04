# MVP 最终验收报告

日期：2026-10-04。主工作区：`D:\Codex\projects\MuseumAI-Studio`。

## 验收结论

**可演示的本地核心业务闭环通过；完整需求清单未全部通过。** 新知识卡流程缺少“上传馆藏资料文件”和“确认授权”，不得用粘贴文字或数据库授权字段代替这两个验收项。本轮不增加功能、不修改生产数据、不实施 Roadmap。

无 API Key 可以演示；专用 `/demo` 不访问真实模型。浏览器标准闭环实测约 **71 秒**，不含首次安装、两个缺失步骤与详细人工事实审查。已观察页面无白屏、控制台无错误；这不是对所有设备和所有输入的绝对保证。

## 已完成功能

中文首页、Dashboard、图片上传和基础字段、来源文字、结构化知识卡、分析进度、推荐/人工标签、四种讲解、来源与版本、人工编辑/审核、独立发布、游客展示、处理日志、三个本地 Demo 样本及重置、错误/加载/空状态反馈。

## 逐项结果

| 步骤 | 结果与证据 |
| --- | --- |
| 1 进入 Dashboard | 浏览器与 HTTP 检查通过 |
| 2 新增文物 | 浏览器表单可用 |
| 3 上传图片 | 浏览器上传本地青铜鼎 PNG 示意图，接口检查有效 PNG；不是实际馆藏照片 |
| 4 青铜鼎、商代、青铜 | 浏览器填写，数据库与游客页核对通过；资料明确是验收样本 |
| 5 上传馆藏资料 | **未通过：新流程无文件上传，现有粘贴来源文字已测试** |
| 6 确认授权 | **未通过：无确认控件，新文物仍为 PENDING；发布 API 未以授权为门槛** |
| 7 创建文物 | 图片和文字来源成功保存为草稿 |
| 8 开始 AI 分析 | 完成六步，进入 REVIEW_REQUIRED |
| 9 分类、标签、描述、知识卡 | 显示且保存模拟结果，明确标记未真实识图；原始输出已验证保存 |
| 10 四种讲解 | 四种 AI_GENERATED 版本与内容依据可见 |
| 11 修改一句 | 浏览器把第一句改为“欢迎根据馆藏登记资料认识这件青铜鼎。”，保存后 EDITED |
| 12 审核通过 | 状态 APPROVED，内容锁定，处理记录可见 |
| 13 发布 | 审核前禁用；审核后 PUBLISHED；记录 ASSET_PUBLISHED |
| 14 游客页面 | 浏览器进入实际 exhibit 路由，无后台导航 |
| 15 内容正确 | 名称、商代、青铜及人工修改句正确；未填介绍显示资料缺失；三个未审核标签禁用 |
| 16 DEMO_MODE 重跑 | 隔离自动测试完成新增、图片、文字来源、分析、四版、编辑、四版审核、发布、游客访问；无真实识图 |
| 17 断开 AI API 重跑 Demo | 测试密钥+不可达 AI 地址+DEMO_MODE=false，专用 Demo 八步成功；未全局断开电脑网络 |

## 测试结果

- `pnpm lint`：通过。
- `pnpm typecheck`：通过。
- `pnpm build`：通过，独立输出目录 `.next-publish-test`，不覆盖正在使用的开发构建。
- `pnpm test:ai`：6 项通过，覆盖来源、受限内容和结构校验。
- `pnpm test:mvp`：三种配置通过。自动正常业务闭环约 0.74/0.71 秒，是接口时间，不是人工演示时间。
- `pnpm test:demo`：三个样本、审核门槛、幂等、恢复、重置、正常馆藏保留、模型隔离、公开图片与游客页通过。
- `pnpm test:stability`：2 项客户端错误单测及服务端异常套件通过，含 AI 断连/错误/非法 JSON/空结果、无密钥、上传失败、数据库故障、404 和重复操作。
- 浏览器：在隔离数据库与上传目录完成真实点击/填写/文件选择/分析/生成/修改/审核/发布/游客页。浏览器只批准普通版，验证其他草稿不公开；自动测试另批准四版。
- 两条既有 Prisma migration 在临时空库应用成功；本轮无新迁移。

稳定性测试主动制造缺表和外键故障，终端出现对应 Prisma 错误日志属于预期注入，不是正常 Demo 的报错。第一次 build 被本轮预览的 Prisma DLL 占用；关闭隔离预览后重跑成功。没有终止用户服务。

浏览器证据：[游客展示截图](outputs/mvp-final/exhibit-acceptance.jpg)。截图在本机 outputs 中，该目录被 Git 忽略，源码发布时不会自动包含。

## 当前架构

Next.js 15.5.26 / React 19 / TypeScript strict / Tailwind；Next.js 服务端 API → AIProvider 或 Prisma 6 + SQLite；图片存储于本地目录。Prompt 集中管理，结构校验后入库。Museum、MuseumAsset、SourceDocument、AssetMetadata、Narration、AuditLog 承载工作流。

旧 FastAPI/SQLAlchemy/Alembic 保留供 `/artifacts` 使用，与 Prisma 库独立，新 MVP 不要求运行它。游客发布门槛为至少一条已审核讲解，未发布页面返回 404；这不代表后台 API 已受登录保护。

## Demo 路径与启动方法

项目首页 `/` → `/dashboard` → `/assets/new` → `/assets/[id]` → `/assets/[id]/review` → `/exhibit/[id]`。答辩快路径 `/demo`，选择样本、开始、核对讲解、明确确认审核发布、进入游客页。

已安装环境：

```powershell
cd D:\Codex\projects\MuseumAI-Studio
.\frontend\run-local.ps1
```

打开 `http://localhost:3000/`。无需 Docker 或 Python 后端。首次使用先准备 Node/pnpm、复制未存在的 frontend/.env、安装依赖、生成 Prisma、应用迁移并 seed；见 README。演示前配置 DEMO_MODE=true，启动后保持本机服务运行。首次安装需要网络，演示不需外部 AI 网络。

## 测试方法

在 frontend 执行：

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

测试端口 33160、33156/33157、33158/33159 应空闲。套件创建独立临时 SQLite/上传目录，并在 finally 清理；不要同时运行占用相同端口的套件。可选设置 MVP_UI_PREVIEW=true 后运行 test:mvp，使用隔离服务做浏览器复核，按回车结束和清理。最终验收临时数据已清理，既有馆藏保持不变。

## 未完成功能与已知问题

1. 新流程资料文件上传、PDF/Word 正文提取未实现，只有文字来源；旧版文档存档不等于新流程可解析。
2. 授权字段有数据模型，但确认、证据、范围和发布校验未实现，是明确验收差距。
3. 无账号、角色、馆别隔离，审计人员标识不是身份认证。只用于可信本地环境，不能直接部署公网。
4. Mock 不真实识图；真实模型质量/付费 API 未实测，机器校验不保证语义无幻觉，仍需人工事实审查。
5. 普通业务有真实密钥但 API 断连时讲解生成提示失败、不保存；专用 Demo 不受此影响，不宣称所有真实功能断网可用。
6. 本地数据库与文件需备份，两套数据暂不互通；运行脚本包含本机缓存路径回退。
7. 现有基础介绍来自人工字段，空值显示未提供；并不会自动使用 AI 视觉描述填充已确认事实。

## 下一阶段建议

本阶段停止开发。下一阶段经确认后，优先补资料文件导入和授权确认，并重新完成全部验收；生产化前补认证、馆别隔离、备份与 CI。引用精度、检索、音频、三维等列为后续建议，不在本次实施。

## 本轮文件变更

更新 README.md、CURRENT_STATE.md、docs/ARCHITECTURE.md、docs/ai-design.md、docs/demo-script.md；新增 ROADMAP.md、docs/product-overview.md、本报告、frontend/scripts/test-mvp-final.ts；package.json 增加 test:mvp；.gitignore 排除隔离验收目录。未开发新业务功能，未提交 Git 或上传 GitHub。
