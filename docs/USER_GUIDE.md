# MuseumAI Studio 当前功能与使用说明

本文适用于 D 盘项目 `D:\Codex\projects\MuseumAI-Studio`。当前为本地开发演示版本，无需 Docker。所有网页操作界面使用中文；代码、接口路径和数据库字段保留英文。

## 一、目前能做什么

| 页面 | 地址 | 当前功能 |
| --- | --- | --- |
| 工作台 | `/` | 查看旧文物记录的数量和最近新增记录。 |
| 文物资产 | `/artifacts` | 使用原 FastAPI 数据库浏览、搜索文物。 |
| 新增文物 | `/artifacts/new` | 在旧文物管理流程中新建文物。 |
| 旧文物详情 | `/artifacts/[id]` | 编辑基本信息，上传/删除图片及资料文件。 |
| AI 文物知识卡 | `/assets` | 浏览新知识卡，查看处理状态。 |
| 上传文物 | `/assets/new` | 上传 JPEG/PNG/WebP 图片，填写基本信息和来源文字，保存草稿。 |
| 知识卡详情 | `/assets/[id]` | 启动 AI 分析，查看进度与结果，人工修改基本字段和标签；生成四种待审核 AI 讲解。 |
| 功能演示 | `/demo` | 后续流程的中文占位页。 |

旧 `/artifacts` 由 FastAPI + SQLAlchemy 数据库管理；新 `/assets` 由 Next.js + Prisma + SQLite 管理。**两套数据目前不互通。** 如果要体验 AI 分析，请从“AI 文物知识卡”入口新建记录，不要从旧“新增文物”入口开始。

## 二、启动前检查

项目根目录已有专用 Python 虚拟环境 `.venv`，使用本机 Python **3.12.7**；前端依赖在 `frontend/node_modules`。`frontend/.env` 和 `backend/.env` 是本机环境配置，不要把真实密钥提交到 Git。

如需在另一台电脑首次配置，从项目根目录依次运行：

```powershell
py -3.12 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
Copy-Item .env.example frontend/.env
Copy-Item .env.example backend/.env
```

前端还需要 Node.js 与 npm/pnpm。现有 `frontend/run-local.ps1` 会优先使用系统 npm，找不到时尝试 Codex 提供的 Node/pnpm。迁移到其他电脑后，建议安装 Node.js LTS。

## 三、在 PyCharm 中使用 D 盘项目环境

1. 在 PyCharm 选择“打开”，打开文件夹 `D:\Codex\projects\MuseumAI-Studio`，不要打开旧 C 盘副本。
2. 进入“文件 → 设置 → 项目：MuseumAI-Studio → Python 解释器”。也可点击窗口右下角的 Python 版本。
3. 选择“添加解释器 → 添加本地解释器 → 选择现有环境”（不要再次生成 `.venv1`）。
4. 将解释器路径设为 `D:\Codex\projects\MuseumAI-Studio\.venv\Scripts\python.exe`，确认后等待索引完成。
5. 在 PyCharm 的 Python 控制台输入 `import sys; print(sys.executable)`，结果应以 `D:\Codex\projects\MuseumAI-Studio\.venv\Scripts\python.exe` 结尾。

本项目的 `.idea` 配置已指向上述解释器。若 PyCharm 仍显示 `.venv1`、旧 C 盘路径或 Python 3.13，按第 2～4 步手动切换。现有 `.venv1` 和 `backend/.venv` 未删除，但后端启动脚本只使用根目录 `.venv`。

## 四、启动网页

打开两个 PowerShell 窗口，在**同一个 D 盘项目目录**运行：

终端一——后端，供旧 `/artifacts` 页面使用：

```powershell
cd D:\Codex\projects\MuseumAI-Studio
.\backend\run-local.ps1
```

终端二——前端及新 AI 知识卡：

```powershell
cd D:\Codex\projects\MuseumAI-Studio
.\frontend\run-local.ps1
```

