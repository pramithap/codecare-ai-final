'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TrashIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { cx } from '../../lib/classnames';
import type { Repository, UpdateRepoRequest } from '../../types/repos';

interface ReposTableProps {
  className?: string;
  onRepoDeleted?: () => void;
}

const statusConfig = {
  new: { label: 'New', icon: '⚪', color: 'text-slate-400' },
  ready: { label: 'Ready', icon: '✅', color: 'text-green-400' },
  drift: { label: 'Drift', icon: '⚠️', color: 'text-yellow-400' },
  error: { label: 'Error', icon: '❌', color: 'text-red-400' },
};

const providerConfig = {
  github: { label: 'GitHub', color: 'text-slate-200' },
  gitlab: { label: 'GitLab', color: 'text-orange-400' },
  bitbucket: { label: 'Bitbucket', color: 'text-blue-400' },
  azure: { label: 'Azure DevOps', color: 'text-cyan-400' },
  zip: { label: 'ZIP', color: 'text-blue-400' },
};

export function ReposTable({ className, onRepoDeleted }: ReposTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rescanningId, setRescanningId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Ensure search term is always empty on mount
  useEffect(() => {
    setSearchTerm('');
  }, []);

  // Fetch repositories
  const { data: repos, isLoading, error } = useQuery({
    queryKey: ['repos'],
    queryFn: async (): Promise<Repository[]> => {
      const response = await fetch('/api/repos');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repositories');
      }
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds for rescan status updates
  });

  // Filter repositories based on search term
  const filteredRepos = repos?.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (repo.remoteUrl && repo.remoteUrl.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Update repository mutation
  const updateRepoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRepoRequest }) => {
      const response = await fetch(`/api/repos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update repository');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
  });

  // Delete repository mutation
  const deleteRepoMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const response = await fetch(`/api/repos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete repository');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      onRepoDeleted?.(); // Notify parent component when repo is deleted
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  // Rescan repository mutation
  const rescanRepoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/repos/${id}/rescan`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rescan repository');
      }

      return response.json();
    },
    onMutate: (id) => {
      setRescanningId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
    onSettled: () => {
      setRescanningId(null);
    },
  });

  const handleBranchChange = (id: string, branch: string) => {
    updateRepoMutation.mutate({ id, data: { defaultBranch: branch } });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this repository?')) {
      deleteRepoMutation.mutate(id);
    }
  };

  const handleRescan = (id: string) => {
    rescanRepoMutation.mutate(id);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={cx('', className)}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cx('', className)}>
        <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Failed to load repositories
              </h4>
              <p className="text-red-700 dark:text-red-300">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cx('', className)}>
      {/* Search Input */}
      {repos && repos.length > 0 && (
        <div className="p-6 border-b border-slate-700/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search repositories by name, provider, status, or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-slate-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-slate-400">
              Showing {filteredRepos.length} of {repos.length} repositories
            </div>
          )}
        </div>
      )}

      {!repos || repos.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-12 h-12 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h4 className="text-xl font-semibold text-white mb-3">
            No repositories yet
          </h4>
          <p className="text-slate-300 mb-8 max-w-md mx-auto text-lg leading-relaxed">
            Add repos from the Git account, Repo URL or upload a ZIP file and start managing dependencies.
          </p>
        </div>
      ) : searchTerm && filteredRepos.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-12 h-12 text-yellow-500 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h4 className="text-xl font-semibold text-white mb-3">
            No repositories found
          </h4>
          <p className="text-slate-300 mb-8 max-w-md mx-auto text-lg leading-relaxed">
            No repositories match your search for "{searchTerm}". Try adjusting your search terms.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full" data-testid="repos-table">
            <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📁</span>
                    <span>Repository</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🔗</span>
                    <span>Provider</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🌿</span>
                    <span>Default Branch</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📊</span>
                    <span>Last Scan</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">⚡</span>
                    <span>Status</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-right text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center justify-end space-x-2">
                    <span className="text-lg">⚙️</span>
                    <span>Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800/60 divide-y divide-slate-600/60 backdrop-blur-sm">
              {filteredRepos?.map((repo) => (
                <tr key={repo.id} data-testid={`repo-row-${repo.id}`} className="hover:bg-slate-700/60 transition-all duration-200">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div>
                      <div className="text-base font-semibold text-white">
                        {repo.name}
                      </div>
                      {repo.remoteUrl && (
                        <div className="text-sm text-slate-400 truncate max-w-xs mt-1">
                          {repo.remoteUrl}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${repo.provider === 'github' ? 'bg-slate-300' : 'bg-blue-400'}`}></div>
                      <span className={cx('text-sm font-semibold', providerConfig[repo.provider].color)}>
                        {providerConfig[repo.provider].label}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-6 whitespace-nowrap">
                    <select
                      value={repo.defaultBranch}
                      onChange={(e) => handleBranchChange(repo.id, e.target.value)}
                      data-testid={`branch-select-${repo.id}`}
                      disabled={updateRepoMutation.isPending}
                      className="text-sm border-slate-600 rounded-lg bg-slate-700/80 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 px-3 py-2 backdrop-blur-sm"
                    >
                      <option value={repo.defaultBranch}>{repo.defaultBranch}</option>
                      <option value="main">main</option>
                      <option value="master">master</option>
                      <option value="develop">develop</option>
                    </select>
                  </td>
                  
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="text-sm text-slate-400">
                      {repo.lastScanAt ? formatDate(repo.lastScanAt) : 'Never'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{statusConfig[repo.status].icon}</span>
                      <span className={cx('text-sm font-semibold px-3 py-1 rounded-full', 
                        repo.status === 'ready' ? 'bg-green-900/30 text-green-300' :
                        repo.status === 'drift' ? 'bg-yellow-900/30 text-yellow-300' :
                        repo.status === 'error' ? 'bg-red-900/30 text-red-300' :
                        'bg-slate-800 text-slate-300'
                      )}>
                        {statusConfig[repo.status].label}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-6 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      {repo.status !== 'new' && (
                        <button
                          onClick={() => handleRescan(repo.id)}
                          disabled={rescanningId === repo.id || rescanRepoMutation.isPending}
                          data-testid={`rescan-btn-${repo.id}`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 hover:scale-105"
                        >
                          {rescanningId === repo.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border border-indigo-600 dark:border-indigo-400 border-t-transparent mr-2"></div>
                              Scanning...
                            </>
                          ) : (
                            <>
                              <ArrowPathIcon className="h-3 w-3 mr-1" />
                              Rescan
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(repo.id)}
                        disabled={deletingId === repo.id || deleteRepoMutation.isPending}
                        data-testid={`delete-btn-${repo.id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all duration-200 hover:scale-105"
                      >
                        {deletingId === repo.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border border-red-600 dark:border-red-400 border-t-transparent mr-2"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <TrashIcon className="h-3 w-3 mr-1" />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Global Error Display */}
      {(updateRepoMutation.error || deleteRepoMutation.error || rescanRepoMutation.error) && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                {updateRepoMutation.error?.message ||
                 deleteRepoMutation.error?.message ||
                 rescanRepoMutation.error?.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
