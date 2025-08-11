import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

interface StoredScan {
  id: string;
  timestamp: string;
  summary: {
    totalServices: number;
    totalComponents: number;
    flaggedComponents: number;
    eolComponents: number;
    totalRepositories: number;
  };
  repositories: {
    id: string;
    name: string;
    url?: string;
    branch: string;
    serviceCount: number;
  }[];
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recentScans, setRecentScans] = useState<StoredScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load recent scans on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      loadRecentScans();
    }
  }, [status]);

  const loadRecentScans = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/compatibility/store-scan');
      if (response.ok) {
        const result = await response.json();
        // Get the scans and remove any duplicates based on timestamp and repository names
        let scans = result.scans || [];
        
        // Remove duplicates by creating a unique key from timestamp and repo names
        const uniqueScans = scans.filter((scan: any, index: number, self: any[]) => {
          const scanKey = `${scan.timestamp}-${scan.repositories.map((r: any) => r.name).sort().join(',')}`;
          return index === self.findIndex((s: any) => {
            const sKey = `${s.timestamp}-${s.repositories.map((r: any) => r.name).sort().join(',')}`;
            return sKey === scanKey;
          });
        });
        
        // Get the 5 most recent unique scans
        const recentUniqueScans = uniqueScans.slice(0, 5);
        setRecentScans(recentUniqueScans);
      } else {
        console.warn('Failed to load scan summaries');
      }
    } catch (error) {
      console.error('Error loading scan summaries:', error);
      setError('Failed to load scan summaries');
    } finally {
      setIsLoading(false);
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) return 'Just now';
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTotalStats = () => {
    return recentScans.reduce(
      (totals, scan) => ({
        repositories: totals.repositories + scan.summary.totalRepositories,
        services: totals.services + scan.summary.totalServices,
        components: totals.components + scan.summary.totalComponents,
        flagged: totals.flagged + scan.summary.flaggedComponents,
        eol: totals.eol + scan.summary.eolComponents,
      }),
      { repositories: 0, services: 0, components: 0, flagged: 0, eol: 0 }
    );
  };

  const totalStats = getTotalStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back, {session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Overview of your recent scans and project statistics
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {!isLoading && recentScans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-2xl font-bold text-white">{recentScans.length}</div>
                  <div className="text-sm text-slate-300">Total Scans</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🏗️</span>
                <div>
                  <div className="text-2xl font-bold text-white">{totalStats.repositories}</div>
                  <div className="text-sm text-slate-300">Repositories</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📦</span>
                <div>
                  <div className="text-2xl font-bold text-white">{totalStats.components}</div>
                  <div className="text-sm text-slate-300">Components</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="text-2xl font-bold text-white">{totalStats.flagged}</div>
                  <div className="text-sm text-slate-300">Flagged</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <div className="text-2xl font-bold text-white">{totalStats.eol}</div>
                  <div className="text-sm text-slate-300">EOL</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Scans */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center">
              <span className="mr-3">📊</span>
              Recent Scans
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
              <span className="ml-3 text-slate-400">Loading scan history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <p className="text-red-300 mb-4">{error}</p>
              <button 
                onClick={loadRecentScans}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : recentScans.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-medium text-white mb-2">No Scans Available</h3>
              <p className="text-slate-400">
                Scan results will appear here once you start analyzing repositories.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentScans.map((scan) => (
                <Link 
                  key={scan.id}
                  href={`/compatibility?scanId=${scan.id}`}
                  className="block bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/30 hover:border-slate-500/50 rounded-lg p-4 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-white group-hover:text-indigo-300 transition-colors">
                          {scan.repositories.map(r => r.name).join(', ')}
                        </h3>
                        <span className="text-sm text-slate-400">
                          {formatRelativeTime(scan.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center text-slate-300">
                          <span className="text-blue-400 mr-1">🏗️</span>
                          {scan.summary.totalRepositories} repo{scan.summary.totalRepositories !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center text-slate-300">
                          <span className="text-green-400 mr-1">🔧</span>
                          {scan.summary.totalServices} services
                        </div>
                        <div className="flex items-center text-slate-300">
                          <span className="text-purple-400 mr-1">📦</span>
                          {scan.summary.totalComponents} components
                        </div>
                        {scan.summary.flaggedComponents > 0 && (
                          <div className="flex items-center text-yellow-300">
                            <span className="text-yellow-400 mr-1">⚠️</span>
                            {scan.summary.flaggedComponents} flagged
                          </div>
                        )}
                        {scan.summary.eolComponents > 0 && (
                          <div className="flex items-center text-red-300">
                            <span className="text-red-400 mr-1">🚨</span>
                            {scan.summary.eolComponents} EOL
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
                      <span className="mr-2 text-sm">Analyze</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
