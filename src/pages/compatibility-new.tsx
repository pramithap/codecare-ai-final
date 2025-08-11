import React, { useState, useEffect } from 'react';

// Add custom styles for the heatmap
const heatmapStyles = `
  .sticky-headers .sticky {
    position: sticky;
    background: white;
  }
  .sticky-headers .sticky.top-0 {
    top: 0;
  }
  .sticky-headers .sticky.left-0 {
    left: 0;
  }
`;

interface Library {
  name: string;
  currentVersion: string;
  type: 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon';
}

interface CompatibilityCell {
  score: number;
  rationale: string;
  status: 'compatible' | 'minor-issues' | 'major-issues';
}

interface CompatibilityMatrix {
  libraries: string[];
  matrix: CompatibilityCell[][];
}

interface CompatibilityResponse {
  success: boolean;
  project?: string;
  matrix?: CompatibilityMatrix;
  error?: string;
}

interface StoredScan {
  id: string;
  timestamp: string;
  summary: {
    totalServices: number;
    totalComponents: number;
    flaggedComponents: number;
    eolComponents: number;
    totalRepositories: number;
  };
  repositories: {
    id: string;
    name: string;
    url?: string;
    branch: string;
    serviceCount: number;
  }[];
}

interface ScanDetails {
  id: string;
  timestamp: string;
  repositories: {
    id: string;
    name: string;
    url?: string;
    branch: string;
    services: {
      id: string;
      name: string;
      path: string;
      language: string;
      runtime?: string;
      runtimeVersion?: string;
      components: {
        name: string;
        version: string;
        latestVersion?: string;
        type: 'dependency' | 'devDependency' | 'buildDependency';
        eol?: boolean;
        cveCount: number;
        flagged?: boolean;
        flagReason?: string;
      }[];
      manifestFiles: string[];
    }[];
  }[];
  summary: {
    totalServices: number;
    totalComponents: number;
    flaggedComponents: number;
    eolComponents: number;
    totalRepositories: number;
  };
}

