# AI Provider 设计

## Provider 架构

服务端通过 `frontend/lib/ai/provider.ts` 的 `getAIProvider()` 取得 `AIProvider`。接口统一声明 `analyzeArtifactImage()`、`extractMetadata()` 和 `generateNarrations()`。`/api/assets/[id]/analyze` 串联图片读取、来源文字解析、视觉分析、标签提取和结构化元数据保存，并以 NDJSON 返回可见进度。`/api/assets/[id]/narrations` 通过同一个 Provider 一次生成四种讲解，页面和业务代码不直接调用模型接口。

`OpenAICompatibleProvider` 在服务端使用兼容 Chat Completions 的 `/chat/completions` 接口。图片分析使用 `AI_VISION_MODEL`，元数据提取使用 `AI_MODEL`。页面和业务模块不得直接请求模型端点，也不得读取 `AI_API_KEY`；今后接入时只依赖 `AIProvider` 接口。Provider 入口和真实模型实现使用 `server-only`，避免密钥模块被导入客户端组件。

图片输入目前接受 HTTPS 图片 URL 或 JPEG/PNG/WEBP 的 Base64 data URL。图片 URL 必须能被所选模型服务访问；现有 `localhost` 文件地址不能直接交给远程模型，后续业务接入需在服务端转换为受控数据 URL 或可访问地址。

## Mock 模式

`DEMO_MODE=true` 时工厂固定返回 `MockAIProvider`。没有 `AI_API_KEY` 时也自动使用 Mock，因此本地无密钥可正常启动。Mock 输出带 `source: 'mock'`，文案明确提示它没有真实识别图片或史料；种子数据和页面不会把模拟结果冒充真实鉴定。

讲解 Mock 会依据给定的资料片段生成四个满足常规字数范围的演示版本，并附可核对的来源片段。若没有任何文字资料或已确认字段，则不调用模型，改用简短的受限模板；四个版本仍会保存，但明确标记“资料不足”，不强凑字数。

要启用兼容模型服务，在 `frontend/.env` 中设置：

```dotenv
DEMO_MODE=false
AI_API_KEY=填写服务端密钥
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
AI_VISION_MODEL=gpt-4.1-mini
```

上述变量只有 `frontend/` 服务端读取，不使用 `NEXT_PUBLIC_` 前缀，也不应提交真实密钥。

## 错误处理与校验

模型回复先按标准 Chat Completions 响应读取，再尝试严格 JSON 解析。解析只使用 `JSON.parse`，不会执行模型文本。图片结果必须含中文描述、类别、材质、标签数组和 0～1 的有限置信度；资料结果必须符合预期的字段类型和长度。Mock 结果也通过相同校验函数。

请求失败、超时、返回非法 JSON、字段缺失或类型错误时返回确定的安全结果：图片类别/材质为“未识别”，置信度为 0；元数据字段为 `null`，置信度为 0。此时 `source: 'fallback'`，后续界面可据此要求人工核对。Provider 不会把未经校验的模型文本当作结构化业务字段使用。

知识卡保存通过校验的结构化字段，同时在 `AssetMetadata.imageRawOutput` 和 `AssetMetadata.documentRawOutput` 保留模型原始回复，便于审查；非法 JSON 也只作为原始文本留存，不会作为结构化字段使用。Mock 模式保存模拟输出并在页面明确标注。`AI_ANALYSIS_STARTED` 与 `AI_ANALYSIS_COMPLETED` 写入 `AuditLog`，失败时写入 `AI_ANALYSIS_FAILED` 并恢复草稿。分析结果始终进入待人工审核状态，不会自动发布。

模型不得仅凭图片确定精确年代、作者、出土地、历史事件和具体用途。无证据时使用“未知”或“资料中未提供”；confidence 只是模型输出的信心值，不是鉴定准确率。当前未实现登录、权限控制和跨馆隔离，真实馆藏资料接入外部模型前需补齐治理与授权。

## Prompt 管理

所有模型提示词集中在 `frontend/lib/prompts/`：`artifact-image.ts` 管理图片分析，`metadata.ts` 管理史料字段提取，`narration.ts` 管理四种讲解。页面组件和 API 业务逻辑只提供输入数据，不嵌入提示词。以后新增任务时在该目录建立对应 Prompt，并保持响应字段与 `frontend/lib/ai/validation.ts` 的校验规则一致。

## 讲解生成的事实边界与来源

讲解信息源依次为：工作人员本次手动输入资料、已有 `SourceDocument` 正文、状态为 `APPROVED`/`PUBLISHED` 的 `MuseumAsset` 字段。AI 视觉结果仅在真实模型分析成功时作为外观描述输入，Mock 和回退视觉结果不会被当作事实。来源文字作为数据传递，Prompt 明确要求“只能根据提供的资料和结构化字段生成内容。如果资料不支持某个事实，请写‘资料中未提供相关信息’，禁止编造。”

模型输出必须是四种固定类型的 JSON；服务端校验字数、来源 ID 是否属于当前文物、工作人员资料是否被优先引用，以及每个引用片段是否逐字存在于对应来源文本中。不合格的回复、API 错误和非法 JSON 一律不保存讲解。**这些机器校验不能证明语义上完全没有幻觉**，因此所有版本仍为 `AI_GENERATED`，必须由工作人员按“内容依据”人工审核，不能直接作为权威事实发布。

每条 `Narration` 保存类型、递增版本号、关联的 `sourceDocumentIds`、预留的 `sourceReference`、生成来源和受限标记。工作人员本次输入资料会在成功生成时保存为一条 `SourceDocument`；失败时不会写入新讲解。一次成功生成写一条 `NARRATION_GENERATED` 审计记录。已实现独立人工审核与发布；尚未实现精确页码引用。

## 最终验收范围（2026-10-04）

无密钥且 DEMO_MODE=false、无密钥且 DEMO_MODE=true 两种正常业务配置均完成新增至游客访问闭环。配置测试密钥且 AI_BASE_URL 指向不可达本机地址时，专用 `/demo` 仍完成全部八步。异常测试另外覆盖真实兼容接口断连、HTTP 错误、非法 JSON 和空响应。没有向外部真实模型发送馆藏资料，也未验证真实识图准确性。

专用演示始终使用 Mock；正常业务真实 Provider 的讲解失败会显示中文错误且不保存新讲解，不承诺断连后自动切换模拟稿。授权字段目前未形成确认工作流，连接外部模型前仍需工作人员自行核实资料使用权限。

## 人工审核边界

讲解初始为 `AI_GENERATED`；修改文字后为 `EDITED`；工作人员确认后为 `APPROVED`。界面用不同颜色和文案区分三者，来源文件名和引用片段始终随版本显示。审核不自动修改文物状态，也不自动发布。已审核版本不可编辑，重新生成只创建更高版本；最新版本若尚未审核，详情页会显示待审核。编辑和审核采用更新时间校验，避免旧页面覆盖新状态，并分别记录 `NARRATION_EDITED`、`NARRATION_APPROVED`。当前无登录系统，审计中的人员标识不能视为真实身份验证。

文物发布由独立 API 检查“至少一条讲解已审核”，并写入 `ASSET_PUBLISHED`。公开页只查询 `PUBLISHED` 文物及 `APPROVED` 讲解；同类型取最新的已审核版本，不会因后来生成未审核新版本而泄露草稿。发布不改变讲解内容或状态。
