import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import type { Provider } from '../../types/repos';

interface PatRepoAddProps {
  className?: string;
  onSuccess?: () => void;
  onOpenRepoSelector?: (provider: Provider, token: string, username?: string) => void;
}

type SupportedProvider = Exclude<Provider, 'zip'>;

interface ProviderConfig {
  name: string;
  icon: string;
  color: string;
  patLabel: string;
  urlPlaceholder: string;
  urlPattern: RegExp;
  extractName: (url: string) => string;
  patInstructions: string;
}

const PROVIDER_CONFIGS: Record<SupportedProvider, ProviderConfig> = {
  github: {
    name: 'GitHub',
    icon: '🐙',
    color: 'from-gray-800 to-black',
    patLabel: 'Personal Access Token',
    urlPlaceholder: 'https://github.com/owner/repository',
    urlPattern: /github\.com\/([^\/]+)\/([^\/]+)/,
    extractName: (url: string) => {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      return match ? `${match[1]}/${match[2].replace(/\.git$/, '')}` : '';
    },
    patInstructions: 'Go to GitHub Settings → Developer settings → Personal access tokens → Generate new token. Required scopes: repo'
  },
  gitlab: {
    name: 'GitLab',
    icon: '🦊',
    color: 'from-orange-600 to-red-600',
    patLabel: 'Personal Access Token',
    urlPlaceholder: 'https://gitlab.com/group/project',
    urlPattern: /gitlab\.com\/([^\/]+)\/([^\/]+)/,
    extractName: (url: string) => {
      const match = url.match(/gitlab\.com\/([^\/]+)\/([^\/]+)/);
      return match ? `${match[1]}/${match[2].replace(/\.git$/, '')}` : '';
    },
    patInstructions: 'Go to GitLab User Settings → Access Tokens → Add new token. Required scopes: read_repository'
  },
  bitbucket: {
    name: 'Bitbucket',
    icon: '🪣',
    color: 'from-blue-600 to-indigo-700',
    patLabel: 'App Password',
    urlPlaceholder: 'https://bitbucket.org/workspace/repository',
    urlPattern: /bitbucket\.org\/([^\/]+)\/([^\/]+)/,
    extractName: (url: string) => {
      const match = url.match(/bitbucket\.org\/([^\/]+)\/([^\/]+)/);
      return match ? `${match[1]}/${match[2].replace(/\.git$/, '')}` : '';
    },
    patInstructions: 'Go to Bitbucket Settings → Personal Bitbucket settings → App passwords → Create app password. Required permissions: Repositories (Read)'
  },
  azure: {
    name: 'Azure DevOps',
    icon: '🔷',
    color: 'from-blue-500 to-cyan-600',
    patLabel: 'Personal Access Token',
    urlPlaceholder: 'https://dev.azure.com/org/project/_git/repository',
    urlPattern: /dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_git\/([^\/]+)/,
    extractName: (url: string) => {
      const match = url.match(/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_git\/([^\/]+)/);
      return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
    },
    patInstructions: 'Go to Azure DevOps → User settings → Personal access tokens → New token. Required scopes: Code (read)'
  }
};

