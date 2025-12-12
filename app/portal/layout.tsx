'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Handshake,
  Mail,
  Calendar,
  FolderOpen,
  ClipboardList,
  FileStack,
  PenTool
} from 'lucide-react';

const tabs = [
  { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
  { name: 'Petitions', href: '/portal/petitions', icon: FileText },
  { name: 'Petition Letters', href: '/portal/petition-letters', icon: PenTool },
  { name: 'Agreements', href: '/portal/agreements', icon: Handshake },
  { name: 'Support Letters', href: '/portal/support-letters', icon: Mail },
  { name: 'Itineraries', href: '/portal/itineraries', icon: Calendar },
  { name: 'Exhibits', href: '/portal/exhibits', icon: FolderOpen },
  { name: 'Form Filler', href: '/portal/form-filler', icon: ClipboardList },
  { name: 'Documents', href: '/portal/documents', icon: FileStack },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Xtraordinary Research Visa Generator
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Complete AI-powered visa petition platform for O-1A, O-1B, P-1A, EB-1A, EB-2 NIW
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">O-1A/B</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">EB-1A</span>
              <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-full">P-1A</span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">EB-2 NIW</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap transition-all
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Xtraordinary Research Visa Generator - Powered by Claude AI, Perplexity, and OpenAI
          </p>
        </div>
      </footer>
    </div>
  );
}
