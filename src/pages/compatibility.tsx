import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import CompatibilityMatrix from '../components/scanNew/CompatibilityMatrix';

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

interface ScanComponent {
  name: string;
  version: string;
  latestVersion?: string;
  type: 'dependency' | 'devDependency' | 'buildDependency';
  eol?: boolean;
  cveCount: number;
  flagged?: boolean;
  flagReason?: string;
}

interface ScanService {
  id: string;
  name: string;
  path: string;
  language: string;
  runtime?: string;
  runtimeVersion?: string;
  components: ScanComponent[];
  manifestFiles: string[];
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
    services?: ScanService[];
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

// ScanResultCard component with collapsible details
interface ScanResultCardProps {
  scan: StoredScan;
  onAnalyze: () => void;
}

function ScanResultCard({ scan, onAnalyze }: ScanResultCardProps) {
  const [selectedForModal, setSelectedForModal] = useState<StoredScan | null>(null);
  const [selectedComponents, setSelectedComponents] = useState<{[repoId: string]: {[serviceId: string]: string[]}}>({}); // repo -> service -> component names
  
  // Compatibility analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CompatibilityMatrix | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Use scan data directly
  const displayScan = scan;

  const handleComponentToggle = (repoId: string, serviceId: string, componentName: string) => {
    setSelectedComponents(prev => {
      const newSelected = { ...prev };
      if (!newSelected[repoId]) newSelected[repoId] = {};
      if (!newSelected[repoId][serviceId]) newSelected[repoId][serviceId] = [];
      
      const componentIndex = newSelected[repoId][serviceId].indexOf(componentName);
      if (componentIndex === -1) {
        newSelected[repoId][serviceId].push(componentName);
      } else {
        newSelected[repoId][serviceId].splice(componentIndex, 1);
      }
      
      // Clear previous analysis when selection changes
      setAnalysisResult(null);
      setAnalysisError(null);
      setShowAnalysis(false);
      
      return newSelected;
    });
  };

  const getSelectedComponentsList = () => {
    const components: Library[] = [];
    Object.entries(selectedComponents).forEach(([repoId, services]) => {
      Object.entries(services).forEach(([serviceId, componentNames]) => {
        const repo = displayScan.repositories.find(r => r.id === repoId);
        const service = repo?.services?.find(s => s.id === serviceId);
        componentNames.forEach(componentName => {
          const component = service?.components.find(c => c.name === componentName);
          if (component) {
            components.push({
              name: component.name,
              currentVersion: component.version,
              type: 'npm' // Default type, could be enhanced based on service language
            });
          }
        });
      });
    });
    return components;
  };

  const handleAnalyzeSelected = async () => {
    const selectedLibraries = getSelectedComponentsList();
    if (selectedLibraries.length < 2) {
      alert('Please select at least 2 components for compatibility analysis.');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setShowAnalysis(true);
    
    try {
      const response = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libs: selectedLibraries,
          project: `Scan Analysis: ${displayScan.repositories.map(r => r.name).join(', ')}`
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAnalysisResult(data.matrix);
      } else {
        setAnalysisError(data.error || 'Failed to analyze compatibility');
      }
    } catch (error) {
      console.error('Error analyzing compatibility:', error);
      setAnalysisError('Failed to connect to analysis service');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-700/50 border border-slate-600/30 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-medium text-white">
                {displayScan.repositories.map(r => r.name).join(', ')}
              </h3>
              <span className="text-xs bg-indigo-600/80 text-indigo-100 px-2 py-1 rounded-full">
                Latest Scan
              </span>
              <span className="text-sm text-slate-400">
                {new Date(displayScan.timestamp).toLocaleDateString()} at {new Date(displayScan.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-300">
              <div className="flex items-center">
                <span className="text-blue-400 mr-1">🏗️</span>
                {displayScan.summary.totalRepositories} repositories
              </div>
              <div className="flex items-center">
                <span className="text-green-400 mr-1">🔧</span>
                {displayScan.summary.totalServices} services
              </div>
              <div className="flex items-center">
                <span className="text-purple-400 mr-1">📦</span>
                {displayScan.summary.totalComponents} components
              </div>
              {displayScan.summary.flaggedComponents > 0 && (
                <div className="flex items-center">
                  <span className="text-yellow-400 mr-1">⚠️</span>
                  {displayScan.summary.flaggedComponents} flagged
                </div>
              )}
              {displayScan.summary.eolComponents > 0 && (
                <div className="flex items-center">
                  <span className="text-red-400 mr-1">🚨</span>
                  {displayScan.summary.eolComponents} EOL
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedForModal(displayScan)}
              className="flex items-center px-3 py-2 text-slate-300 hover:text-white bg-slate-600/50 hover:bg-slate-600/70 rounded-lg transition-colors"
            >
              <span className="mr-2">Show Details</span>
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
            <button
              onClick={onAnalyze}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <span className="mr-2">Quick Analyze</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Modal for Detailed Scan Results */}
        {selectedForModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedForModal(null)}>
            <div className="bg-slate-900 rounded-xl p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto border border-slate-600/40" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Scan Results: {selectedForModal.repositories.map(r => r.name).join(', ')}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Scanned on {new Date(selectedForModal.timestamp).toLocaleDateString()} at {new Date(selectedForModal.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedForModal(null)} 
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">{selectedForModal.summary.totalRepositories}</div>
                  <div className="text-sm text-slate-300">Repositories</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{selectedForModal.summary.totalServices}</div>
                  <div className="text-sm text-slate-300">Services</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">{selectedForModal.summary.totalComponents}</div>
                  <div className="text-sm text-slate-300">Components</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400">{selectedForModal.summary.flaggedComponents}</div>
                  <div className="text-sm text-slate-300">Flagged</div>
                </div>
              </div>

              {/* Repository Details */}
              <div className="space-y-6">
                {selectedForModal.repositories.map((repo) => (
                  <div key={repo.id} className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-white mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                      </svg>
                      {repo.name}
                      <span className="ml-2 text-sm text-slate-400">({repo.branch})</span>
                      {!repo.services && (
                        <span className="ml-2 text-xs text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
                          Services: {repo.serviceCount || 0}
                        </span>
                      )}
                    </h4>
                    
                    <div className="space-y-4">
                      {repo.services && repo.services.length > 0 ? (
                        repo.services.map((service) => (
                          <div key={service.id} className="bg-slate-700/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-white font-medium">{service.name}</h5>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded">
                                  {service.language}
                                </span>
                                {service.runtime && (
                                  <span className="text-xs bg-indigo-600/50 text-indigo-200 px-2 py-1 rounded">
                                    {service.runtime} {service.runtimeVersion}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-sm text-slate-400 mb-3">
                              Path: {service.path} | Components: {service.components.length}
                            </div>
                            
                            {/* Components Table */}
                            {service.components && service.components.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-600/50">
                                      <th className="text-left py-2 px-3 text-slate-300">Select</th>
                                      <th className="text-left py-2 px-3 text-slate-300">Component</th>
                                      <th className="text-left py-2 px-3 text-slate-300">Version</th>
                                      <th className="text-left py-2 px-3 text-slate-300">Latest</th>
                                      <th className="text-left py-2 px-3 text-slate-300">Type</th>
                                      <th className="text-left py-2 px-3 text-slate-300">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {service.components.map((component, idx) => (
                                      <tr key={`${service.id}-${component.name}-${idx}`} className="border-b border-slate-700/50 hover:bg-slate-600/20">
                                        <td className="py-2 px-3">
                                          <input
                                            type="checkbox"
                                            checked={selectedComponents[repo.id]?.[service.id]?.includes(component.name) || false}
                                            onChange={() => handleComponentToggle(repo.id, service.id, component.name)}
                                            className="rounded"
                                          />
                                        </td>
                                        <td className="py-2 px-3 text-white">{component.name}</td>
                                        <td className="py-2 px-3 text-slate-300">{component.version}</td>
                                        <td className="py-2 px-3 text-slate-300">{component.latestVersion || '-'}</td>
                                        <td className="py-2 px-3">
                                          <span className="text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded">
                                            {component.type}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="flex items-center space-x-2">
                                            {component.flagged && (
                                              <span className="text-yellow-400" title={component.flagReason}>⚠️</span>
                                            )}
                                            {component.eol && (
                                              <span className="text-red-400" title="End of Life">🚨</span>
                                            )}
                                            {component.cveCount > 0 && (
                                              <span className="text-red-400 text-xs">
                                                {component.cveCount} CVEs
                                              </span>
                                            )}
                                            {!component.flagged && !component.eol && component.cveCount === 0 && (
                                              <span className="text-green-400">✅</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <div className="mb-4">
                            <svg className="w-16 h-16 mx-auto text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                            </svg>
                          </div>
                          <p className="text-lg font-medium mb-2">Detailed service data not available</p>
                          <p className="text-sm">
                            This scan contains {repo.serviceCount || 0} service(s), but detailed component information is not available.
                          </p>
                          <p className="text-sm mt-2 text-slate-500">
                            Try running a new scan to get detailed component analysis.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Components Analysis Section */}
              {Object.keys(selectedComponents).length > 0 && (
                <div className="mt-6 bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-white font-medium">Selected Components for Analysis</h4>
                      <p className="text-sm text-slate-300">
                        {getSelectedComponentsList().length} components selected
                      </p>
                    </div>
                    <button
                      onClick={handleAnalyzeSelected}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Analyze Selected'}
                    </button>
                  </div>

                  {/* Compatibility Analysis Results */}
                  {showAnalysis && (
                    <div className="mt-4 border-t border-indigo-500/30 pt-4">
                      {isAnalyzing && (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-indigo-500 hover:bg-indigo-400 transition ease-in-out duration-150 cursor-not-allowed">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing compatibility...
                          </div>
                        </div>
                      )}

                      {analysisError && (
                        <div className="text-center py-8">
                          <div className="text-red-400 mb-4">
                            <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-red-400 font-medium">{analysisError}</p>
                        </div>
                      )}

                      {analysisResult && !isAnalyzing && (
                        <div>
                          <div className="mb-6">
                            <h5 className="text-lg font-medium text-white mb-2">Compatibility Matrix</h5>
                            <p className="text-sm text-slate-300">
                              Hover over cells to see detailed compatibility information.
                            </p>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr>
                                  <th className="p-3 text-left text-sm font-medium text-slate-300 border-b border-slate-600/50"></th>
                                  {analysisResult.libraries.map((lib, index) => (
                                    <th key={index} className="p-3 text-center text-sm font-medium text-slate-300 border-b border-slate-600/50 min-w-[120px]">
                                      <div className="transform -rotate-45 origin-bottom-left whitespace-nowrap">
                                        {lib}
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {analysisResult.libraries.map((lib, rowIndex) => (
                                  <tr key={rowIndex}>
                                    <td className="p-3 text-sm font-medium text-slate-300 border-r border-slate-600/50">
                                      {lib}
                                    </td>
                                    {analysisResult.matrix[rowIndex].map((cell, colIndex) => (
                                      <td key={colIndex} className="p-1 border border-slate-600/30">
                                        <div
                                          className={`
                                            p-2 rounded text-center text-sm font-medium cursor-help transition-all duration-200 hover:scale-105
                                            ${cell.status === 'compatible' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                              cell.status === 'minor-issues' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                              'bg-red-500/20 text-red-300 border border-red-500/30'}
                                          `}
                                          title={`${cell.score}% - ${cell.rationale}`}
                                        >
                                          {cell.score}%
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Compatibility() {
  const router = useRouter();
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

  // Load stored scans on component mount and handle URL parameters
  useEffect(() => {
    loadStoredScans();
    
    // Clear any existing scan details to show the scan selection interface
    setSelectedScanDetails(null);
    setSelectedScanId(null);
    
    // Clear URL parameters to avoid auto-loading scan details
    if (router.query.scanId) {
      router.push('/compatibility', undefined, { shallow: true });
    }
    
    // Also load legacy localStorage data for backward compatibility  
    const storedLibraries = localStorage.getItem('scannedLibraries');
    const storedProject = localStorage.getItem('projectName');
    
    if (storedLibraries && !router.query.scanId) {
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
      // Add timestamp to prevent caching issues
      const timestamp = Date.now();
      const response = await fetch(`/api/compatibility/store-scan?t=${timestamp}`);
      if (response.ok) {
        const result = await response.json();
        const scans = result.scans || [];
        
        // Deduplicate scans by repository names, keeping only the latest scan for each unique set of repositories
        const deduplicatedScans = scans.reduce((acc: StoredScan[], scan: StoredScan) => {
          const repoNamesKey = scan.repositories.map(r => r.name).sort().join('|');
          const existingIndex = acc.findIndex(existingScan => 
            existingScan.repositories.map(r => r.name).sort().join('|') === repoNamesKey
          );
          
          if (existingIndex === -1) {
            // No duplicate found, add this scan
            acc.push(scan);
          } else {
            // Duplicate found, keep the newer one
            const existingTimestamp = new Date(acc[existingIndex].timestamp);
            const currentTimestamp = new Date(scan.timestamp);
            if (currentTimestamp > existingTimestamp) {
              acc[existingIndex] = scan;
            }
          }
          return acc;
        }, []);
        
        // Sort by timestamp (newest first) and limit to latest scans
        deduplicatedScans.sort((a: StoredScan, b: StoredScan) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Take only the latest scan for display in compatibility analysis
        const latestScans = deduplicatedScans.slice(0, 3); // Show up to 3 most recent unique scans
        
        setStoredScans(latestScans);
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
        
        console.log('Scan details loaded:', result);
        console.log('Repositories structure:', result.scan?.repositories?.map((r: any) => ({
          name: r.name,
          servicesCount: r.services?.length || 0,
          sampleService: r.services?.[0] ? {
            name: r.services[0].name,
            componentsCount: r.services[0].components?.length || 0
          } : null
        })));
        
        // No need to convert to libraries format - we'll display the existing scan structure
        setProjectName(`Scan Results (${result.scan.repositories.map((r: any) => r.name).join(', ')})`);
        
      } else if (response.status === 404) {
        const errorResult = await response.json();
        setError('Scan not found. The scan data may have been cleared due to server restart. Please run a new scan.');
        console.warn('Scan not found:', errorResult.error);
        // Reset the URL to remove the invalid scanId
        router.push('/compatibility', undefined, { shallow: true });
      } else {
        const errorResult = await response.json();
        setError(`Failed to load scan details: ${errorResult.error || 'Unknown error'}`);
        console.error('Failed to load scan details:', errorResult);
      }
    } catch (error) {
      setError('Network error loading scan details. Please check your connection and try again.');
      console.error('Error loading scan details:', error);
      // Reset the URL to remove the problematic scanId
      router.push('/compatibility', undefined, { shallow: true });
    } finally {
      setIsLoadingScanDetails(false);
    }
  };

  const handleScanSelection = (scanId: string) => {
    setSelectedScanId(scanId);
    loadScanDetails(scanId);
    // Update URL to include scanId parameter
    router.push(`/compatibility?scanId=${scanId}`, undefined, { shallow: true });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Compatibility Analysis
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-slate-300 sm:mt-4">
              Analyze library compatibility across your scanned repositories using AI-powered insights
            </p>
          </div>

          {/* Scan Selection */}
          {!selectedScanDetails && (
            <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 shadow-lg overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-600/40">
                <h2 className="text-lg font-medium text-white flex items-center">
                  <span className="mr-2">📋</span>
                  Latest Scan Results for Compatibility Analysis
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Select components from your most recent repository scans to analyze dependency compatibility
                </p>
              </div>
              
              <div className="px-6 py-6">
                {isLoadingScans ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                    <span className="ml-3 text-slate-300">Loading scan results...</span>
                  </div>
                ) : storedScans.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-slate-400 text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-white mb-2">No Scan Results Found</h3>
                    <p className="text-slate-300 mb-4">
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
                ) : storedScans.length > 0 ? (
                  <div className="space-y-4">
                    {storedScans.map((scan, index) => (
                      <div key={scan.id} className="p-4 bg-slate-700/50 border border-slate-600/30 rounded-lg">
                        <h3 className="text-white">Scan #{index + 1}: {scan.repositories?.map(r => r.name).join(', ') || 'Unknown'}</h3>
                        <p className="text-slate-300 text-sm">ID: {scan.id}</p>
                        <p className="text-slate-300 text-sm">Timestamp: {scan.timestamp}</p>
                        <ScanResultCard scan={scan} onAnalyze={() => handleScanSelection(scan.id)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="mb-2">No scan results found</p>
                    <p className="text-sm">Try running a new scan first</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Scan Details with Compatibility Analysis */}
          {selectedScanDetails && (
            <div className="space-y-6">
              {/* Scan Overview */}
              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 flex items-center">
                        <span className="mr-2">🔍</span>
                        Selected Scan: {selectedScanDetails.repositories.map(r => r.name).join(', ')}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Scanned on {new Date(selectedScanDetails.timestamp).toLocaleDateString()} at {new Date(selectedScanDetails.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedScanDetails(null);
                        setSelectedScanId(null);
                        setLibraries([]);
                        setMatrix(null);
                        setError(null);
                        // Clear URL parameter
                        router.push('/compatibility', undefined, { shallow: true });
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Choose Different Scan
                    </button>
                  </div>
                </div>
                
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50">
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
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">{selectedScanDetails.summary.flaggedComponents}</div>
                    <div className="text-sm text-red-800">Flagged Components</div>
                  </div>
                </div>
              </div>

              {/* Repository Services with Compatibility */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">🔬</span>
                  Compatibility Analysis by Repository
                </h2>
                
                {selectedScanDetails.repositories.map((repo: any) => (
                  <div key={repo.id} className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                        {repo.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {repo.services?.length || 0} services • Branch: {repo.branch || 'main'}
                      </p>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {repo.services?.map((service: any) => (
                        <div key={service.id} className="p-6">
                          <div className="mb-4">
                            <h4 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                              <span className="text-2xl mr-2">
                                {service.language === 'javascript' ? '🟨' :
                                 service.language === 'java' ? '☕' :
                                 service.language === 'python' ? '🐍' : '📦'}
                              </span>
                              {service.name}
                              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                {service.language}
                              </span>
                            </h4>
                            <p className="text-sm text-gray-600">
                              {service.components?.length || 0} components • Path: {service.path}
                            </p>
                          </div>
                          
                          {/* Compatibility Matrix for this service */}
                          {service.components && service.components.length > 1 ? (
                            <div className="mt-4">
                              <CompatibilityMatrix
                                components={service.components}
                                serviceName={service.name}
                                language={service.language}
                                runtime={service.runtime}
                                runtimeVersion={service.runtimeVersion}
                              />
                            </div>
                          ) : (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                              <div className="text-center">
                                <div className="text-gray-400 text-2xl mb-2">📊</div>
                                <p className="text-sm text-gray-600">
                                  {service.components?.length === 1 
                                    ? "Only 1 component found - need at least 2 components for compatibility analysis"
                                    : "No components found in this service"}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )) || (
                        <div className="p-6 text-center text-gray-500">
                          <div className="text-gray-400 text-2xl mb-2">📂</div>
                          <p>No services found in this repository</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state for scan details */}
          {isLoadingScanDetails && (
            <div className="bg-white shadow-lg rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-slate-300">Loading scan details...</p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-8 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="text-red-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-300">Error</h3>
                  <p className="text-sm text-red-200 mt-1">{error}</p>
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
