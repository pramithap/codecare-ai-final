'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { cx } from '../../lib/classnames';
import type { GitHubRepoSummary, GitHubRepoResponse, BranchSummary, CreateRepoRequest } from '../../types/repos';

interface RepoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RepoPickerModal({ isOpen, onClose, onSuccess }: RepoPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoSummary | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch GitHub repositories
  const { data: reposData, isLoading: isLoadingRepos, error: reposError } = useQuery({
    queryKey: ['github-repos', searchQuery, currentPage],
    queryFn: async (): Promise<GitHubRepoResponse> => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
      });
      if (searchQuery) {
        params.set('query', searchQuery);
      }

      const response = await fetch(`/api/integrations/github/repos?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repositories');
      }
      return response.json();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch branches for selected repository
  const { data: branchesData, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['github-branches', selectedRepo?.full_name],
    queryFn: async (): Promise<{ branches: BranchSummary[] }> => {
      if (!selectedRepo) throw new Error('No repository selected');

      const [owner, repo] = selectedRepo.full_name.split('/');
      const response = await fetch(`/api/integrations/github/branches?owner=${owner}&repo=${repo}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch branches');
      }
      return response.json();
    },
    enabled: !!selectedRepo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set default branch when repo is selected or branches are loaded
  useEffect(() => {
    if (selectedRepo && !selectedBranch) {
      setSelectedBranch(selectedRepo.default_branch);
    }
  }, [selectedRepo, selectedBranch]);

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    // Focus search input when modal opens
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRepo(null);
      setSelectedBranch('');
      setError(null);
      setSearchQuery('');
      setCurrentPage(1);
    }
  }, [isOpen]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleRepoSelect = (repo: GitHubRepoSummary) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.default_branch);
  };

  const handleAddRepository = async () => {
    if (!selectedRepo || !selectedBranch) return;

    setIsAdding(true);
    setError(null);

    try {
      const createRepoData: CreateRepoRequest = {
        provider: 'github',
        name: selectedRepo.name,
        defaultBranch: selectedBranch,
        remoteUrl: `https://github.com/${selectedRepo.full_name}`,
        githubRepoId: selectedRepo.id,
      };

      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createRepoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add repository');
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add repository';
      setError(message);
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div
          ref={modalRef}
          className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl"
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Repository from GitHub
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Search */}
            <div className="mt-4 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {reposError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {reposError instanceof Error ? reposError.message : 'Failed to fetch repositories'}
                </p>
              </div>
            )}

            {isLoadingRepos ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Repository List */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Select Repository
                  </h4>
                  
                  {reposData?.repos.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      {searchQuery ? 'No repositories found matching your search.' : 'No repositories found.'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {reposData?.repos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => handleRepoSelect(repo)}
                          className={cx(
                            'w-full text-left p-3 rounded-lg border transition-colors',
                            selectedRepo?.id === repo.id
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {repo.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {repo.full_name}
                              </p>
                            </div>
                            {selectedRepo?.id === repo.id && (
                              <CheckIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {reposData && reposData.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Previous
                      </button>
                      
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Page {currentPage} of {reposData.totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(reposData.totalPages, prev + 1))}
                        disabled={currentPage === reposData.totalPages}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Branch Selection */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Select Branch
                  </h4>
                  
                  {!selectedRepo ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      Select a repository first
                    </p>
                  ) : isLoadingBranches ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {branchesData?.branches.map((branch) => (
                          <option key={branch.name} value={branch.name}>
                            {branch.name}
                            {branch.name === selectedRepo.default_branch && ' (default)'}
                          </option>
                        ))}
                      </select>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        The selected branch will be used as the default for scanning
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              
              <button
                onClick={handleAddRepository}
                disabled={!selectedRepo || !selectedBranch || isAdding}
                className={cx(
                  'px-4 py-2 text-sm font-medium rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
                  !selectedRepo || !selectedBranch || isAdding
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                )}
              >
                {isAdding ? 'Adding...' : 'Add Repository'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