保持两个终端打开。浏览器访问 [http://localhost:3000](http://localhost:3000)。新 AI 知识卡只依赖前端及其 Prisma 数据库；如果只体验 `/assets`，终端一可以不启动。旧文物页面需要后端在 `http://localhost:8000` 运行；接口文档位于 [http://localhost:8000/docs](http://localhost:8000/docs)。停止时在对应终端按 `Ctrl+C`。

## 五、体验 AI 文物分析

1. 打开左侧“AI 文物知识卡”或直接访问 [http://localhost:3000/assets](http://localhost:3000/assets)。
2. 点击“上传文物”。填写名称，选择 JPEG/PNG/WebP 图片（最大 8 MB）。藏品编号、类别、材质、朝代、描述可由人工填写；来源资料可粘贴已有的馆藏登记或研究文字。
3. 点击“保存文物草稿”，进入知识卡详情页。此时状态是“草稿”。
4. 点击“开始 AI 分析”。状态切换为“处理中”，页面依次显示：读取图片 → 解析资料 → AI视觉分析 → 提取标签 → 生成结构化元数据 → 完成。
5. 完成后状态为“待人工审核”。查看建议类别、可能材质、视觉描述、器型特征、纹样特征、AI 推荐标签和 confidence。页面会注明 confidence **不是文物鉴定准确率**。
6. 在“基本信息（人工填写）”中修订字段并保存；在“标签”区域添加或删除标签。AI 推荐标签仍单独展示，当前标签以人工修订为准。
7. 查看“来源资料”和“资料提取摘要”，对照证据核验。精确年代、作者、出土地、历史事件和具体用途不能仅凭图片判定；未知内容显示“未知”或“资料中未提供”。

分析的结构化结果、AI 原始回复保存在 Prisma 的 `AssetMetadata` 表；开始和完成事件保存在 `AuditLog`。分析成功不会自动发布。尚未提供“审核通过/发布”按钮。

### 生成四种讲解

在知识卡详情页下方找到“AI 讲解”。可先在“工作人员本次补充资料”粘贴已核实文字，再点击“生成 AI 讲解”。系统一次保存普通游客版（300～500 字）、儿童版（200～300 字，面向 8～14 岁）、专业版（500～800 字）和 30 秒短讲解（100～150 字）。每版初始状态为 `AI_GENERATED`，显示版本号、“内容依据”、来源文件名或资料名称及可核对片段。再次生成会新增版本，不覆盖旧版。

讲解只使用工作人员输入、已有来源文档和已确认的馆藏字段；视觉结果仅可描述外观。如果完全缺少可核实文字，四版会改为更短的受限内容，不强行满足常规字数，也不会编造历史事实。API 故障或非法 JSON 不会保存新讲解。

### 人工审核讲解

从知识卡详情页点击“查看讲解审核状态与处理记录”，或直接进入 `/assets/文物ID/review`。四种讲解按类型展示，旧版本也会保留。黄色“AI生成”代表未经确认；蓝色“已人工编辑”代表内容已修改但还未审核；绿色“已审核”代表工作人员确认，该版本被锁定。

逐条对照下方“内容依据”和馆藏资料后，可点“编辑”修改文字并“保存修改”，也可点“审核通过”。审核通过不会自动发布。若内容需要重写，点页面上方“重新生成四种讲解”，或在某一种最新版本下点“重新生成此版本”：系统新增版本，原已审核版本不被覆盖；新版本仍需重新审核。页面底部“处理记录”按时间展示生成、编辑和审核动作。知识卡页显示四种讲解最新版本中已审核的数量。

当前没有登录与身份验证，审计记录中的“本地工作人员”只是本地操作标识，不可用作正式责任人签名；请只在可信本地环境使用。

### 发布与游客展示

审核通过至少一个讲解版本后，在文物详情页或讲解审核页点击“发布文物”。没有已审核讲解时按钮会禁用并说明原因；文物仍在处理时也不能发布。发布成功后文物状态为“已发布”，处理记录新增“发布文物”；已发布文物不能直接重新运行 AI 图片分析，以免意外下线。点击“查看游客展示页”打开 `/exhibit/文物ID`，可查看图片、名称、年代、材质、基础介绍和四种讲解标签。未审核的讲解标签不可点击；某种讲解即使后来重新生成了待审核版本，游客仍只会看到该类型最近一次已审核的版本。未发布文物的游客页面与公开图片接口返回 404。游客页面不显示后台操作。

## 六、Mock 与真实模型

默认 `.env.example` 中 `DEMO_MODE=true`。Mock 可以验证完整操作、状态和入库，但**不会真正识别图片或资料**；页面会明确标记模拟结果。没有 `AI_API_KEY` 时也自动使用 Mock。

若以后要使用真实兼容模型，在 `frontend/.env` 中设置 `DEMO_MODE=false`、`AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`、`AI_VISION_MODEL`，然后重启前端。真实模式会把所选图片和来源文字发往配置的模型服务，请先确认馆藏资料的使用授权与隐私要求。不要把密钥写进代码或截图。

## 七、常见问题与当前限制

- “网页打不开”：确认终端二显示前端已就绪，并访问 `http://localhost:3000`；若端口被占用，按终端显示的实际端口访问。
- “旧文物列表加载失败”：检查终端一的后端是否运行，以及 `backend/.env` 是否存在。新 `/assets` 页不需要旧后端。
- “找不到 npm/node”：运行项目自带 `frontend/run-local.ps1`；换电脑时安装 Node.js LTS。
- “分析看起来没有识图”：检查 `frontend/.env` 的 `DEMO_MODE` 和 `AI_API_KEY`。Mock 只返回演示内容。
- “分析失败或状态异常”：刷新知识卡；正常失败会恢复草稿。检查前端终端输出和图片是否仍存在。
- 目前来源资料只支持粘贴文字，**不解析 PDF/Word**；新知识卡图片保存在 `frontend/.local-uploads/`，不会纳入 Git。
- 讲解的来源 ID 与引文经过机器校验，但机器仍不能保证语义完全无幻觉；工作人员需逐条核对后才能使用。
- 目前没有登录、馆别权限与公开访问控制。请仅在可信本地环境试用，**不要直接部署到公网**。

## 八、开发检查

在 `frontend/` 目录运行 lint、类型检查、构建和 AI 单元测试：

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm test:ai
pnpm test:narration
pnpm test:review
pnpm test:publish
```

Mock 端到端测试会短暂创建并清理一条测试记录。前端在 3000 端口运行时：

```powershell
$env:TEST_BASE_URL='http://127.0.0.1:3000'
pnpm test:flow
```

设计与数据边界详见 [`ARCHITECTURE.md`](ARCHITECTURE.md) 和 [`ai-design.md`](ai-design.md)。
