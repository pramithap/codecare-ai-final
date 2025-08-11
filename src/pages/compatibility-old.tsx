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
      row.map(cell => ({ ...cell, hidden: cell.score < minScore }))
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
                
                {/* Repository breakdown */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Repository Breakdown:</h3>
                  {selectedScanDetails.repositories.map((repo) => (
                    <div key={repo.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{repo.name}</h4>
                        <span className="text-sm text-gray-500">{repo.services.length} services</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {repo.url && (
                          <div>URL: <code className="bg-white px-2 py-1 rounded text-xs">{repo.url}</code></div>
                        )}
                        <div>Branch: <code className="bg-white px-2 py-1 rounded text-xs">{repo.branch}</code></div>
                        <div className="mt-2">
                          Languages: {[...new Set(repo.services.map(s => s.language))].join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
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
                      href="/"
                      className="text-red-600 hover:text-red-800 underline"
                    >
                      Go back to Dashboard to scan a project
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Controls Bar */}
        {libraries.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="minScore" className="text-sm font-medium text-gray-700">
                    Filter by Score:
                  </label>
                  <select
                    id="minScore"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="rounded-md border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white shadow-sm"
                  >
                    <option value={0}>All Scores (≥ 0%)</option>
                    <option value={30}>Low Confidence (≥ 30%)</option>
                    <option value={50}>Medium Confidence (≥ 50%)</option>
                    <option value={70}>High Confidence (≥ 70%)</option>
                    <option value={85}>Very High (≥ 85%)</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-500 border-l pl-4">
                  {matrix ? `${matrix.libraries.length}×${matrix.libraries.length} matrix` : 'Loading...'}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReAnalysis}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🔄</span>
                      Re-run Analysis
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleExportMatrix}
                  disabled={!matrix}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="mr-2">📥</span>
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-6"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Compatibility Matrix</h3>
            <p className="text-gray-600">
              Processing {libraries.length} libraries and generating compatibility scores...
            </p>
          </div>
        )}

        {/* Compatibility Matrix */}
        {filteredMatrix && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Compatibility Heatmap</h2>
              <p className="text-sm text-gray-600 mt-1">
                Hover over cells to see detailed compatibility rationale
              </p>
            </div>
            
            <div className="p-6">
              <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
                <div className="inline-block min-w-full">
                  <div 
                    className="grid gap-1 sticky-headers"
                    style={{
                      gridTemplateColumns: `120px repeat(${filteredMatrix.libraries.length}, minmax(80px, 1fr))`,
                      minWidth: `${120 + (filteredMatrix.libraries.length * 80)}px`
                    }}
                  >
                    {/* Top-left corner cell */}
                    <div className="h-16 bg-gray-100 border-b border-r border-gray-200 flex items-center justify-center font-medium text-gray-700 text-xs sticky top-0 left-0 z-20">
                      Libraries
                    </div>

                    {/* Column headers */}
                    {filteredMatrix.libraries.map((lib, i) => (
                      <div 
                        key={`header-col-${i}`}
                        className="h-16 bg-gray-100 border-b border-gray-200 flex items-center justify-center font-medium text-gray-700 text-xs sticky top-0 z-10"
                        title={lib}
                      >
                        <div className="transform rotate-45 origin-center whitespace-nowrap">
                          {lib.length > 10 ? `${lib.substring(0, 10)}...` : lib}
                        </div>
                      </div>
                    ))}

                    {/* Matrix rows */}
                    {filteredMatrix.matrix.map((row, i) => (
                      <React.Fragment key={`row-${i}`}>
                        {/* Row header */}
                        <div 
                          className="h-16 bg-gray-100 border-r border-gray-200 flex items-center justify-start font-medium text-gray-700 text-xs px-3 sticky left-0 z-10"
                          title={filteredMatrix.libraries[i]}
                        >
                          <div className="truncate">
                            {filteredMatrix.libraries[i].length > 15 
                              ? `${filteredMatrix.libraries[i].substring(0, 15)}...` 
                              : filteredMatrix.libraries[i]
                            }
                          </div>
                        </div>
                        
                        {/* Matrix cells */}
                        {row.map((cell, j) => (
                          <div
                            key={`cell-${i}-${j}`}
                            className={`h-16 flex items-center justify-center text-sm font-semibold cursor-help transition-all duration-200 hover:scale-105 hover:shadow-lg relative group border border-gray-100 ${
                              i === j ? 'bg-gray-200 text-gray-800' : // Diagonal cells (self-compatibility)
                              cell.hidden ? 'bg-gray-50 text-gray-400' : 
                              `${getScoreColor(cell.score)} ${getScoreTextColor(cell.score)} hover:opacity-90`
                            }`}
                          >
                            {cell.hidden ? '—' : `${cell.score}%`}
                            
                            {/* Enhanced Tooltip */}
                            {!cell.hidden && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-normal max-w-sm z-30 shadow-lg">
                                <div className="font-semibold mb-2 text-yellow-300">
                                  {filteredMatrix.libraries[i]} ↔ {filteredMatrix.libraries[j]}
                                </div>
                                <div className="font-medium mb-1">
                                  Compatibility: {cell.score}% ({cell.status.replace('-', ' ')})
                                </div>
                                <div className="text-xs text-gray-300">
                                  {cell.rationale}
                                </div>
                                {/* Tooltip arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend & Notes */}
        {matrix && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Color Legend */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🎨</span>
                  Compatibility Legend
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-200 border border-green-300 rounded flex items-center justify-center text-xs font-bold text-green-800">
                      85%
                    </div>
                    <div>
                      <div className="font-medium text-green-800">Excellent Compatibility (85-100%)</div>
                      <div className="text-sm text-gray-600">Libraries work seamlessly together</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-200 border border-yellow-300 rounded flex items-center justify-center text-xs font-bold text-yellow-800">
                      70%
                    </div>
                    <div>
                      <div className="font-medium text-yellow-800">Good Compatibility (70-84%)</div>
                      <div className="text-sm text-gray-600">Minor integration considerations</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-200 border border-orange-300 rounded flex items-center justify-center text-xs font-bold text-orange-800">
                      50%
                    </div>
                    <div>
                      <div className="font-medium text-orange-800">Moderate Compatibility (50-69%)</div>
                      <div className="text-sm text-gray-600">Some integration work required</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-200 border border-red-300 rounded flex items-center justify-center text-xs font-bold text-red-800">
                      30%
                    </div>
                    <div>
                      <div className="font-medium text-red-800">Poor Compatibility (&lt;50%)</div>
                      <div className="text-sm text-gray-600">Significant compatibility issues likely</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                    <div className="w-8 h-8 bg-gray-200 border border-gray-300 rounded flex items-center justify-center text-xs font-bold text-gray-800">
                      100%
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">Self-Compatibility</div>
                      <div className="text-sm text-gray-600">Library compared with itself</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Notes */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">ℹ️</span>
                  How Scores Are Derived
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>Ecosystem Analysis:</strong> Libraries from the same ecosystem (npm, Maven, etc.) 
                      typically have higher compatibility scores.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>Version Compatibility:</strong> Major version differences can reduce 
                      compatibility scores due to breaking changes.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>Known Conflicts:</strong> Well-documented incompatibilities between 
                      specific libraries are factored into the analysis.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      <strong>Integration Patterns:</strong> Common usage patterns and architectural 
                      considerations influence compatibility ratings.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Compatibility scores are estimates based on static analysis. 
                    Always test library combinations in your specific environment and use case.
                  </p>
                </div>
              </div>
            </div>

            {/* Matrix Statistics */}
            {matrix && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-md font-medium text-gray-900 mb-3">Matrix Statistics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{matrix.libraries.length}</div>
                    <div className="text-sm text-gray-600">Libraries Analyzed</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {matrix.libraries.length * matrix.libraries.length}
                    </div>
                    <div className="text-sm text-gray-600">Compatibility Pairs</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round(
                        matrix.matrix.flat().reduce((sum, cell) => sum + cell.score, 0) / 
                        (matrix.libraries.length * matrix.libraries.length)
                      )}%
                    </div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!matrix && !isLoading && !error && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Compatibility Data</h3>
            <p className="text-gray-600 mb-4">
              Scan a project from the Dashboard to analyze library compatibility.
            </p>
            <a 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
