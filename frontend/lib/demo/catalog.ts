export const DEMO_NOTICE = '演示数据，仅用于产品功能展示。';
export const DEMO_MUSEUM_ID = 'museum-presentation-demo';
export const DEMO_STEPS = [
  '上传文物',
  '读取馆藏资料',
  'AI图片分析',
  '自动标签',
  '构建知识卡',
  '生成四种讲解',
  '人工审核',
  '发布游客页面',
] as const;
export const DEMO_CATALOG = [
  {
    id: 'demo-bronze-ding',
    name: '青铜鼎',
    category: '青铜器',
    material: '青铜',
    shape: '双耳、圆腹、三足',
    pattern: '腹部环带纹饰',
    tags: ['青铜器', '鼎', '三足', '演示数据'],
    image: '/demo-images/bronze-ding.svg',
    description:
      '本演示样本呈双耳、圆腹、三足造型，腹部设有环带纹饰。材质按演示资料记录为青铜；精确年代、出土地与具体用途未提供。',
  },
  {
    id: 'demo-blue-vase',
    name: '青花瓷瓶',
    category: '瓷器',
    material: '瓷',
    shape: '小口、长颈、鼓腹、圈足',
    pattern: '蓝色植物纹饰',
    tags: ['瓷器', '青花', '瓶', '演示数据'],
    image: '/demo-images/blue-vase.svg',
    description:
      '本演示样本呈小口、长颈、鼓腹与圈足造型，白色器身配蓝色植物纹饰。资料仅用于展示系统功能，不对应具体真实馆藏。',
  },
  {
    id: 'demo-pottery-figure',
    name: '陶俑',
    category: '陶器',
    material: '陶',
    shape: '人物站姿、双臂收于身前',
    pattern: '衣褶线条',
    tags: ['陶器', '人物', '陶俑', '演示数据'],
    image: '/demo-images/pottery-figure.svg',
    description:
      '本演示样本为人物站姿造型，双臂收于身前，衣褶以线条表示。身份、作者、出土地及历史背景在演示资料中均未提供。',
  },
] as const;
export type DemoId = (typeof DEMO_CATALOG)[number]['id'];
export function demoItem(id: string) {
  return DEMO_CATALOG.find((item) => item.id === id);
}
