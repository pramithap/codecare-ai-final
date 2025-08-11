import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RepoRef } from '../../types/scanNew';
import type { Repository } from '../../types/repos';

interface RepoSelectorProps {
  onReposSelected: (repos: RepoRef[]) => void;
  isLoading?: boolean;
  initialSelectedRepos?: RepoRef[];
}

export default function RepoSelector({ onReposSelected, isLoading = false, initialSelectedRepos = [] }: RepoSelectorProps) {
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(new Set());

  // Fetch repositories from the API
  const { data: repositories = [], isLoading: isLoadingRepos, error } = useQuery({
    queryKey: ['repos'],
    queryFn: async (): Promise<Repository[]> => {
      const response = await fetch('/api/repos');
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
      return response.json();
    },
  });

  // Convert Repository to RepoRef format
  const convertToRepoRef = (repo: Repository): RepoRef => ({
    id: repo.id,
    name: repo.name,
    provider: repo.provider as 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'zip',
    remoteUrl: repo.remoteUrl || undefined,
    defaultBranch: repo.defaultBranch,
  });

  // Initialize selected repos from props
  useEffect(() => {
    if (initialSelectedRepos.length > 0) {
      const initialIds = new Set(initialSelectedRepos.map(repo => repo.id));
      setSelectedRepoIds(initialIds);
    }
  }, [initialSelectedRepos]);

  // Update selected repos when selection changes
  useEffect(() => {
    const selectedRepos = repositories
      .filter((repo: Repository) => selectedRepoIds.has(repo.id))
      .map(convertToRepoRef);
    onReposSelected(selectedRepos);
  }, [selectedRepoIds, repositories, onReposSelected]);

  const handleRepoToggle = (repoId: string) => {
    if (isLoading) return;
    
    const newSelected = new Set(selectedRepoIds);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepoIds(newSelected);
  };

  const handleSelectAll = () => {
    if (isLoading) return;
    
    if (selectedRepoIds.size === repositories.length) {
      setSelectedRepoIds(new Set());
    } else {
      setSelectedRepoIds(new Set(repositories.map((repo: Repository) => repo.id)));
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'github':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      case 'gitlab':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
          </svg>
        );
      case 'bitbucket':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.499.515.867 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z"/>
          </svg>
        );
      case 'azure':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.5 3L8.25 9.75h-3L13.5 21 18.75 14.25h3L13.5 3z"/>
          </svg>
        );
      case 'zip':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'drift': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        );
      case 'new':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
          </svg>
        );
      case 'drift':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
        );
      case 'error':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
          </svg>
        );
    }
  };

  if (isLoadingRepos) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/60 shadow-lg shadow-slate-900/40 p-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="relative">
            <div className="w-8 h-8 border-3 border-slate-500 border-t-indigo-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-8 h-8 border-3 border-transparent border-t-indigo-300 rounded-full animate-spin animation-delay-150"></div>
          </div>
          <div>
            <div className="text-white font-semibold">Loading repositories...</div>
            <div className="text-slate-300 text-sm">Fetching your project data</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 rounded-2xl border border-red-700/60 shadow-lg shadow-red-900/40 p-8">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 className="text-red-200 font-semibold text-lg">Unable to Load Repositories</h3>
            <p className="text-red-300 mt-1">
              We couldn't fetch your repositories. Please make sure you have added repositories on the Repositories page.
            </p>
            <button className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/60 shadow-lg shadow-slate-900/40 p-8">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-800 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Repositories Found</h3>
          <p className="text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
            Get started by adding your first repository. We'll help you scan and analyze your codebase for dependencies and security issues.
          </p>
          <a
            href="/repos"
            className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-indigo-500/25"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            <span>Add Your First Repository</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/60 shadow-lg shadow-slate-900/40 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
            </div>
            <span>Select Repositories</span>
          </h3>
          <p className="text-slate-300 mt-2">Choose which repositories you'd like to scan for dependencies and security issues</p>
        </div>
        <button
          onClick={handleSelectAll}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-600/40 hover:border-indigo-500/60"
        >
          {selectedRepoIds.size === repositories.length ? (
            <>
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              Deselect All
            </>
          ) : (
            <>
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              Select All
            </>
          )}
        </button>
      </div>
      
      <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
        {repositories.map((repo: Repository) => {
          const isSelected = selectedRepoIds.has(repo.id);
          
          return (
            <div
              key={repo.id}
              onClick={() => handleRepoToggle(repo.id)}
              className={`group cursor-pointer border-2 rounded-xl p-6 transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-500/60 shadow-md shadow-indigo-900/50 scale-[1.02]'
                  : 'bg-slate-700/60 border-slate-600 hover:border-indigo-500/60 hover:shadow-md hover:shadow-slate-900/50 hover:scale-[1.01]'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-5">
                {/* Custom Checkbox */}
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500 shadow-lg shadow-indigo-500/25' 
                      : 'border-slate-500 group-hover:border-indigo-400 bg-slate-800'
                  }`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Provider Icon */}
                <div className={`flex-shrink-0 p-3 rounded-xl transition-colors ${
                  repo.provider === 'github' ? 'bg-slate-100 text-slate-700' :
                  repo.provider === 'gitlab' ? 'bg-orange-100 text-orange-700' :
                  repo.provider === 'bitbucket' ? 'bg-blue-100 text-blue-700' :
                  repo.provider === 'azure' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {getProviderIcon(repo.provider)}
                </div>
                
                {/* Repository Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {repo.name}
                    </h4>
                    <span className="px-3 py-1 bg-slate-600 text-slate-300 rounded-full text-sm font-medium">
                      {repo.defaultBranch}
                    </span>
                  </div>
                  
                  {repo.remoteUrl && (
                    <div className="text-sm text-slate-400 mb-3 truncate font-mono bg-slate-800/60 px-3 py-1 rounded-lg">
                      {repo.remoteUrl}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">Provider:</span>
                      <span className="font-medium text-slate-300 capitalize">{repo.provider}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">Status:</span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(repo.status)}`}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(repo.status)}
                          <span className="capitalize">{repo.status}</span>
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">Last Scan:</span>
                      <span className="font-medium text-slate-300">
                        {repo.lastScanAt 
                          ? new Date(repo.lastScanAt).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedRepoIds.size > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-600/40 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <div className="text-indigo-300 font-semibold">
                  {selectedRepoIds.size} of {repositories.length} repositories selected
                </div>
                <div className="text-indigo-400 text-sm">Ready to scan for dependencies and security issues</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
