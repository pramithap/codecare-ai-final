import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface GitHubRepo {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  clone_url: string;
  html_url: string;
  ssh_url: string;
  updated_at: string;
  created_at: string;
  language: string | null;
  size: number;
  stargazers_count: number;
  forks_count: number;
  archived: boolean;
  disabled: boolean;
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
}

interface UserGitHubReposProps {
  onRepoAdded?: (repo: GitHubRepo) => void;
  onRepoSelected?: (repo: GitHubRepo) => void;
}

export const UserGitHubRepos: React.FC<UserGitHubReposProps> = ({ onRepoAdded, onRepoSelected }) => {
  const { data: session, status } = useSession();
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [reposPerPage] = useState(12); // Increased to show more per page with smaller cards
  const [addingRepos, setAddingRepos] = useState<Set<string>>(new Set());
  const [addedRepos, setAddedRepos] = useState<Set<string>>(new Set()); // Track already added repos by name

  // Ensure search term is always empty on mount
  useEffect(() => {
    setSearchTerm('');
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Check if user has GitHub access token (signed in with GitHub)
      const hasGitHubToken = (session as any).accessToken;
      
      if (hasGitHubToken) {
        // Automatically fetch repositories when GitHub account is connected
        fetchUserRepos();
        // Also load already added repositories
        loadAddedRepos();
      }
    }
  }, [status, session]);

  // Refresh added repos when needed (e.g., after deletion)
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === 'authenticated' && session) {
        loadAddedRepos();
      }
    }, 2000); // Check every 2 seconds for changes

    return () => clearInterval(interval);
  }, [status, session]);

  // Load already added repositories to show correct button states
  const loadAddedRepos = async () => {
    try {
      const response = await fetch('/api/repos');
      if (response.ok) {
        const existingRepos = await response.json();
        const githubRepoNames = new Set<string>(
          existingRepos
            .filter((repo: any) => repo.provider === 'github')
            .map((repo: any) => repo.name as string) // Use name for matching since GitHub repo names are unique per user
        );
        
        // We'll need to match by name instead of ID since API stores by name
        setAddedRepos(githubRepoNames);
      }
    } catch (error) {
      console.error('Error loading existing repositories:', error);
    }
  };

  const fetchUserRepos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if user has GitHub access token
      const hasGitHubToken = (session as any).accessToken;

      if (!hasGitHubToken) {
        setError('GitHub account not connected. Please sign in with GitHub to see your repositories.');
        return;
      }

      // Make a simple request to our API
      const response = await fetch('/api/github/user-repos', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repositories');
      }
      
      const data = await response.json();
      
      // Handle different response states
      if (data.empty_state) {
        setError(data.message || 'GitHub repositories will appear here when you sign in with GitHub.');
        setRepositories([]);
        return;
      }
      
      if (data.setup_required) {
        setError(data.message || 'GitHub integration setup required.');
        setRepositories([]);
        return;
      }
      
      // Remove duplicates based on repository ID and sort by updated date
      const repos = data.repositories || [];
      const uniqueRepos = repos.filter((repo: GitHubRepo, index: number, self: GitHubRepo[]) => 
        index === self.findIndex((r: GitHubRepo) => r.id === repo.id)
      ).sort((a: GitHubRepo, b: GitHubRepo) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      setRepositories(uniqueRepos);
      
      // Clear any previous errors on successful load
      if (uniqueRepos.length > 0) {
        setError(null);
      }
      
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
      setError(error instanceof Error ? error.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-add repository function
  const handleAddRepo = async (repo: GitHubRepo) => {
    if (addingRepos.has(repo.id) || addedRepos.has(repo.name)) return;
    
    setAddingRepos(prev => new Set(prev.add(repo.id)));
    
    try {
      // Call the onRepoAdded callback if provided
      if (onRepoAdded) {
        await onRepoAdded(repo);
      }
      
      // Mark repo as successfully added using repository name
      setAddedRepos(prev => new Set(prev.add(repo.name)));
      console.log('Added repository:', repo.name);
      
    } catch (error) {
      console.error('Failed to add repository:', error);
    } finally {
      setAddingRepos(prev => {
        const newSet = new Set(prev);
        newSet.delete(repo.id);
        return newSet;
      });
    }
  };

  // Filter repositories based on search term
  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.language?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredRepositories.length / reposPerPage);
  const startIndex = currentPage * reposPerPage;
  const endIndex = startIndex + reposPerPage;
  const currentRepos = filteredRepositories.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getLanguageColor = (language: string | null) => {
    const colors: Record<string, string> = {
      'JavaScript': 'bg-yellow-500',
      'TypeScript': 'bg-blue-500',
      'Python': 'bg-green-500',
      'Java': 'bg-red-500',
      'C#': 'bg-purple-500',
      'Go': 'bg-cyan-500',
      'Rust': 'bg-orange-500',
      'PHP': 'bg-indigo-500',
      'Ruby': 'bg-red-400',
      'Swift': 'bg-orange-400',
      'Kotlin': 'bg-purple-400',
    };
    return colors[language || ''] || 'bg-gray-500';
  };

  if (status === 'loading') {
    return (
      <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-600/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-600/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span>🐙</span>
            <span>Your GitHub Repositories</span>
          </h2>
          <p className="text-slate-300 mt-1">
            Connect your GitHub account to see your repositories automatically
          </p>
        </div>
        <div className="p-8 text-center">
          <div className="text-blue-400 text-6xl mb-4">🔗</div>
          <h3 className="text-xl font-medium text-white mb-3">Connect to GitHub</h3>
          <p className="text-slate-300 mb-6 max-w-md mx-auto">
            Sign in with your GitHub account to automatically see all your repositories and start scanning for dependency updates.
          </p>
          <a 
            href="/sign-in"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>Sign in with GitHub</span>
          </a>
          <div className="mt-4 text-xs text-slate-400">
            Your repositories will appear here automatically after signing in
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-600/50 overflow-hidden">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <span>🐙</span>
              <span>Your GitHub Repositories</span>
              {repositories.length > 0 && (
                <span className="bg-slate-700 text-slate-300 text-sm px-2 py-1 rounded-full ml-2">
                  {repositories.length}
                </span>
              )}
            </h2>
            <p className="text-slate-300 mt-1">
              Repositories automatically loaded from your GitHub account
            </p>
          </div>
          <button
            onClick={fetchUserRepos}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Search Input */}
        {repositories.length > 0 && (
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search repositories by name, description, or language..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0); // Reset to first page when searching
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(0);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-slate-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pagination Info */}
        {repositories.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {searchTerm ? (
                <>Showing {currentRepos.length} of {filteredRepositories.length} filtered repositories</>
              ) : (
                <>Showing {startIndex + 1}-{Math.min(endIndex, filteredRepositories.length)} of {filteredRepositories.length} repositories</>
              )}
            </div>
            {totalPages > 1 && (
              <div className="text-sm text-slate-400">
                Page {currentPage + 1} of {totalPages}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            <span className="ml-3 text-slate-400">Loading your GitHub repositories...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            {error.includes('not connected') ? (
              <>
                <div className="text-blue-400 text-4xl mb-4">🐙</div>
                <h3 className="text-xl font-medium text-white mb-2">Connect Your GitHub Account</h3>
                <p className="text-blue-300 mb-6 max-w-md mx-auto">{error}</p>
                <div className="space-x-4">
                  <a 
                    href="/sign-in"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-block"
                  >
                    Sign in with GitHub
                  </a>
                </div>
              </>
            ) : error.includes('appear here when') || error.includes('appear here automatically') ? (
              <>
                <div className="text-slate-400 text-4xl mb-4">📂</div>
                <h3 className="text-xl font-medium text-white mb-2">Ready for Your Repositories</h3>
                <p className="text-slate-300 mb-6 max-w-md mx-auto">{error}</p>
                <div className="bg-slate-700/30 rounded-lg p-4 max-w-md mx-auto text-sm text-slate-400">
                  <p>✨ Your GitHub repositories will automatically appear here once you sign in with your GitHub account.</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-red-400 text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-medium text-white mb-2">Failed to Load Repositories</h3>
                <p className="text-red-300 mb-4">{error}</p>
                <div className="space-x-4">
                  <button 
                    onClick={fetchUserRepos}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </>
            )}
          </div>
        ) : currentRepos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 text-6xl mb-4">📭</div>
            <h3 className="text-xl font-medium text-white mb-2">No repositories found</h3>
            <p className="text-slate-400">
              Your GitHub account doesn't have any repositories yet.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {currentRepos.map((repo) => (
              <div
                key={repo.id}
                className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700/70 transition-colors border border-slate-600/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-1 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full ${repo.private ? 'bg-yellow-500' : 'bg-green-400'}`}></div>
                    <h3 className="font-semibold text-white text-sm truncate flex-1">
                      {repo.name}
                    </h3>
                  </div>
                  {repo.private && (
                    <div className="bg-yellow-500/20 text-yellow-300 text-xs px-1.5 py-0.5 rounded flex-shrink-0">
                      Private
                    </div>
                  )}
                </div>

                <p className="text-slate-300 text-xs mb-2 line-clamp-2 h-8">
                  {repo.description || 'No description available'}
                </p>

                <div className="flex items-center justify-between mb-2 text-xs">
                  {repo.language && (
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${getLanguageColor(repo.language)}`}></div>
                      <span className="text-slate-400 truncate">{repo.language}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-slate-500">
                    <span className="flex items-center space-x-0.5">
                      <span>⭐</span>
                      <span>{repo.stargazers_count}</span>
                    </span>
                    <span className="flex items-center space-x-0.5">
                      <span>🍴</span>
                      <span>{repo.forks_count}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs truncate">
                    {formatDate(repo.updated_at)}
                  </span>
                  <div className="flex space-x-1">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs transition-colors"
                    >
                      View
                    </a>
                    <button
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        addedRepos.has(repo.name)
                          ? 'bg-green-700 text-green-200 cursor-not-allowed'
                          : addingRepos.has(repo.id)
                          ? 'bg-yellow-600 text-white cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                      onClick={() => handleAddRepo(repo)}
                      disabled={addingRepos.has(repo.id) || addedRepos.has(repo.name)}
                    >
                      {addedRepos.has(repo.name) 
                        ? '✓ Added' 
                        : addingRepos.has(repo.id) 
                        ? '...' 
                        : '+ Add'
                      }
                    </button>
                  </div>
                </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 bg-slate-700 text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                >
                  ← Prev
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`px-3 py-1 rounded transition-colors ${
                        i === currentPage 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="px-3 py-1 bg-slate-700 text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {repositories.length > 0 && (
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">
              Total: {repositories.length} repositories
            </span>
            <button
              onClick={fetchUserRepos}
              className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              🔄 Refresh repositories
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
