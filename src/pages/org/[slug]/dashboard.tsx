import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function OrgDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { slug } = router.query;

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/dashboard');
      return;
    }

    // Verify user has access to this org
    const userOrgSlug = (session as any)?.orgSlug;
    if (userOrgSlug !== slug) {
      router.push(`/org/${userOrgSlug}/dashboard`);
      return;
    }
  }, [session, status, slug, router]);

  // Uncomment this loading check after NextAuth is installed
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Organization Dashboard
          </h1>
          <p className="text-slate-400">
            Welcome to {slug} organization dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Overview</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Projects</span>
                <span className="text-white font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Scans</span>
                <span className="text-white font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Security Issues</span>
                <span className="text-red-400 font-medium">0</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="text-slate-400 text-sm">
              No recent activity
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🚀</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/repos')}
                className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                📚 Add Repository
              </button>
              <button
                onClick={() => router.push('/scanNew')}
                className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                🔍 Start New Scan
              </button>
            </div>
          </div>
        </div>

        {/* Organization Info */}
        <div className="mt-8 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Organization Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
                Organization Slug
              </h3>
              <p className="text-white">{slug}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
                Your Role
              </h3>
              <p className="text-white">Viewer</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
                Member Since
              </h3>
              <p className="text-white">Today</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
                Last Active
              </h3>
              <p className="text-white">Now</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
