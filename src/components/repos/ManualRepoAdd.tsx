import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ManualRepoAddProps {
  className?: string;
  onSuccess?: () => void;
}

export function ManualRepoAdd({ className = '', onSuccess }: ManualRepoAddProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const addRepoMutation = useMutation({
    mutationFn: async (data: { repoUrl: string; defaultBranch: string }) => {
      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'github',
          remoteUrl: data.repoUrl,
          defaultBranch: data.defaultBranch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add repository');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      setRepoUrl('');
      setDefaultBranch('main');
      setError('');
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setError('');
    setIsLoading(true);
    
    addRepoMutation.mutate({
      repoUrl: repoUrl.trim(),
      defaultBranch: defaultBranch.trim() || 'main',
    });
  };

  const extractRepoName = (url: string): string => {
    try {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        return `${match[1]}/${match[2].replace(/\.git$/, '')}`;
      }
    } catch {
      // Ignore
    }
    return '';
  };

  return (
    <div className={`bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-600/50 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">🔗</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Add Repository URL</h3>
          <p className="text-sm text-slate-400">Add a GitHub repository by URL</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Repository URL
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="w-full px-4 py-2 bg-slate-700/80 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm"
            required
            disabled={isLoading}
          />
          {repoUrl && (
            <p className="text-xs text-slate-400 mt-1">
              Repository: {extractRepoName(repoUrl) || 'Invalid URL format'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Default Branch
          </label>
          <input
            type="text"
            value={defaultBranch}
            onChange={(e) => setDefaultBranch(e.target.value)}
            placeholder="main"
            className="w-full px-4 py-2 bg-slate-700/80 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!repoUrl.trim() || isLoading}
          className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] backdrop-blur-sm"
        >
          {isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Adding Repository...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <span>➕</span>
              <span>Add Repository</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
