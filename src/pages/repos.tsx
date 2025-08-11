'use client';

import { useState } from 'react';
import { ZipUploadCard } from '../components/repos/ZipUploadCard';
import { ManualRepoAdd } from '../components/repos/ManualRepoAdd';
import { PatRepoAdd } from '../components/repos/PatRepoAdd';
import { MultiProviderRepoPickerModal } from '../components/repos/MultiProviderRepoPickerModal';
import { ReposTable } from '../components/repos/ReposTable';
import { UserGitHubRepos } from '../components/repos/UserGitHubRepos';
import type { Provider } from '../types/repos';

export default function ReposPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRepoPickerOpen, setIsRepoPickerOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providerToken, setProviderToken] = useState('');
  const [providerUsername, setProviderUsername] = useState('');

  const handleRepoDeleted = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRepoAdded = async (repo?: any) => {
    if (repo) {
      // Add GitHub repository via API
      try {
        const response = await fetch('/api/repos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: repo.name,
            provider: 'github',
            remoteUrl: repo.html_url,
            defaultBranch: repo.default_branch,
            description: repo.description,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to add repository');
        }
        
        console.log('Repository added successfully:', repo.name);
      } catch (error) {
        console.error('Error adding repository:', error);
        // You might want to show a toast notification here
      }
    }
    
    setRefreshKey(prev => prev + 1);
    setIsRepoPickerOpen(false);
  };

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenRepoSelector = (provider: Provider, token: string, username?: string) => {
    setSelectedProvider(provider);
    setProviderToken(token);
    setProviderUsername(username || '');
    setIsRepoPickerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      {/* Enhanced Header with gradient and glassmorphism */}
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-600/50 shadow-lg">
        <div className="max-w-[95vw] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="py-8">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">📚</span>
                </div>
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight leading-tight">
                  🚀 Repositories Hub
                </h1>
                <div className="mt-3 p-3 bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-lg border border-slate-600/50 backdrop-blur-sm">
                  <p className="text-slate-200 text-base font-medium leading-relaxed">
                    <span className="inline-flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                      <span>Connect Git repositories from multiple providers, Enter a Git Repo URL, or upload ZIP files to start scanning for dependency updates</span>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content with reduced margins */}
      <div className="max-w-[95vw] mx-auto px-3 sm:px-4 lg:px-6 py-6">
        {/* GitHub Repositories Section */}
        <div className="mb-8">
          <UserGitHubRepos onRepoAdded={handleRepoAdded} key={refreshKey} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Connect & Upload Cards - Now smaller */}
          <div className="xl:col-span-1 space-y-6">
            {/* Multi-provider Git Repository Addition */}
            <PatRepoAdd onSuccess={handleRepoAdded} onOpenRepoSelector={handleOpenRepoSelector} />

            <ManualRepoAdd onSuccess={handleRepoAdded} />

            <ZipUploadCard onSuccess={handleUploadSuccess} />
          </div>

          {/* Right Column - Repositories Table - Now takes 3/4 of width */}
          <div className="xl:col-span-3">
            <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-600/50 overflow-hidden">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                  <span>🗂️</span>
                  <span>Repository Management</span>
                </h2>
                <p className="text-slate-300 mt-1">
                  Repositories you've added or uploaded
                </p>
              </div>
              <ReposTable key={refreshKey} onRepoDeleted={handleRepoDeleted} />
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Provider Repository Picker Modal */}
      {selectedProvider && (
        <MultiProviderRepoPickerModal
          isOpen={isRepoPickerOpen}
          onClose={() => {
            setIsRepoPickerOpen(false);
            setSelectedProvider(null);
          }}
          onSuccess={handleRepoAdded}
          provider={selectedProvider}
          token={providerToken}
          username={providerUsername}
        />
      )}
    </div>
  );
}