export default function Compatibility() {
  const [isLoading, setIsLoading] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [matrix, setMatrix] = useState<CompatibilityMatrix | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // New state for stored scans
  const [storedScans, setStoredScans] = useState<StoredScan[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedScanDetails, setSelectedScanDetails] = useState<ScanDetails | null>(null);
  const [isLoadingScans, setIsLoadingScans] = useState(true);
  const [isLoadingScanDetails, setIsLoadingScanDetails] = useState(false);

  // Load stored scans on component mount
  useEffect(() => {
    loadStoredScans();
    
    // Also load legacy localStorage data for backward compatibility
    const storedLibraries = localStorage.getItem('scannedLibraries');
    const storedProject = localStorage.getItem('projectName');
    
    if (storedLibraries) {
      try {
        const libs = JSON.parse(storedLibraries);
        setLibraries(libs);
        if (storedProject) {
          setProjectName(storedProject);
        }
      } catch (err) {
        console.error('Failed to load stored libraries:', err);
      }
    }
  }, []);

  const loadStoredScans = async () => {
    setIsLoadingScans(true);
    try {
      const response = await fetch('/api/compatibility/store-scan');
      if (response.ok) {
        const result = await response.json();
        setStoredScans(result.scans || []);
      } else {
        console.warn('Failed to load stored scans');
      }
    } catch (error) {
      console.error('Error loading stored scans:', error);
    } finally {
      setIsLoadingScans(false);
    }
  };

  const loadScanDetails = async (scanId: string) => {
    setIsLoadingScanDetails(true);
    setError(null);
    try {
      const response = await fetch(`/api/compatibility/scan-details/${scanId}`);
      if (response.ok) {
        const result = await response.json();
        setSelectedScanDetails(result.scan);
        
        // Convert scan details to libraries format for compatibility analysis
        const allComponents: Library[] = [];
        result.scan.repositories.forEach((repo: any) => {
          repo.services.forEach((service: any) => {
            service.components.forEach((comp: any) => {
              // Map component types to library types
              let libType: 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon' = 'npm';
              switch (service.language?.toLowerCase()) {
                case 'java':
                  libType = 'maven';
                  break;
                case 'javascript':
                case 'typescript':
                  libType = 'npm';
                  break;
                default:
                  libType = 'npm';
              }
              
              allComponents.push({
                name: comp.name,
                currentVersion: comp.version,
                type: libType
              });
            });
          });
        });
        
        // Remove duplicates
        const uniqueComponents = allComponents.filter((comp, index, arr) => 
          index === arr.findIndex(c => c.name === comp.name && c.currentVersion === comp.currentVersion)
        );
        
        setLibraries(uniqueComponents);
        setProjectName(`Scan Results (${result.scan.repositories.map((r: any) => r.name).join(', ')})`);
        
      } else {
        setError('Failed to load scan details');
      }
    } catch (error) {
      setError('Error loading scan details');
      console.error('Error loading scan details:', error);
    } finally {
      setIsLoadingScanDetails(false);
    }
  };

  const handleScanSelection = (scanId: string) => {
    setSelectedScanId(scanId);
    loadScanDetails(scanId);
  };

  const fetchCompatibilityData = async (libs: Library[], project: string) => {
    if (!libs.length) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          libs: libs.map(lib => ({
            name: lib.name,
            currentVersion: lib.currentVersion,
            type: lib.type
          })),
          project
        }),
      });

      const result: CompatibilityResponse = await response.json();

      if (result.success && result.matrix) {
        setMatrix(result.matrix);
        setProjectName(result.project || project);
      } else {
        setError(result.error || 'Failed to analyze compatibility');
      }
    } catch (err) {
      setError('Failed to fetch compatibility data');
      console.error('Compatibility fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReAnalysis = () => {
    fetchCompatibilityData(libraries, projectName);
  };

  const handleExportMatrix = () => {
    if (!matrix) return;

    const csvData = [
      ['Library', ...matrix.libraries],
      ...matrix.matrix.map((row, i) => [
        matrix.libraries[i],
        ...row.map(cell => `${cell.score}%`)
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-compatibility-matrix.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-200 hover:bg-green-300 border-green-300';
    if (score >= 70) return 'bg-yellow-200 hover:bg-yellow-300 border-yellow-300';
    if (score >= 50) return 'bg-orange-200 hover:bg-orange-300 border-orange-300';
    return 'bg-red-200 hover:bg-red-300 border-red-300';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 85) return 'text-green-800';
    if (score >= 70) return 'text-yellow-800';
    if (score >= 50) return 'text-orange-800';
    return 'text-red-800';
  };

  const filteredMatrix = matrix ? {
    ...matrix,
    matrix: matrix.matrix.map(row => 
      row.map(cell => ({
        ...cell,
        score: cell.score >= minScore ? cell.score : 0
      }))
    )
  } : null;

  return (
    <div>
      <style jsx>{heatmapStyles}</style>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Compatibility Analysis
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Analyze library compatibility across your scanned repositories using AI-powered insights
            </p>
          </div>

          {/* Scan Selection */}
          {!selectedScanDetails && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <span className="mr-2">📋</span>
                  Select Scan Results for Analysis
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Choose from your recent repository scans to analyze dependency compatibility
                </p>
              </div>
              
              <div className="px-6 py-6">
                {isLoadingScans ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600">Loading scan results...</span>
                  </div>
                ) : storedScans.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Scan Results Found</h3>
                    <p className="text-gray-600 mb-4">
                      Run a repository scan first to analyze dependency compatibility.
                    </p>
                    <a 
                      href="/scanNew"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Start New Scan
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {storedScans.map((scan) => (
                      <div key={scan.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                           onClick={() => handleScanSelection(scan.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {scan.repositories.map(r => r.name).join(', ')}
                              </h3>
                              <span className="text-sm text-gray-500">
                                {new Date(scan.timestamp).toLocaleDateString()} at {new Date(scan.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <div className="flex items-center">
                                <span className="text-blue-500 mr-1">🏗️</span>
                                {scan.summary.totalRepositories} repositories
                              </div>
                              <div className="flex items-center">
                                <span className="text-green-500 mr-1">🔧</span>
                                {scan.summary.totalServices} services
                              </div>
                              <div className="flex items-center">
                                <span className="text-purple-500 mr-1">📦</span>
                                {scan.summary.totalComponents} components
                              </div>
                              {scan.summary.flaggedComponents > 0 && (
                                <div className="flex items-center">
                                  <span className="text-yellow-500 mr-1">⚠️</span>
                                  {scan.summary.flaggedComponents} flagged
                                </div>
                              )}
                              {scan.summary.eolComponents > 0 && (
                                <div className="flex items-center">
                                  <span className="text-red-500 mr-1">🚨</span>
                                  {scan.summary.eolComponents} EOL
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center text-indigo-600">
                            <span className="mr-2">Analyze</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Scan Details */}
          {selectedScanDetails && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 flex items-center">
                      <span className="mr-2">🔍</span>
                      Selected Scan: {selectedScanDetails.repositories.map(r => r.name).join(', ')}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Scanned on {new Date(selectedScanDetails.timestamp).toLocaleDateString()} • 
                      {selectedScanDetails.repositories.length} repositories • 
                      {libraries.length} components for analysis
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedScanDetails(null);
                      setSelectedScanId(null);
                      setLibraries([]);
                      setMatrix(null);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Choose Different Scan
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{selectedScanDetails.summary.totalRepositories}</div>
                    <div className="text-sm text-blue-800">Repositories</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{selectedScanDetails.summary.totalServices}</div>
                    <div className="text-sm text-green-800">Services</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">{selectedScanDetails.summary.totalComponents}</div>
                    <div className="text-sm text-purple-800">Total Components</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-indigo-600">{libraries.length}</div>
                    <div className="text-sm text-indigo-800">Unique for Analysis</div>
                  </div>
                </div>
                
                {/* Compatibility Analysis Button */}
                <div className="mt-8 text-center">
                  <button
                    onClick={() => fetchCompatibilityData(libraries, projectName)}
                    disabled={isLoading || libraries.length < 2}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-3 mx-auto"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Analyzing Compatibility...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span>Calculate Compatibility Matrix</span>
                      </>
                    )}
                  </button>
                  {libraries.length < 2 && (
                    <p className="text-sm text-gray-500 mt-2">
                      At least 2 components required for compatibility analysis
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading state for scan details */}
          {isLoadingScanDetails && (
            <div className="bg-white shadow-lg rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading scan details...</p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <div className="text-red-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Matrix Display */}
          {matrix && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <span className="mr-2">🔬</span>
                    Compatibility Matrix: {projectName}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Min Score:</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) => setMinScore(Number(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600 w-8">{minScore}%</span>
                    </div>
                    <button
                      onClick={handleExportMatrix}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => fetchCompatibilityData(libraries, projectName)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
                    >
                      {isLoading ? 'Re-analyzing...' : 'Re-analyze'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Matrix Table */}
                <div className="sticky-headers overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr>
                        <th className="sticky top-0 left-0 bg-gray-100 border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20">
                          Library
                        </th>
                        {filteredMatrix?.libraries.map((lib, index) => (
                          <th 
                            key={lib}
                            className="sticky top-0 bg-gray-100 border-b border-r border-gray-200 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider transform -rotate-45 origin-bottom whitespace-nowrap min-w-[60px]"
                            style={{ minWidth: '60px', height: '100px' }}
                          >
                            <div className="transform -rotate-45 origin-bottom-left">
                              {lib.split('@')[0]}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMatrix?.matrix.map((row, rowIndex) => (
                        <tr key={filteredMatrix.libraries[rowIndex]}>
                          <td className="sticky left-0 bg-gray-50 border-r border-b border-gray-200 px-4 py-2 font-medium text-gray-900 text-sm whitespace-nowrap">
                            {filteredMatrix.libraries[rowIndex]}
                          </td>
                          {row.map((cell, colIndex) => {
                            const isVisible = cell.score >= minScore;
                            return (
                              <td
                                key={colIndex}
                                className={`border-r border-b border-gray-200 px-2 py-2 text-center text-sm font-semibold cursor-pointer relative group ${
                                  isVisible 
                                    ? `${getScoreColor(cell.score)} ${getScoreTextColor(cell.score)}` 
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                                title={`${filteredMatrix.libraries[rowIndex]} ↔ ${filteredMatrix.libraries[colIndex]}: ${cell.score}% compatible`}
                              >
                                {isVisible ? `${cell.score}%` : '-'}
                                
                                {/* Tooltip */}
                                <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg py-2 px-3 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap max-w-xs">
                                  <div className="font-semibold mb-1">
                                    {filteredMatrix.libraries[rowIndex].split('@')[0]} ↔ {filteredMatrix.libraries[colIndex].split('@')[0]}
                                  </div>
                                  <div className="text-xs opacity-90 mb-1">
                                    Compatibility: {cell.score}% ({cell.status.replace('-', ' ')})
                                  </div>
                                  <div className="text-xs opacity-75 max-w-sm">
                                    {cell.rationale}
                                  </div>
                                  {/* Arrow */}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