export function PatRepoAdd({ className = '', onSuccess, onOpenRepoSelector }: PatRepoAddProps) {
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('github');
  const [pat, setPat] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isValidating, setIsValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const config = PROVIDER_CONFIGS[selectedProvider];

  const addRepoMutation = useMutation({
    mutationFn: async (data: { 
      provider: SupportedProvider;
      pat: string;
      username?: string;
    }) => {
      // This will be used later for adding specific repositories
      return { success: true };
    },
    onSuccess: () => {
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

  const handleProviderChange = (provider: SupportedProvider) => {
    setSelectedProvider(provider);
    setPat('');
    setUsername('');
    setError('');
    setTokenValid(null);
  };

  const validateToken = async () => {
    if (!pat.trim() || (selectedProvider === 'bitbucket' && !username.trim())) {
      return;
    }

    setIsValidating(true);
    setError('');
    
    try {
      const response = await fetch('/api/integrations/git/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          token: pat.trim(),
          username: username.trim() || undefined,
        }),
      });

      const result = await response.json();
      
      if (result.valid) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
        setError(result.error || 'Token validation failed');
      }
    } catch (err) {
      setTokenValid(false);
      setError('Failed to validate token');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className={`bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-600/50 p-6 hover:shadow-2xl transition-shadow duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center shadow-lg`}>
            <span className="text-white text-xl">{config.icon}</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white whitespace-nowrap">Connect to Git Provider</h3>
            <p className="text-sm text-slate-400">Connect from GitHub, GitLab, Bitbucket, or Azure DevOps</p>
          </div>
        </div>
      </div>



      {/* Provider Selection */}
      <div className="mb-6">
        <div className="mb-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <p className="text-sm text-blue-300">
            <span className="font-semibold">Instructions:</span> Select your Git provider below and enter your Personal Access Token to connect and import repositories.
          </p>
        </div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Choose Git Provider
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(PROVIDER_CONFIGS).map(([key, providerConfig]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleProviderChange(key as SupportedProvider)}
              disabled={isLoading}
              className={`group relative overflow-hidden p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] ${
                selectedProvider === key
                  ? `border-transparent bg-gradient-to-r ${providerConfig.color} text-white shadow-lg hover:shadow-xl`
                  : 'border-slate-600 bg-slate-700/80 text-slate-300 hover:border-slate-500 hover:bg-slate-700/90 hover:shadow-md'
              } ${isLoading ? 'opacity-50 cursor-not-allowed transform-none' : 'cursor-pointer'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  selectedProvider === key
                    ? 'bg-white/20 backdrop-blur-sm'
                    : `bg-gradient-to-br ${providerConfig.color} text-white group-hover:scale-110 transition-transform`
                }`}>
                  <span className="text-lg">{providerConfig.icon}</span>
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-semibold text-base ${
                    selectedProvider === key ? 'text-white' : 'text-white'
                  }`}>
                    {providerConfig.name}
                  </div>
                  <div className={`text-sm ${
                    selectedProvider === key 
                      ? 'text-white/80' 
                      : 'text-slate-400'
                  }`}>
                    {key === 'github' && 'Most popular platform'}
                    {key === 'gitlab' && 'DevOps platform'}
                    {key === 'bitbucket' && 'Atlassian solution'}
                    {key === 'azure' && 'Microsoft platform'}
                  </div>
                </div>
                {selectedProvider === key && (
                  <div className="text-white">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Subtle animation overlay */}
              <div className={`absolute inset-0 bg-gradient-to-r ${providerConfig.color} opacity-0 group-hover:opacity-5 transition-opacity rounded-xl`}></div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {selectedProvider === 'bitbucket' && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-username"
              className="w-full px-4 py-3 bg-slate-700/80 border-2 border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm transition-all duration-200 hover:bg-slate-700/90"
              required
              disabled={isLoading}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            {config.patLabel}
          </label>
          <div className="relative">
            <input
              type="password"
              value={pat}
              onChange={(e) => {
                setPat(e.target.value);
                setTokenValid(null);
              }}
              onBlur={validateToken}
              placeholder={`Enter your ${config.patLabel.toLowerCase()}`}
              className={`w-full px-4 py-3 pr-12 bg-slate-700/80 border-2 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 backdrop-blur-sm transition-all duration-200 hover:bg-slate-700/90 ${
                tokenValid === true 
                  ? 'border-green-500 focus:ring-green-500 focus:border-green-500' 
                  : tokenValid === false
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-600 focus:ring-blue-500 focus:border-blue-500'
              }`}
              required
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              {isValidating ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : tokenValid === true ? (
                <CheckIcon className="w-5 h-5 text-green-500" />
              ) : tokenValid === false ? (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              ) : null}
            </div>
          </div>
          {tokenValid === true && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center space-x-1">
              <CheckIcon className="w-4 h-4" />
              <span>Token is valid and authenticated</span>
            </p>
          )}
          {tokenValid === false && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center space-x-1">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Token validation failed</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-800/50 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
            </div>
          </div>
        )}

        {tokenValid === true && (
          <button
            type="button"
            onClick={() => {
              if (onOpenRepoSelector) {
                onOpenRepoSelector(selectedProvider, pat, selectedProvider === 'bitbucket' ? username : undefined);
              } else {
                console.log('Add repositories from', selectedProvider);
                // Fallback: could open a simple modal or navigate to a repo selection page
              }
            }}
            className={`w-full px-6 py-4 bg-gradient-to-r ${config.color} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] backdrop-blur-sm`}
          >
            <span className="flex items-center justify-center space-x-2">
              <span>{config.icon}</span>
              <span>Add {config.name} Repository</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
