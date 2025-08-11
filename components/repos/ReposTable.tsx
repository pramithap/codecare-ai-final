'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TrashIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cx } from '../../lib/classnames';
import type { Repository, UpdateRepoRequest } from '../../types/repos';

interface ReposTableProps {
  className?: string;
}

const statusConfig = {
  new: { label: 'New', icon: '⚪', color: 'text-gray-600 dark:text-gray-400' },
  ready: { label: 'Ready', icon: '✅', color: 'text-green-600 dark:text-green-400' },
  drift: { label: 'Drift', icon: '⚠', color: 'text-yellow-600 dark:text-yellow-400' },
  error: { label: 'Error', icon: '❌', color: 'text-red-600 dark:text-red-400' },
};

const providerConfig = {
  github: { label: 'GitHub', color: 'text-gray-900 dark:text-gray-100' },
  zip: { label: 'ZIP', color: 'text-blue-600 dark:text-blue-400' },
};

export function ReposTable({ className }: ReposTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rescanningId, setRescanningId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  // Update repository mutation
  const updateRepoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRepoRequest }) => {
      const response = await fetch(`/api/repos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
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
        throw new Error(errorData.error || 'Failed to initiate rescan');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
    onSettled: () => {
      setRescanningId(null);
    },
  });

  const handleBranchChange = (repoId: string, newBranch: string) => {
    updateRepoMutation.mutate({
      id: repoId,
      data: { defaultBranch: newBranch },
    });
  };

  const handleDelete = async (repoId: string) => {
    if (!confirm('Are you sure you want to delete this repository? This action cannot be undone.')) {
      return;
    }

    setDeletingId(repoId);
    deleteRepoMutation.mutate(repoId);
  };

  const handleRescan = async (repoId: string) => {
    setRescanningId(repoId);
    rescanRepoMutation.mutate(repoId);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={cx('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Repositories
          </h3>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cx('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Repositories
          </h3>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">
                {error instanceof Error ? error.message : 'Failed to load repositories'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cx('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Repositories ({repos?.length || 0})
        </h3>
      </div>

      {!repos || repos.length === 0 ? (
        <div className="p-8 text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No repositories yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Connect your GitHub account or upload a ZIP file to add your first repository.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="repos-table">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Repository
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Default Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Scan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {repos.map((repo) => (
                <tr key={repo.id} data-testid={`repo-row-${repo.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {repo.name}
                      </div>
                      {repo.remoteUrl && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {repo.remoteUrl}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cx('text-sm font-medium', providerConfig[repo.provider].color)}>
                      {providerConfig[repo.provider].label}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={repo.defaultBranch}
                      onChange={(e) => handleBranchChange(repo.id, e.target.value)}
                      data-testid={`branch-select-${repo.id}`}
                      disabled={updateRepoMutation.isPending}
                      className="text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                    >
                      <option value={repo.defaultBranch}>{repo.defaultBranch}</option>
                      <option value="main">main</option>
                      <option value="master">master</option>
                      <option value="develop">develop</option>
                      <option value="dev">dev</option>
                    </select>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(repo.lastScanAt)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{statusConfig[repo.status].icon}</span>
                      <span className={cx('text-sm font-medium', statusConfig[repo.status].color)}>
                        {statusConfig[repo.status].label}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRescan(repo.id)}
                        disabled={rescanningId === repo.id || rescanRepoMutation.isPending}
                        data-testid={`rescan-btn-${repo.id}`}
                        className={cx(
                          'inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
                          rescanningId === repo.id || rescanRepoMutation.isPending
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/30'
                        )}
                      >
                        <ArrowPathIcon className={cx(
                          'h-3 w-3',
                          rescanningId === repo.id && 'animate-spin'
                        )} />
                        {rescanningId === repo.id ? 'Scanning...' : 'Rescan'}
                      </button>
                      
                      <button
                        onClick={() => handleDelete(repo.id)}
                        disabled={deletingId === repo.id || deleteRepoMutation.isPending}
                        data-testid={`delete-btn-${repo.id}`}
                        className={cx(
                          'inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
                          deletingId === repo.id || deleteRepoMutation.isPending
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/30'
                        )}
                      >
                        <TrashIcon className="h-3 w-3" />
                        {deletingId === repo.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mutation Error Messages */}
      {(updateRepoMutation.error || deleteRepoMutation.error || rescanRepoMutation.error) && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">
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
