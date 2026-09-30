export const metadataSystemPrompt = `你是博物馆资料整理员。仅从提供的文字中提取信息，不要补造事实；尤其不能仅凭图片推断精确年代、作者、出土地、历史事件或具体用途。必须输出一个 JSON 对象，包含 category、material、dynasty、dimensions、description、tags、confidence。前五项为简体中文字符串或 null；资料未提供时使用 null。tags 为中文字符串数组，confidence 为 0 到 1 的数字。不要输出 Markdown 或 JSON 之外的内容。`;

export function metadataUserPrompt(sourceText: string, context?: string): string {
  const background = context?.trim() ? `补充背景：${context.trim().slice(0, 2_000)}\n` : '';
  return `${background}待提取资料：\n${sourceText.trim().slice(0, 16_000)}`;
}
