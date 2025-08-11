import { useState } from 'react';
import type { ServiceComponent } from '../../types/scanNew';

interface CompatibilityIssue {
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

interface CompatibilityMatrixEntry {
  component1: string;
  component2: string;
  compatible: boolean;
  issues?: CompatibilityIssue[];
  confidence: number;
}

interface CompatibilityMatrixData {
  matrix: CompatibilityMatrixEntry[];
  summary: {
    totalPairs: number;
    compatiblePairs: number;
    incompatiblePairs: number;
    highRiskPairs: number;
  };
  recommendations: string[];
}

interface CompatibilityMatrixProps {
  components: ServiceComponent[];
  serviceName: string;
  language: string;
  runtime?: string;
  runtimeVersion?: string;
}

export default function CompatibilityMatrix({
  components,
  serviceName,
  language,
  runtime,
  runtimeVersion
}: CompatibilityMatrixProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [matrixData, setMatrixData] = useState<CompatibilityMatrixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const generateMatrix = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/scanNew/compatibility-matrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          components,
          serviceInfo: {
            name: serviceName,
            language,
            runtime,
            runtimeVersion,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate compatibility matrix');
      }

      const data = await response.json();
      setMatrixData(data);
      setShowMatrix(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'text-red-300 bg-red-500/20';
      case 'medium': return 'text-yellow-300 bg-yellow-500/20';
      case 'low': return 'text-blue-300 bg-blue-500/20';
    }
  };

  const getCompatibilityColor = (compatible: boolean, confidence: number) => {
    if (compatible) {
      return confidence > 80 ? 'text-green-300 bg-green-500/20' : 'text-yellow-300 bg-yellow-500/20';
    }
    return 'text-red-300 bg-red-500/20';
  };

