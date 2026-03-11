'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, FileCheck } from 'lucide-react';

const nav = [
  { href: '/', label: 'Audit Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'Audit History', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileCheck className="w-7 h-7 text-emerald-400" />
          <span className="font-semibold text-slate-100">BCI Auditor</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Content compliance & brand safety</p>
      </div>
      <nav className="p-3 flex-1">
        <ul className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
