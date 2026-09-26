import "./globals.css";
import Link from "next/link";
export const metadata = { title: "MuseumAI Studio｜博物馆数字资产工作台", description: "博物馆文物与数字资产管理工作台" };
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><div className="min-h-screen flex"><aside className="w-64 bg-[#102a43] text-white p-6"><div className="text-xl font-bold mb-12">MuseumAI <span className="text-cyan-300">Studio</span></div><nav className="space-y-2"><Link className="block rounded p-3 hover:bg-white/10" href="/">工作台</Link><Link className="block rounded p-3 hover:bg-white/10" href="/artifacts">文物藏品</Link></nav><div className="text-xs text-blue-200 mt-16">开源中文示范项目<br/>v0.1 基础版</div></aside><main className="flex-1 p-8 max-w-7xl">{children}</main></div></body></html>}
