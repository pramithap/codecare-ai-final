import { useState, useRef, useEffect } from 'react';
import type { ScanResults, ServiceSummary } from '../../types/scanNew';
import CompatibilityMatrix from './CompatibilityMatrix';

interface ScanResultsProps {
  results: ScanResults;
  onNewScan?: () => void;
}

export default function ScanResults({ results, onNewScan }: ScanResultsProps) {
  const [selectedService, setSelectedService] = useState<ServiceSummary | null>(null);
  const [expandedTechnologies, setExpandedTechnologies] = useState<Set<string>>(new Set());
  const expandedRef = useRef<HTMLDivElement>(null);

  const servicesByLanguage = results.services.reduce((acc, service) => {
    const lang = service.language || 'unknown';
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(service);
    return acc;
  }, {} as Record<string, ServiceSummary[]>);

  const toggleTechnologyExpansion = (techKey: string) => {
    const newExpanded = new Set(expandedTechnologies);
    if (newExpanded.has(techKey)) {
      newExpanded.delete(techKey);
    } else {
      newExpanded.add(techKey);
    }
    setExpandedTechnologies(newExpanded);
  };

  // Close expanded details when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedRef.current && !expandedRef.current.contains(event.target as Node)) {
        setExpandedTechnologies(new Set());
      }
    };

    if (expandedTechnologies.size > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expandedTechnologies]);

  const getLanguageIcon = (language: string) => {
    switch (language.toLowerCase()) {
      case 'javascript': return '🟨';
      case 'java': return '☕';
      case 'python': return '🐍';
      case 'docker': return '🐳';
      default: return '📄';
    }
  };

  const getSeverityColor = (flagged: boolean, eol: boolean) => {
    if (eol) return 'text-red-400 bg-red-500/20';
    if (flagged) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-green-400 bg-green-500/20';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'language': return '📝';
      case 'runtime': return '⚡';
      case 'framework': return '🏗️';
      case 'database': return '🗄️';
      case 'infrastructure': return '🏢';
      case 'container': return '🐳';
      case 'build-tool': return '🔧';
      case 'testing': return '🧪';
      case 'cloud': return '☁️';
      case 'monitoring': return '📊';
      case 'security': return '🔒';
      default: return '📦';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'language': return 'bg-blue-500/20 text-blue-300';
      case 'runtime': return 'bg-yellow-500/20 text-yellow-300';
      case 'framework': return 'bg-green-500/20 text-green-300';
      case 'database': return 'bg-purple-500/20 text-purple-300';
      case 'infrastructure': return 'bg-gray-500/20 text-gray-300';
      case 'container': return 'bg-cyan-500/20 text-cyan-300';
      case 'build-tool': return 'bg-orange-500/20 text-orange-300';
      case 'testing': return 'bg-pink-500/20 text-pink-300';
      case 'cloud': return 'bg-indigo-500/20 text-indigo-300';
      case 'monitoring': return 'bg-emerald-500/20 text-emerald-300';
      case 'security': return 'bg-red-500/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'build-tool': return 'Build Tools';
      case 'container': return 'Containers';
      default: return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  // Group technologies by category
  const technologiesByCategory = results.technologies.reduce((acc, tech) => {
    if (!acc[tech.category]) acc[tech.category] = [];
    acc[tech.category].push(tech);
    return acc;
  }, {} as Record<string, typeof results.technologies>);

  // Sort categories by priority and count
  const categoryOrder = ['language', 'runtime', 'framework', 'database', 'container', 'build-tool', 'testing', 'cloud', 'monitoring', 'security', 'infrastructure', 'other'];
  const sortedCategories = Object.keys(technologiesByCategory)
    .sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Scan Results</h2>
          <p className="text-slate-300 text-sm">
            Analysis complete • Found {results.totalServices} services with {results.totalComponents} components
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.location.href = '/compatibility'}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-purple-500/25"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Analyze Compatibility</span>
          </button>
          {onNewScan && (
            <button
              onClick={onNewScan}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
              </svg>
              <span>New Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🏗️</span>
            <div>
              <div className="text-2xl font-bold text-white">{results.totalServices}</div>
              <div className="text-sm text-slate-300">Services</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📦</span>
            <div>
              <div className="text-2xl font-bold text-white">{results.totalComponents}</div>
              <div className="text-sm text-slate-300">Components</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-2xl font-bold text-white">{results.flaggedComponents}</div>
              <div className="text-sm text-slate-300">Flagged</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🚨</span>
            <div>
              <div className="text-2xl font-bold text-white">{results.eolComponents}</div>
              <div className="text-sm text-slate-300">EOL</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🛠️</span>
            <div>
              <div className="text-2xl font-bold text-white">{results.technologies?.length || 0}</div>
              <div className="text-sm text-gray-300">Technologies</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack - Compact View */}
      <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6" ref={expandedRef}>
        <h3 className="text-lg font-semibold text-white mb-4">Technology Stack</h3>
        
        {sortedCategories.length > 0 ? (
          <div className="space-y-4">
            {sortedCategories.map(category => (
              <div key={category} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getCategoryIcon(category)}</span>
                  <h4 className="font-medium text-white">{getCategoryDisplayName(category)}</h4>
                  <span className="text-sm text-slate-400">({technologiesByCategory[category].length})</span>
                </div>
                
                {/* Compact Technology Pills */}
                <div className="flex flex-wrap gap-2 ml-6">
                  {technologiesByCategory[category]
                    .sort((a, b) => b.serviceCount - a.serviceCount)
                    .map((tech, index) => {
                      const techKey = `${category}-${tech.name}-${index}`;
                      const isExpanded = expandedTechnologies.has(techKey);
                      
                      return (
                        <div key={techKey} className="relative">
                          {/* Compact Pill */}
                          <button
                            onClick={() => toggleTechnologyExpansion(techKey)}
                            className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200 hover:scale-105 ${getCategoryColor(tech.category)} border-current/30 hover:border-current/50`}
                          >
                            <span className="font-medium text-sm">{tech.name}</span>
                            {tech.version && (
                              <span className="text-xs opacity-70">v{tech.version}</span>
                            )}
                            <span className="bg-current/20 text-current px-1.5 py-0.5 rounded-full text-xs font-medium">
                              {tech.serviceCount}
                            </span>
                            <svg 
                              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 shadow-2xl z-10">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-semibold text-white">{tech.name}</h5>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(tech.category)}`}>
                                    {getCategoryDisplayName(tech.category)}
                                  </span>
                                </div>
                                
                                {tech.version && (
                                  <div className="text-sm text-slate-300">
                                    <span className="text-slate-400">Version:</span> {tech.version}
                                  </div>
                                )}
                                
                                <div className="text-sm text-slate-300">
                                  <span className="text-slate-400">Used in:</span>
                                  <div className="mt-1 space-y-1">
                                    {tech.services.map((service, idx) => (
                                      <div key={idx} className="text-xs bg-slate-800/50 px-2 py-1 rounded">
                                        {service}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="text-sm text-slate-400 border-t border-slate-700/50 pt-2">
                                  Found in {tech.serviceCount} service{tech.serviceCount !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 py-4">
            No technology information available
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Scan Results</h2>
        <div className="space-x-3">
          <button
            onClick={onNewScan}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            🔄 New Scan
          </button>
          <button className="px-4 py-2 bg-slate-700/80 border border-slate-600/60 text-white rounded-lg font-medium hover:bg-slate-600/80 transition-all">
            📊 Export Results
          </button>
        </div>
      </div>

      {/* Services by Language */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Object.entries(servicesByLanguage).map(([language, services]) => (
          <div
            key={language}
            className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-600/40 p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">{getLanguageIcon(language)}</span>
              <h3 className="text-lg font-semibold text-white capitalize">
                {language} Services ({services.length})
              </h3>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {services.map((service) => {
                const hasIssues = service.components.some(c => c.flagged || c.eol);
                const eolCount = service.components.filter(c => c.eol).length;
                const flaggedCount = service.components.filter(c => c.flagged).length;

                return (
                  <div
                    key={service.id}
                    onClick={() => {
                      console.log('Service clicked:', service.name, 'components:', service.components.length);
                      setSelectedService(service);
                    }}
                    className="cursor-pointer bg-slate-700/60 border border-slate-600/50 rounded-lg p-4 hover:bg-slate-600/60 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white group-hover:text-blue-300">
                            {service.name}
                          </span>
                          {service.runtime && (
                            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                              {service.runtime} {service.runtimeVersion}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {service.path} • {service.components.length} components
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {eolCount > 0 && (
                          <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded">
                            {eolCount} EOL
                          </span>
                        )}
                        {flaggedCount > 0 && (
                          <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                            {flaggedCount} Flagged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Service Details Modal with Enhanced Dependencies Table */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedService(null)}>
          <div className="bg-gray-900 rounded-xl p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">{selectedService.name}</h3>
              <button onClick={() => setSelectedService(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Language:</span>
                  <span className="text-white ml-2 capitalize">{selectedService.language}</span>
                </div>
                <div>
                  <span className="text-gray-400">Path:</span>
                  <span className="text-white ml-2">{selectedService.path}</span>
                </div>
                {selectedService.runtime && (
                  <div>
                    <span className="text-gray-400">Runtime:</span>
                    <span className="text-white ml-2">{selectedService.runtime} {selectedService.runtimeVersion}</span>
                  </div>
                )}
                {selectedService.baseImage && (
                  <div>
                    <span className="text-gray-400">Base Image:</span>
                    <span className="text-white ml-2">{selectedService.baseImage}</span>
                  </div>
                )}
              </div>

              {/* Enhanced Dependencies Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-white">
                    Dependencies ({selectedService.components.length})
                    <span className="text-xs text-gray-400 ml-2">
                      [Debug: {selectedService.components.length} components found]
                    </span>
                  </h4>
                  {selectedService.components.length >= 2 && (
                    <button
                      onClick={() => {
                        const matrixSection = document.querySelector('[data-compatibility-matrix]');
                        if (matrixSection) {
                          matrixSection.scrollIntoView({ behavior: 'smooth' });
                          // Trigger the matrix generation if not already visible
                          const generateButton = matrixSection.querySelector('button[data-generate-matrix]') as HTMLButtonElement;
                          if (generateButton && !generateButton.disabled) {
                            generateButton.click();
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center space-x-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <span>AI Compatibility Analysis</span>
                    </button>
                  )}
                </div>
                
                {selectedService.components.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4 text-gray-300 font-medium">Package</th>
                            <th className="text-left py-3 px-4 text-gray-300 font-medium">Type</th>
                            <th className="text-left py-3 px-4 text-gray-300 font-medium">Current</th>
                            <th className="text-left py-3 px-4 text-gray-300 font-medium">Latest</th>
                            <th className="text-left py-3 px-4 text-gray-300 font-medium">EOL</th>
                            <th className="text-left py-3 px-4 text-gray-300 font-medium">CVEs</th>
                            <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                            <th className="text-center py-3 px-4 text-gray-300 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedService.components.map((component, idx) => {
                            const hasUpdate = component.latestVersion && component.latestVersion !== component.version;
                            const isOutdated = hasUpdate;
                            
                            return (
                              <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-white font-medium">{component.name}</span>
                                    {component.scope && (
                                      <span className="text-xs text-gray-400">@{component.scope}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    component.type === 'dependency' 
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : component.type === 'devDependency'
                                      ? 'bg-gray-500/20 text-gray-300'
                                      : 'bg-orange-500/20 text-orange-300'
                                  }`}>
                                    {component.type === 'devDependency' ? 'Dev' : 
                                     component.type === 'buildDependency' ? 'Build' : 'Prod'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-gray-300 font-mono">{component.version}</span>
                                </td>
                                <td className="py-3 px-4">
                                  {component.latestVersion ? (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-gray-300 font-mono">{component.latestVersion}</span>
                                      {hasUpdate && (
                                        <span className="text-xs text-blue-300">🔄</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-xs">Checking...</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {component.eol ? (
                                    <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-medium">
                                      Yes
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">No</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {component.cveCount > 0 ? (
                                    <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-medium">
                                      {component.cveCount} CVE{component.cveCount !== 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-xs">None</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-1">
                                    {component.eol && (
                                      <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded">EOL</span>
                                    )}
                                    {component.cveCount > 0 && (
                                      <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded">CVE</span>
                                    )}
                                    {isOutdated && (
                                      <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">Outdated</span>
                                    )}
                                    {component.flagged && (
                                      <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                                        {component.flagReason || 'Flagged'}
                                      </span>
                                    )}
                                    {!component.eol && !component.cveCount && !isOutdated && !component.flagged && (
                                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">OK</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => {
                                      // Create a mock compatibility check for this component against all others
                                      const otherComponents = selectedService.components.filter(c => c.name !== component.name);
                                      if (otherComponents.length > 0) {
                                        alert(`Compatibility analysis for ${component.name} is not yet implemented in individual mode. Use the full compatibility matrix below.`);
                                      } else {
                                        alert('Need at least 2 components for compatibility analysis.');
                                      }
                                    }}
                                    disabled={selectedService.components.length < 2}
                                    className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Analyze compatibility with other dependencies"
                                  >
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Dependencies Summary */}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-500/20 rounded"></div>
                        <span className="text-gray-400">
                          Production: {selectedService.components.filter(c => c.type === 'dependency').length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-gray-500/20 rounded"></div>
                        <span className="text-gray-400">
                          Development: {selectedService.components.filter(c => c.type === 'devDependency').length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-orange-500/20 rounded"></div>
                        <span className="text-gray-400">
                          Build: {selectedService.components.filter(c => c.type === 'buildDependency').length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-500/20 rounded"></div>
                        <span className="text-gray-400">
                          EOL: {selectedService.components.filter(c => c.eol).length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-500/20 rounded"></div>
                        <span className="text-gray-400">
                          CVEs: {selectedService.components.reduce((sum, c) => sum + c.cveCount, 0)}
                        </span>
                      </div>
                    </div>

                    {/* AI-Powered Compatibility Matrix */}
                    <div data-compatibility-matrix>
                      <CompatibilityMatrix
                        components={selectedService.components}
                        serviceName={selectedService.name}
                        language={selectedService.language}
                        runtime={selectedService.runtime}
                        runtimeVersion={selectedService.runtimeVersion}
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center text-gray-400">
                    <p>No dependencies found for this service.</p>
                    <p className="text-xs mt-2">This service may not have a recognized manifest file.</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Manifest Files</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedService.manifestFiles.map((file, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-white/10 text-gray-300 rounded">
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
