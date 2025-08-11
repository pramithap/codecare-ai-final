import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { formatEolDate, getEolStatus, getEolTooltip, getEolTextColor } from '../lib/eol-client';

interface Library {
  name: string;
  currentVersion: string;
  type: 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon';
  latestVersion?: string;
  releaseDate?: string;
  securityStatus?: 'safe' | 'warning' | 'critical';
  eolDate?: string;
  security?: {
    count: number;
    severity: 'Low' | 'Med' | 'High' | 'Unknown';
  };
  selected: boolean;
}

interface ScanResponse {
  success: boolean;
  data?: {
    project: string;
    libs: Array<{
      name: string;
      currentVersion: string;
      type: string;
    }>;
  };
  error?: string;
}

// Security utility functions
const severityIcons = {
  Low: '✅',
  Med: '⚠️',
  High: '❌',
  Unknown: '—',
};

function severityClass(sev: string) {
  return sev === 'Low'    ? 'text-green-600' :
         sev === 'Med'    ? 'text-yellow-600' :
         sev === 'High'   ? 'text-red-600' :
                            'text-slate-500';
}

export default function Dashboard() {
  const [isScanned, setIsScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    step: string;
    progress: number;
    details: string;
  }>({ step: '', progress: 0, details: '' });
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionProgress, setVersionProgress] = useState<{
    step: string;
    progress: number;
    details: string;
    current: number;
    total: number;
  }>({ step: '', progress: 0, details: '', current: 0, total: 0 });
  const [projectName, setProjectName] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Function to fetch version data for libraries
  const fetchVersionData = async (libs: Library[]) => {
    setIsLoadingVersions(true);
    setVersionProgress({ 
      step: 'Initializing', 
      progress: 5, 
      details: 'Preparing to fetch version information...', 
      current: 0, 
      total: libs.length 
    });
    
    try {
      setVersionProgress({ 
        step: 'Connecting', 
        progress: 15, 
        details: 'Connecting to package registries...', 
        current: 0, 
        total: libs.length 
      });

      const response = await fetch('/api/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          libs: libs.map(lib => ({
            name: lib.name,
            currentVersion: lib.currentVersion,
            type: lib.type
          }))
        }),
      });

      setVersionProgress({ 
        step: 'Processing', 
        progress: 45, 
        details: 'Processing version data from registries...', 
        current: Math.floor(libs.length * 0.3), 
        total: libs.length 
      });

      const result = await response.json();

      setVersionProgress({ 
        step: 'Enriching', 
        progress: 70, 
        details: 'Enriching with security and EOL data...', 
        current: Math.floor(libs.length * 0.6), 
        total: libs.length 
      });

      if (result.success && result.enriched) {
        setVersionProgress({ 
          step: 'Finalizing', 
          progress: 90, 
          details: 'Finalizing library information...', 
          current: Math.floor(libs.length * 0.85), 
          total: libs.length 
        });

        // Merge the enriched data with existing libraries
        const enrichedLibraries = libs.map(lib => {
          const enrichedData = result.enriched.find((e: any) => e.name === lib.name);
          return {
            ...lib,
            latestVersion: enrichedData?.latestVersion,
            releaseDate: enrichedData?.releaseDate,
            eolDate: enrichedData?.eolDate,
            security: enrichedData?.security,
          };
        });
        setLibraries(enrichedLibraries);
        
        // Store libraries and project name in localStorage for compatibility page
        localStorage.setItem('scannedLibraries', JSON.stringify(enrichedLibraries));
        localStorage.setItem('projectName', projectName);

        setVersionProgress({ 
          step: 'Complete', 
          progress: 100, 
          details: `Successfully enriched ${libs.length} dependencies`, 
          current: libs.length, 
          total: libs.length 
        });

        // Small delay to show completion
        setTimeout(() => {
          setIsLoadingVersions(false);
          setVersionProgress({ step: '', progress: 0, details: '', current: 0, total: 0 });
        }, 1500);
      } else {
        console.warn('Failed to fetch version data:', result.error);
        setVersionProgress({ 
          step: 'Error', 
          progress: 0, 
          details: 'Failed to fetch version data', 
          current: 0, 
          total: libs.length 
        });
      }
    } catch (err) {
      console.error('Error fetching version data:', err);
      setVersionProgress({ 
        step: 'Error', 
        progress: 0, 
        details: 'Network error while fetching version data', 
        current: 0, 
        total: libs.length 
      });
    } finally {
      setTimeout(() => {
        setIsLoadingVersions(false);
        setVersionProgress({ step: '', progress: 0, details: '', current: 0, total: 0 });
      }, 1000);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.zip')) {
      setError('Please upload a ZIP file');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanProgress({ step: 'Uploading', progress: 10, details: `Uploading ${file.name}...` });

    try {
      const formData = new FormData();
      formData.append('file', file);

      setScanProgress({ step: 'Processing', progress: 30, details: 'Extracting and analyzing project structure...' });

      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });

      setScanProgress({ step: 'Scanning', progress: 60, details: 'Identifying dependencies and manifest files...' });

      const result: ScanResponse = await response.json();

      setScanProgress({ step: 'Finalizing', progress: 90, details: 'Processing scan results...' });

      if (result.success && result.data) {
        setProjectName(result.data.project);
        localStorage.setItem('projectName', result.data.project);
        const initialLibraries = result.data.libs.map(lib => ({
          ...lib,
          type: lib.type as 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon',
          selected: false,
          latestVersion: undefined,
          releaseDate: undefined,
          securityStatus: undefined,
          eolDate: undefined,
          security: undefined,
        }));
        setLibraries(initialLibraries);
        setIsScanned(true);
        
        setScanProgress({ step: 'Complete', progress: 100, details: `Found ${initialLibraries.length} dependencies` });
        
        // Small delay to show completion
        setTimeout(() => {
          setIsScanning(false);
          setScanProgress({ step: '', progress: 0, details: '' });
          // Fetch version data automatically
          fetchVersionData(initialLibraries);
        }, 1000);
      } else {
        setError(result.error || 'Failed to scan project');
      }
    } catch (err) {
      setError('Failed to upload and scan file');
      console.error('Upload error:', err);
    } finally {
      setIsScanning(false);
      setScanProgress({ step: '', progress: 0, details: '' });
    }
  };

  const handleGitScan = async () => {
    if (!gitUrl.trim()) {
      setError('Please enter a Git repository URL');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanProgress({ step: 'Connecting', progress: 15, details: 'Connecting to Git repository...' });

    try {
      setScanProgress({ step: 'Fetching', progress: 35, details: 'Fetching repository structure via GitHub API...' });

      const response = await fetch('/api/scan-git', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gitUrl: gitUrl.trim() }),
      });

      setScanProgress({ step: 'Analyzing', progress: 65, details: 'Analyzing manifest files and dependencies...' });

      const result: ScanResponse = await response.json();

      setScanProgress({ step: 'Processing', progress: 85, details: 'Processing dependency data...' });

      if (result.success && result.data) {
        setProjectName(result.data.project);
        localStorage.setItem('projectName', result.data.project);
        const initialLibraries = result.data.libs.map(lib => ({
          ...lib,
          type: lib.type as 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon',
          selected: false,
          latestVersion: undefined,
          releaseDate: undefined,
          securityStatus: undefined,
          eolDate: undefined,
          security: undefined,
        }));
        setLibraries(initialLibraries);
        setIsScanned(true);
        setGitUrl('');
        
        setScanProgress({ step: 'Complete', progress: 100, details: `Discovered ${initialLibraries.length} dependencies` });
        
        // Small delay to show completion
        setTimeout(() => {
          setIsScanning(false);
          setScanProgress({ step: '', progress: 0, details: '' });
          // Fetch version data automatically
          fetchVersionData(initialLibraries);
        }, 1000);
      } else {
        setError(result.error || 'Failed to scan repository');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan repository');
      console.error('Git scan error:', err);
    } finally {
      setIsScanning(false);
      setScanProgress({ step: '', progress: 0, details: '' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setLibraries(prev => prev.map(lib => ({ ...lib, selected: checked })));
  };

  const handleSelectLibrary = (index: number, checked: boolean) => {
    setLibraries(prev => prev.map((lib, i) => 
      i === index ? { ...lib, selected: checked } : lib
    ));
  };

  const selectedCount = libraries.filter(lib => lib.selected).length;
  const hasVersionData = libraries.some(lib => lib.latestVersion);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'npm': return '📦';
      case 'maven': return '☕';
      case 'gradle': return '🐘';
      case 'cpan': return '🐪';
      case 'ant': return '🐜';
      case 'chemaxon': return '🧪';
      default: return '📋';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm">
            <div className="flex">
              <span className="text-red-400 mr-2">❌</span>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {!isScanned && !isScanning && (
          <div className="text-center py-16">
            <div className="text-6xl text-slate-500 mb-6">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-4">
              No project scanned yet
            </h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Upload a ZIP file or enter a Git URL to begin scanning your dependencies.
            </p>
            
            {/* Upload ZIP Button */}
            <div className="space-y-4">
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-6 py-4 border border-transparent text-lg font-medium rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-lg transition-colors"
              >
                📁 Upload ZIP
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              
              {/* Git URL Input */}
              <div className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Git repository URL..."
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    disabled={isScanning}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleGitScan}
                    disabled={!gitUrl.trim() || isScanning}
                    className={`px-6 py-3 font-medium rounded-xl shadow-lg transition-colors ${
                      !gitUrl.trim() || isScanning
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isScanning ? 'Scanning...' : 'Scan'}
                  </button>
                </div>
                <div className="mt-2 text-sm text-slate-400 flex items-center gap-2">
                  <span className="text-yellow-400">⚠️</span>
                  <span>Currently supports GitHub repositories only</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Scanning State with Progress */}
        {isScanning && (
          <div className="max-w-2xl mx-auto py-16">
            {/* Progress Header */}
            <div className="text-center mb-8">
              <div className="text-6xl text-indigo-500 mb-4 animate-spin">⚡</div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Scanning Dependencies
              </h3>
              <p className="text-slate-400">
                Analyzing your project structure and dependencies
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-200">
                  {scanProgress.step} {scanProgress.progress > 0 && `- ${scanProgress.progress}%`}
                </span>
                <span className="text-sm text-slate-400">
                  {scanProgress.progress}% Complete
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${scanProgress.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Current Step Details */}
            <div className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {scanProgress.step === 'Uploading' && <span className="text-2xl">📤</span>}
                  {scanProgress.step === 'Processing' && <span className="text-2xl">⚙️</span>}
                  {scanProgress.step === 'Connecting' && <span className="text-2xl">🔗</span>}
                  {scanProgress.step === 'Fetching' && <span className="text-2xl">📡</span>}
                  {scanProgress.step === 'Scanning' && <span className="text-2xl">🔍</span>}
                  {scanProgress.step === 'Analyzing' && <span className="text-2xl">🧬</span>}
                  {scanProgress.step === 'Finalizing' && <span className="text-2xl">✨</span>}
                  {scanProgress.step === 'Complete' && <span className="text-2xl">✅</span>}
                  {!scanProgress.step && <span className="text-2xl animate-pulse">🔄</span>}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white">
                    {scanProgress.step || 'Initializing...'}
                  </h4>
                  <p className="text-slate-300 mt-1">
                    {scanProgress.details || 'Preparing to scan your project...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Steps Indicator */}
            <div className="mt-8">
              <div className="flex justify-center space-x-4">
                {[
                  { name: 'Upload/Connect', icon: '📤' },
                  { name: 'Process', icon: '⚙️' },
                  { name: 'Analyze', icon: '🔍' },
                  { name: 'Complete', icon: '✅' }
                ].map((step, index) => {
                  const isActive = scanProgress.progress > (index * 25);
                  const isCurrent = scanProgress.progress > (index * 25) && scanProgress.progress <= ((index + 1) * 25);
                  
                  return (
                    <div key={step.name} className="flex flex-col items-center space-y-2">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-300
                        ${isActive 
                          ? 'bg-indigo-500 text-white shadow-lg' 
                          : 'bg-slate-700 text-slate-400'
                        }
                        ${isCurrent ? 'ring-4 ring-indigo-400 animate-pulse' : ''}
                      `}>
                        {step.icon}
                      </div>
                      <span className={`text-xs font-medium ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {step.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {isScanned && libraries.length > 0 && (
          <div className="space-y-6">
            {/* Project Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Project: {projectName}
                </h2>
                <p className="text-slate-400">
                  Found {libraries.length} dependencies
                </p>
              </div>
              <button
                onClick={() => fetchVersionData(libraries)}
                disabled={isLoadingVersions}
                className={`px-4 py-2 font-medium rounded-lg shadow transition-colors ${
                  isLoadingVersions
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isLoadingVersions ? '⏳ Updating...' : '🔄 Refresh Versions'}
              </button>
            </div>
            <hr className="border-slate-600 mt-4" />

            {/* Enhanced Version Loading Progress */}
            {isLoadingVersions ? (
              <div className="bg-indigo-900/20 border border-indigo-800 rounded-xl p-6 mb-6 backdrop-blur-sm">
                {/* Progress Header */}
                <div className="text-center mb-4">
                  <div className="text-3xl text-indigo-400 mb-2 animate-spin">🔄</div>
                  <h4 className="text-lg font-semibold text-white">
                    Enriching Dependency Data
                  </h4>
                  <p className="text-slate-300 text-sm">
                    Fetching latest versions, security info, and EOL dates
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-200">
                      {versionProgress.step} {versionProgress.progress > 0 && `- ${versionProgress.progress}%`}
                    </span>
                    <span className="text-sm text-slate-400">
                      {versionProgress.current}/{versionProgress.total} libraries
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${versionProgress.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Step Details */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {versionProgress.step === 'Initializing' && <span className="text-xl">🚀</span>}
                      {versionProgress.step === 'Connecting' && <span className="text-xl">🔗</span>}
                      {versionProgress.step === 'Processing' && <span className="text-xl">⚙️</span>}
                      {versionProgress.step === 'Enriching' && <span className="text-xl">🌟</span>}
                      {versionProgress.step === 'Finalizing' && <span className="text-xl">✨</span>}
                      {versionProgress.step === 'Complete' && <span className="text-xl">✅</span>}
                      {versionProgress.step === 'Error' && <span className="text-xl">❌</span>}
                      {!versionProgress.step && <span className="text-xl animate-pulse">🔄</span>}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-white">
                        {versionProgress.step || 'Starting...'}
                      </h5>
                      <p className="text-slate-300 text-sm mt-1">
                        {versionProgress.details || 'Preparing to fetch version data...'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mini Steps Indicator */}
                <div className="mt-4">
                  <div className="flex justify-center space-x-3">
                    {[
                      { name: 'Connect', icon: '🔗' },
                      { name: 'Process', icon: '⚙️' },
                      { name: 'Enrich', icon: '🌟' },
                      { name: 'Complete', icon: '✅' }
                    ].map((step, index) => {
                      const isActive = versionProgress.progress > (index * 25);
                      const isCurrent = versionProgress.progress > (index * 25) && versionProgress.progress <= ((index + 1) * 25);
                      
                      return (
                        <div key={step.name} className="flex flex-col items-center space-y-1">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300
                            ${isActive 
                              ? 'bg-yellow-500 text-white shadow-lg' 
                              : 'bg-yellow-200 text-yellow-600'
                            }
                            ${isCurrent ? 'ring-2 ring-yellow-300 animate-pulse' : ''}
                          `}>
                            {step.icon}
                          </div>
                          <span className={`text-xs ${isActive ? 'text-indigo-400 font-medium' : 'text-slate-500'}`}>
                            {step.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : hasVersionData ? (
              <div className="text-center text-sm text-slate-300 bg-green-900/20 border border-green-800 rounded-lg p-4 mb-6 backdrop-blur-sm">
                <span className="text-green-400 mr-2">✅</span>
                Version data loaded successfully. You can now check compatibility and generate upgrade plans.
              </div>
            ) : (
              <div className="text-center text-sm text-slate-300 bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6 backdrop-blur-sm">
                <span className="text-blue-400 mr-2">ℹ️</span>
                Latest versions and release dates are automatically fetched from package registries.
              </div>
            )}

            {/* Dependencies Table */}
            <div className="bg-slate-800/80 rounded-lg shadow-lg overflow-hidden border border-slate-700/50 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedCount === libraries.length && libraries.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-700"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Current Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Latest Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Security
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        EOL Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800/30 divide-y divide-slate-700">
                    {libraries.map((lib, index) => (
                      <tr key={index} className={lib.selected ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={lib.selected}
                            onChange={(e) => handleSelectLibrary(index, e.target.checked)}
                            className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-700"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-xl mr-2">{getTypeIcon(lib.type)}</span>
                            <div>
                              <div className="text-sm font-medium text-white">{lib.name}</div>
                              <div className="text-sm text-slate-400 capitalize">{lib.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lib.latestVersion && lib.currentVersion !== lib.latestVersion 
                              ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800' 
                              : 'bg-slate-700 text-slate-300 border border-slate-600'
                          }`}>
                            {lib.currentVersion}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {isLoadingVersions ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                              <span className="ml-2 text-slate-400">Loading...</span>
                            </div>
                          ) : lib.latestVersion ? (
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                lib.currentVersion !== lib.latestVersion 
                                  ? 'bg-green-900/30 text-green-300 border border-green-800' 
                                  : 'bg-blue-900/30 text-blue-300 border border-blue-800'
                              }`}>
                                {lib.latestVersion}
                              </span>
                              {lib.releaseDate && lib.releaseDate !== 'unknown' && (
                                <div className="text-xs text-slate-400 mt-1">
                                  Released on {lib.releaseDate}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {lib.security ? (
                            <div className="group relative">
                              <span
                                className={`${severityClass(lib.security.severity)} font-medium`}
                                title={lib.security.count > 0 ? `${lib.security.count} vulnerabilities` : 'No known vulnerabilities'}
                              >
                                {severityIcons[lib.security.severity]} {lib.security.severity}
                              </span>
                              {lib.security.count > 0 && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                  {lib.security.count} vulnerabilities found
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {lib.eolDate ? (
                            <div className="group relative">
                              <span
                                className={`cursor-help ${getEolTextColor(lib.eolDate)} ${
                                  getEolStatus(lib.eolDate) === 'expired' ? 'font-semibold' :
                                  getEolStatus(lib.eolDate) === 'warning' ? 'font-medium' : ''
                                }`}
                              >
                                {formatEolDate(lib.eolDate)}
                              </span>
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                {getEolTooltip(lib.eolDate)}
                                {/* Tooltip arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                disabled={!hasVersionData}
                onClick={() => router.push('/compatibility')}
                className={`px-6 py-3 font-medium rounded-xl shadow-lg transition-colors ${
                  hasVersionData
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                🔍 Check Compatibility
              </button>
              <button
                disabled={selectedCount === 0 || !hasVersionData}
                onClick={() => {
                  // Save selected libraries to localStorage for the plan page
                  const selectedLibs = libraries.filter(lib => lib.selected);
                  localStorage.setItem('selectedLibraries', JSON.stringify(selectedLibs));
                  localStorage.setItem('projectName', projectName || 'My Project');
                  router.push('/plan');
                }}
                className={`px-6 py-3 font-medium rounded-xl shadow-lg transition-colors ${
                  selectedCount > 0 && hasVersionData
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                📋 Generate Plan ({selectedCount})
              </button>
            </div>
          </div>
        )}

        {/* No Dependencies Found */}
        {isScanned && libraries.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl text-slate-500 mb-6">📂</div>
            <h3 className="text-2xl font-bold text-white mb-4">
              No Dependencies Found
            </h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              We couldn't find any supported dependency files in {projectName}.
            </p>
            <button
              onClick={() => {
                setIsScanned(false);
                setProjectName('');
                setLibraries([]);
                setError(null);
              }}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg transition-colors"
            >
              🔄 Scan Another Project
            </button>
          </div>
        )}
    </div>
  );
}