  if (!showMatrix) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-sm font-medium text-gray-300">AI-Powered Compatibility Analysis</h5>
          <button
            onClick={generateMatrix}
            disabled={isGenerating || components.length < 2}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            data-generate-matrix
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Analyzing Dependencies...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Generate Compatibility Matrix</span>
              </>
            )}
          </button>
        </div>

        {components.length < 2 && (
          <p className="text-xs text-gray-400 mb-4">
            At least 2 dependencies are required for compatibility analysis
          </p>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">Error: {error}</p>
          </div>
        )}

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h6 className="text-white font-medium mb-2">LLM-Powered Dependency Analysis</h6>
              <p className="text-gray-300 text-sm mb-3">
                Our AI will analyze {Math.floor((components.length * (components.length - 1)) / 2)} dependency combinations 
                to identify potential compatibility issues, version conflicts, and security concerns.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center text-xs text-gray-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    Compatibility scoring with confidence levels
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    Version conflict detection
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-xs text-gray-400">
                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                    Security vulnerability impact analysis
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    Actionable upgrade recommendations
                  </div>
                </div>
              </div>
              
              {/* Show preview of dependencies to be analyzed */}
              <div className="bg-gray-700/30 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Dependencies to analyze:</p>
                <div className="flex flex-wrap gap-1">
                  {components.slice(0, 8).map((comp, idx) => (
                    <span key={idx} className="text-xs bg-gray-600/50 text-gray-300 px-2 py-1 rounded">
                      {comp.name}@{comp.version}
                    </span>
                  ))}
                  {components.length > 8 && (
                    <span className="text-xs text-gray-400 px-2 py-1">
                      +{components.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-sm font-medium text-gray-300">Compatibility Matrix</h5>
        <div className="flex items-center space-x-2">
          <button
            onClick={generateMatrix}
            disabled={isGenerating}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowMatrix(false)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
          >
            Hide
          </button>
        </div>
      </div>

      {matrixData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
              <div className="text-lg font-semibold text-white">{matrixData.summary.totalPairs}</div>
              <div className="text-xs text-gray-400">Total Pairs</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="text-lg font-semibold text-green-300">{matrixData.summary.compatiblePairs}</div>
              <div className="text-xs text-gray-400">Compatible</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="text-lg font-semibold text-red-300">{matrixData.summary.incompatiblePairs}</div>
              <div className="text-xs text-gray-400">Incompatible</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="text-lg font-semibold text-yellow-300">{matrixData.summary.highRiskPairs}</div>
              <div className="text-xs text-gray-400">High Risk</div>
            </div>
          </div>

          {/* Compatibility Matrix Grid */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700/50">
              <h6 className="text-white font-medium">Compatibility Matrix Grid</h6>
              <p className="text-xs text-gray-400 mt-1">
                Hover over cells to see detailed compatibility analysis
              </p>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-max">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="w-32 h-32 p-0 border border-gray-700/30"></th>
                      {components.map((comp, idx) => (
                        <th key={idx} className="w-24 h-32 p-2 border border-gray-700/30 bg-gray-700/20 relative">
                          <div className="transform -rotate-45 origin-bottom-left absolute bottom-2 left-2 text-xs text-gray-300 font-mono whitespace-nowrap">
                            {comp.name}@{comp.version.split('.')[0]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((rowComp, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="w-32 h-16 p-2 border border-gray-700/30 bg-gray-700/20 text-right">
                          <div className="text-xs text-gray-300 font-mono truncate">
                            {rowComp.name}@{rowComp.version.split('.')[0]}
                          </div>
                        </td>
                        {components.map((colComp, colIdx) => {
                          // Find the matrix entry for this pair
                          const matrixEntry = matrixData.matrix.find(entry => 
                            (entry.component1 === `${rowComp.name}@${rowComp.version}` && 
                             entry.component2 === `${colComp.name}@${colComp.version}`) ||
                            (entry.component2 === `${rowComp.name}@${rowComp.version}` && 
                             entry.component1 === `${colComp.name}@${colComp.version}`)
                          );

                          // Self-compatibility (diagonal)
                          if (rowIdx === colIdx) {
                            return (
                              <td key={colIdx} className="w-24 h-16 border border-gray-700/30 bg-gray-600/30">
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-8 h-8 bg-gray-500/50 rounded border border-gray-400/50 flex items-center justify-center">
                                    <span className="text-xs text-gray-400">—</span>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          const isCompatible = matrixEntry?.compatible ?? true;
                          const confidence = matrixEntry?.confidence ?? 90;
                          const hasIssues = matrixEntry?.issues && matrixEntry.issues.length > 0;

                          let cellColor = 'bg-gray-600/20';
                          let iconColor = 'text-gray-400';
                          let icon = '?';

                          if (matrixEntry) {
                            if (isCompatible) {
                              if (confidence > 85) {
                                cellColor = 'bg-green-500/30 hover:bg-green-500/40';
                                iconColor = 'text-green-300';
                                icon = '✓';
                              } else {
                                cellColor = 'bg-yellow-500/30 hover:bg-yellow-500/40';
                                iconColor = 'text-yellow-300';
                                icon = '⚠';
                              }
                            } else {
                              cellColor = 'bg-red-500/30 hover:bg-red-500/40';
                              iconColor = 'text-red-300';
                              icon = '✕';
                            }
                          }

                          return (
                            <td key={colIdx} className="w-24 h-16 border border-gray-700/30 relative group">
                              <div className={`w-full h-full flex items-center justify-center transition-colors cursor-pointer ${cellColor}`}>
                                <div className="text-sm font-bold">
                                  <span className={iconColor}>{icon}</span>
                                </div>
                                
                                {/* Confidence indicator */}
                                {matrixEntry && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1">
                                    <div 
                                      className={`h-full transition-all ${
                                        confidence > 85 ? 'bg-green-400' :
                                        confidence > 70 ? 'bg-yellow-400' : 'bg-red-400'
                                      }`}
                                      style={{ width: `${confidence}%` }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Detailed tooltip on hover */}
                              {matrixEntry && (
                                <div className="absolute z-10 left-1/2 top-full mt-2 transform -translate-x-1/2 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none min-w-64">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm font-medium ${isCompatible ? 'text-green-300' : 'text-red-300'}`}>
                                        {isCompatible ? 'Compatible' : 'Incompatible'}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {confidence}% confidence
                                      </span>
                                    </div>
                                    
                                    <div className="text-xs space-y-1">
                                      <div className="font-mono text-blue-300">
                                        {rowComp.name}@{rowComp.version}
                                      </div>
                                      <div className="text-gray-400">↕</div>
                                      <div className="font-mono text-blue-300">
                                        {colComp.name}@{colComp.version}
                                      </div>
                                    </div>

                                    {hasIssues && matrixEntry.issues && (
                                      <div className="space-y-1 pt-2 border-t border-gray-700">
                                        <div className="text-xs font-medium text-gray-300">Issues:</div>
                                        {matrixEntry.issues.slice(0, 2).map((issue, idx) => (
                                          <div key={idx} className={`text-xs p-1 rounded ${getSeverityColor(issue.severity)}`}>
                                            <div className="font-medium">{issue.severity.toUpperCase()}</div>
                                            <div className="text-xs opacity-90">{issue.description}</div>
                                          </div>
                                        ))}
                                        {matrixEntry.issues.length > 2 && (
                                          <div className="text-xs text-gray-400">
                                            +{matrixEntry.issues.length - 2} more issues
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Matrix Legend */}
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/20">
              <div className="flex items-center justify-between">
                <h6 className="text-sm font-medium text-gray-300 mb-2">Legend</h6>
                <div className="text-xs text-gray-400">
                  {matrixData.matrix.length} pairs analyzed
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500/30 rounded flex items-center justify-center">
                    <span className="text-green-300 text-xs">✓</span>
                  </div>
                  <span className="text-gray-400">Compatible (High Confidence)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500/30 rounded flex items-center justify-center">
                    <span className="text-yellow-300 text-xs">⚠</span>
                  </div>
                  <span className="text-gray-400">Compatible (Low Confidence)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500/30 rounded flex items-center justify-center">
                    <span className="text-red-300 text-xs">✕</span>
                  </div>
                  <span className="text-gray-400">Incompatible</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-500/30 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">—</span>
                  </div>
                  <span className="text-gray-400">Self (N/A)</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Confidence bars at bottom of each cell • Hover for detailed analysis
              </div>
            </div>
          </div>

          {/* Detailed Issues Table */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700/50">
              <h6 className="text-white font-medium">Detailed Compatibility Issues</h6>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700/30">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Component A</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Component B</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Confidence</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.matrix.filter(entry => entry.issues && entry.issues.length > 0).map((entry, idx) => (
                    <tr key={idx} className="border-b border-gray-700/20 hover:bg-gray-700/20">
                      <td className="py-3 px-4">
                        <code className="text-xs bg-gray-700/50 px-2 py-1 rounded text-gray-300">
                          {entry.component1}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-gray-700/50 px-2 py-1 rounded text-gray-300">
                          {entry.component2}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCompatibilityColor(entry.compatible, entry.confidence)}`}>
                          {entry.compatible ? 'Compatible' : 'Incompatible'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                entry.confidence > 80 ? 'bg-green-500' :
                                entry.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${entry.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-300 w-8">{entry.confidence}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {entry.issues && entry.issues.length > 0 ? (
                          <div className="space-y-1">
                            {entry.issues.slice(0, 2).map((issue, issueIdx) => (
                              <div key={issueIdx} className={`text-xs px-2 py-1 rounded ${getSeverityColor(issue.severity)}`}>
                                <div className="font-medium">{issue.severity.toUpperCase()}</div>
                                <div className="text-xs opacity-90 mt-1">{issue.description}</div>
                              </div>
                            ))}
                            {entry.issues.length > 2 && (
                              <div className="text-xs text-gray-400">
                                +{entry.issues.length - 2} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h6 className="text-blue-300 font-medium mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              AI Recommendations
            </h6>
            <ul className="space-y-2">
              {matrixData?.recommendations?.map((recommendation, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-sm text-gray-300">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
