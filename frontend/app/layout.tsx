import "./globals.css";
import Link from "next/link";
export default function Layout({children}:{children:React.ReactNode}){return <div className="min-h-screen flex"><aside className="w-64 bg-[#102a43] text-white p-6"><div className="text-xl font-bold mb-12">MuseumAI <span className="text-cyan-300">Studio</span></div><nav className="space-y-2"><Link className="block rounded p-3 hover:bg-white/10" href="/">Dashboard</Link><Link className="block rounded p-3 hover:bg-white/10" href="/artifacts">Artifacts</Link></nav><div className="text-xs text-blue-200 mt-16">Open-source demo<br/>v0.1 foundation</div></aside><main className="flex-1 p-8 max-w-7xl">{children}</main></div>}

