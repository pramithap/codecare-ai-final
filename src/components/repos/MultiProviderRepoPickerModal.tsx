'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cx } from '../../lib/classnames';
import type { Provider } from '../../types/repos';

interface RepositorySummary {
  id: string;
  name: string;
  full_name: string;
  default_branch: string;
  description?: string;
  private: boolean;
  clone_url: string;
  html_url: string;
}

interface RepositoryResponse {
  repos: RepositorySummary[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

interface MultiProviderRepoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  provider: Provider;
  token: string;
  username?: string;
}

const PROVIDER_CONFIGS = {
  github: { name: 'GitHub', icon: '🐙', color: 'from-gray-900 to-gray-700' },
  gitlab: { name: 'GitLab', icon: '🦊', color: 'from-orange-600 to-red-600' },
  bitbucket: { name: 'Bitbucket', icon: '🪣', color: 'from-blue-600 to-indigo-700' },
  azure: { name: 'Azure DevOps', icon: '🔷', color: 'from-blue-500 to-cyan-600' },
};

export function MultiProviderRepoPickerModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  provider, 
  token, 
  username 
}: MultiProviderRepoPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState<RepositorySummary | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setCurrentPage(1);
      setSelectedRepo(null);
      setSelectedBranch('');
      setError(null);
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Fetch repositories from the selected provider
  const { data: reposData, isLoading: isLoadingRepos, error: reposError } = useQuery({
    queryKey: ['multi-provider-repos', provider, searchQuery, currentPage],
    queryFn: async (): Promise<RepositoryResponse> => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        provider,
        token,
      });
      
      if (searchQuery) {
        params.set('query', searchQuery);
      }
      if (username) {
        params.set('username', username);
      }

      const response = await fetch(`/api/integrations/multi-provider/repos?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch ${config.name} repositories`);
      }
      return response.json();
    },
    enabled: isOpen,
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch branches for selected repository
  const { data: branchesData, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['multi-provider-branches', provider, selectedRepo?.full_name],
    queryFn: async () => {
      if (!selectedRepo) return [];
      
      const params = new URLSearchParams({
        provider,
        token,
        repo: selectedRepo.full_name,
      });
      
      if (username) {
        params.set('username', username);
      }

      const response = await fetch(`/api/integrations/multi-provider/branches?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }
      return response.json();
    },
    enabled: !!selectedRepo,
  });

  // Add repository mutation
  const addRepoMutation = useMutation({
    mutationFn: async (repoData: {
      provider: Provider;
      remoteUrl: string;
      defaultBranch: string;
      name: string;
      credentials: {
        token: string;
        username?: string;
      };
    }) => {
      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add repository');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      setSelectedRepo(null);
      setSelectedBranch('');
      onSuccess?.();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
    onSettled: () => {
      setIsAdding(false);
    },
  });

  const handleRepoSelect = (repo: RepositorySummary) => {
    setSelectedRepo(repo);
    setSelectedBranch(repo.default_branch);
    setError(null);
  };

  const handleAddRepository = () => {
    if (!selectedRepo) return;

    setIsAdding(true);
    setError(null);

    addRepoMutation.mutate({
      provider,
      remoteUrl: selectedRepo.clone_url,
      defaultBranch: selectedBranch || selectedRepo.default_branch,
      name: selectedRepo.full_name,
      credentials: {
        token,
        username,
      },
    });
  };

  const handleBackToList = () => {
    setSelectedRepo(null);
    setSelectedBranch('');
    setError(null);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center`}>
              <span className="text-white text-lg">{config.icon}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Select {config.name} Repository
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedRepo ? `Configure ${selectedRepo.name}` : 'Choose a repository to add'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!selectedRepo ? (
            // Repository List View
            <div className="flex flex-col h-full">
              {/* Search */}
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={`Search ${config.name} repositories...`}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full pl-10 pr-4 py-3 bg-white/80 dark:bg-gray-700/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Repository List */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingRepos ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Loading repositories...</p>
                    </div>
                  </div>
                ) : reposError ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load repositories</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{reposError.message}</p>
                    </div>
                  </div>
                ) : reposData?.repos.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📂</div>
                      <p className="text-gray-600 dark:text-gray-400">No repositories found</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reposData?.repos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => handleRepoSelect(repo)}
                        className="w-full text-left p-4 bg-white/60 dark:bg-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl border border-gray-200/50 dark:border-gray-600/50 transition-all duration-200 hover:shadow-md group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {repo.name}
                              </span>
                              {repo.private && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
                                  Private
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>Default: {repo.default_branch}</span>
                            </div>
                          </div>
                          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {reposData && reposData.totalPages > 1 && (
                <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {reposData.repos.length} of {reposData.totalCount} repositories
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-1 text-sm font-medium">
                        {currentPage} of {reposData.totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, reposData.totalPages))}
                        disabled={currentPage === reposData.totalPages}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Repository Configuration View
            <div className="p-6">
              <button
                onClick={handleBackToList}
                className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span>Back to repositories</span>
              </button>

              <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedRepo.name}
                  </h3>
                  {selectedRepo.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {selectedRepo.description}
                    </p>
                  )}
                  <a
                    href={selectedRepo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View on {config.name} →
                  </a>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Default Branch
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={isLoadingBranches}
                    className="w-full px-4 py-3 bg-white/80 dark:bg-gray-700/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    {isLoadingBranches ? (
                      <option>Loading branches...</option>
                    ) : (
                      branchesData?.map((branch: any) => (
                        <option key={branch.name} value={branch.name}>
                          {branch.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleBackToList}
                    disabled={isAdding}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddRepository}
                    disabled={isAdding || !selectedBranch}
                    className={`px-6 py-3 bg-gradient-to-r ${config.color} text-white font-semibold rounded-xl hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
                  >
                    {isAdding ? (
                      <span className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Adding...</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <CheckIcon className="w-4 h-4" />
                        <span>Add Repository</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
