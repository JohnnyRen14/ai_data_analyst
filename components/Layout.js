import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const stages = [
    { id: 1, name: 'Upload', icon: '📁', path: '/' },
    { id: 2, name: 'ETL & Preview', icon: '🔄', path: '/etl' },
    { id: 3, name: 'Preprocessing', icon: '⚙️', path: '/preprocessing' },
    { id: 4, name: 'Business Goals', icon: '💡', path: '/business' },
    { id: 5, name: 'Data Insights', icon: '📊', path: '/insights' },
    { id: 6, name: 'Visualizations', icon: '📈', path: '/visualizations' },
    { id: 7, name: 'Analysis', icon: '🎯', path: '/analysis' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } glass-strong transition-all duration-300 p-4 flex flex-col fixed h-screen z-10`}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className={`${sidebarOpen ? 'block' : 'hidden'} text-xl font-bold text-gradient-primary`}>
            AI Analytics
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {stages.map((stage) => {
            const isActive = router.pathname === stage.path;
            return (
              <Link
                key={stage.id}
                href={stage.path}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive
                    ? 'gradient-primary text-white shadow-lg'
                    : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                <span className="text-2xl">{stage.icon}</span>
                {sidebarOpen && (
                  <span className="font-medium">{stage.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="mt-auto p-4 glass rounded-lg">
            <p className="text-xs text-gray-400 text-center">
              By Lee Ren & Zhao Zheng
            </p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        } transition-all duration-300 p-8`}
      >
        {children}
      </main>
    </div>
  );
}
