import { useQuery } from '@tanstack/react-query';
import type { ScanRun, RepoRef } from '../../types/scanNew';

interface ScanProgressProps {
  runId: string;
  onComplete?: (run: ScanRun) => void;
}

export default function ScanProgress({ runId, onComplete }: ScanProgressProps) {
  const { data: run, isLoading, error } = useQuery({
    queryKey: ['scanRun', runId],
    queryFn: async (): Promise<ScanRun> => {
      const response = await fetch(`/api/scanNew/run/${runId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scan run');
      }
      return response.json();
    },
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      console.log('ScanProgress polling, data:', data?.status, data?.completedRepos, '/', data?.totalRepos);
      
      // Stop polling if completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        console.log('Scan completed, calling onComplete with:', data);
        if (data.status === 'completed' && onComplete) {
          onComplete(data);
        }
        return false;
      }
      return 1000; // Poll every second
    },
    refetchIntervalInBackground: false,
  });

  if (isLoading && !run) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white">Loading scan status...</span>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-500/20 p-6">
        <div className="flex items-center space-x-3">
          <span className="text-red-400">❌</span>
          <span className="text-white">Failed to load scan status</span>
        </div>
        {error && (
          <p className="text-red-300 text-sm mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        )}
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '⚡';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const overallProgress = run.repos.length > 0 
    ? Math.round(run.repos.reduce((sum: number, repo: RepoRef) => {
        const progress = run.progress[repo.id];
        return sum + (progress?.progress || 0);
      }, 0) / run.repos.length)
    : 0;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getStatusIcon(run.status)}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">Scan Progress</h3>
            <p className={`text-sm ${getStatusColor(run.status)}`}>
              Status: {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{overallProgress}%</div>
          <div className="text-xs text-gray-300">Overall Progress</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-700/50 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Repository Progress */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-200">Repository Progress:</h4>
        
        {run.repos.map((repo) => {
          const progress = run.progress[repo.id];
          const repoProgress = progress?.progress || 0;
          
          return (
            <div key={repo.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400">📁</span>
                  <span className="text-white font-medium">{repo.name}</span>
                  {progress?.status && (
                    <span className={`text-xs ${getStatusColor(progress.status)}`}>
                      {getStatusIcon(progress.status)} {progress.status}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-white">{repoProgress}%</div>
              </div>

              <div className="w-full bg-gray-700/50 rounded-full h-1.5 mb-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${repoProgress}%` }}
                />
              </div>

              {progress?.message && (
                <p className="text-xs text-gray-300">{progress.message}</p>
              )}

              {progress?.error && (
                <p className="text-xs text-red-300 mt-1">Error: {progress.error}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Scan Details */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-300">Started:</span>
            <span className="text-white ml-2">
              {new Date(run.startTime).toLocaleTimeString()}
            </span>
          </div>
          {run.endTime && (
            <div>
              <span className="text-gray-300">Completed:</span>
              <span className="text-white ml-2">
                {new Date(run.endTime).toLocaleTimeString()}
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-300">Repositories:</span>
            <span className="text-white ml-2">{run.repos.length}</span>
          </div>
          <div>
            <span className="text-gray-300">Depth:</span>
            <span className="text-white ml-2 capitalize">{run.depth}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
