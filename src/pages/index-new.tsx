import React, { useState } from 'react';
import Navbar from '../components/Navbar';

interface Library {
  name: string;
  currentVersion: string;
  type: 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon';
  latestVersion?: string;
  securityStatus?: 'safe' | 'warning' | 'critical';
  eolDate?: string;
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

export default function Dashboard() {
  const [isScanned, setIsScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.zip')) {
      setError('Please upload a ZIP file');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });

      const result: ScanResponse = await response.json();

      if (result.success && result.data) {
        setProjectName(result.data.project);
        setLibraries(result.data.libs.map(lib => ({
          ...lib,
          type: lib.type as 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon',
          selected: false,
          latestVersion: undefined,
          securityStatus: undefined,
          eolDate: undefined,
        })));
        setIsScanned(true);
      } else {
        setError(result.error || 'Failed to scan project');
      }
    } catch (err) {
      setError('Failed to upload and scan file');
      console.error('Upload error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleGitScan = async () => {
    if (!gitUrl.trim()) {
      setError('Please enter a Git repository URL');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch('/api/scan-git', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gitUrl: gitUrl.trim() }),
      });

      const result: ScanResponse = await response.json();

      if (result.success && result.data) {
        setProjectName(result.data.project);
        setLibraries(result.data.libs.map(lib => ({
          ...lib,
          type: lib.type as 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon',
          selected: false,
          latestVersion: undefined,
          securityStatus: undefined,
          eolDate: undefined,
        })));
        setIsScanned(true);
        setGitUrl('');
      } else {
        setError(result.error || 'Failed to scan repository');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan repository');
      console.error('Git scan error:', err);
    } finally {
      setIsScanning(false);
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

  const getSecurityIcon = (status?: string) => {
    switch (status) {
      case 'safe': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '-';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <span className="text-red-500 mr-2">❌</span>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {!isScanned && !isScanning && (
          <div className="text-center py-16">
            <div className="text-6xl text-gray-400 mb-6">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              No project scanned yet
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
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
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    {isScanning ? 'Scanning...' : 'Scan'}
                  </button>
                </div>
                <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                  <span className="text-yellow-500">⚠️</span>
                  <span>Currently supports GitHub repositories only</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scanning State */}
        {isScanning && (
          <div className="text-center py-16">
            <div className="text-6xl text-indigo-500 mb-6 animate-pulse">🔄</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Scanning Dependencies...
            </h3>
            <p className="text-gray-500">
              Please wait while we analyze your project
            </p>
          </div>
        )}

        {/* Results Table */}
        {isScanned && libraries.length > 0 && (
          <div className="space-y-6">
            {/* Project Header */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Project: {projectName}
              </h2>
              <p className="text-gray-600">
                Found {libraries.length} dependencies
              </p>
              <hr className="border-gray-300 mt-4" />
            </div>

            {/* Dependencies Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedCount === libraries.length && libraries.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Latest Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Security
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        EOL Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {libraries.map((lib, index) => (
                      <tr key={index} className={lib.selected ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={lib.selected}
                            onChange={(e) => handleSelectLibrary(index, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-xl mr-2">{getTypeIcon(lib.type)}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{lib.name}</div>
                              <div className="text-sm text-gray-500 capitalize">{lib.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {lib.currentVersion}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lib.latestVersion ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {lib.latestVersion}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="text-xl">{getSecurityIcon(lib.securityStatus)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lib.eolDate || '-'}
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
                className={`px-6 py-3 font-medium rounded-xl shadow-lg transition-colors ${
                  hasVersionData
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                🔍 Check Compatibility
              </button>
              <button
                disabled={selectedCount === 0 || !hasVersionData}
                className={`px-6 py-3 font-medium rounded-xl shadow-lg transition-colors ${
                  selectedCount > 0 && hasVersionData
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                📋 Generate Plan ({selectedCount})
              </button>
            </div>

            {/* Info Message */}
            <div className="text-center text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <span className="text-blue-500 mr-2">ℹ️</span>
              Latest versions, security status, and EOL dates will be populated after checking compatibility.
            </div>
          </div>
        )}

        {/* No Dependencies Found */}
        {isScanned && libraries.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl text-gray-400 mb-6">📂</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              No Dependencies Found
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
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
      </main>
    </div>
  );
}
