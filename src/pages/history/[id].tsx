import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  ChevronLeftIcon, 
  ArrowPathIcon, 
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import type { ScanRecord } from '../../lib/scanStorage';

export default function ScanDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchScan = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/history/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Scan not found');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return;
        }
        
        const scanData = await response.json();
        setScan(scanData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch scan details');
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
  }, [id]);

  const rescanRepository = async () => {
    if (!scan) return;
    
    try {
      const response = await fetch('/api/history/rescan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: scan.id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        // In a real implementation, redirect to the new scan or refresh
        router.push('/history');
      } else {
        alert(`Rescan failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Rescan failed:', error);
      alert('Failed to initiate rescan');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-8 text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Scan Not Found</h1>
            <p className="text-gray-300 mb-4">The requested scan could not be found.</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalVulns = scan.vulns.high + scan.vulns.med + scan.vulns.low;
  const totalEOL = scan.eol.overdue + scan.eol.soon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">{scan.repoName}</h1>
                <p className="text-gray-300">
                  Scanned {new Date(scan.scannedAt).toLocaleDateString()} at {new Date(scan.scannedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={rescanRepository}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Rescan
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors">
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Libraries</p>
                <p className="text-2xl font-bold text-white">
                  {scan.libsOutdated}/{scan.libsTotal}
                </p>
                <p className="text-gray-400 text-xs">outdated/total</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Vulnerabilities</p>
                <p className="text-2xl font-bold text-white">{totalVulns}</p>
                <p className="text-gray-400 text-xs">
                  {scan.vulns.high > 0 && <span className="text-red-400">High: {scan.vulns.high} </span>}
                  {scan.vulns.med > 0 && <span className="text-orange-400">Med: {scan.vulns.med} </span>}
                  {scan.vulns.low > 0 && <span className="text-yellow-400">Low: {scan.vulns.low}</span>}
                </p>
              </div>
              <ShieldExclamationIcon className={`h-8 w-8 ${totalVulns > 0 ? 'text-red-400' : 'text-green-400'}`} />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">End-of-Life</p>
                <p className="text-2xl font-bold text-white">{totalEOL}</p>
                <p className="text-gray-400 text-xs">
                  {scan.eol.overdue > 0 && <span className="text-red-400">Overdue: {scan.eol.overdue} </span>}
                  {scan.eol.soon > 0 && <span className="text-yellow-400">Soon: {scan.eol.soon}</span>}
                </p>
              </div>
              <ClockIcon className={`h-8 w-8 ${totalEOL > 0 ? 'text-yellow-400' : 'text-green-400'}`} />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Compatibility</p>
                <p className="text-2xl font-bold text-white">{scan.compat.avg}%</p>
                <p className="text-gray-400 text-xs">avg (min: {scan.compat.min}%)</p>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                scan.compat.avg >= 80 ? 'bg-green-500' : scan.compat.avg >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                {scan.compat.avg}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scan Details */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Scan Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Scan ID:</span>
                <span className="text-white font-mono text-xs">{scan.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Repository:</span>
                <span className="text-white">{scan.repoName}</span>
              </div>
              {scan.repoUrl && (
                <div className="flex justify-between">
                  <span className="text-gray-300">URL:</span>
                  <a href={scan.repoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 break-all">
                    {scan.repoUrl}
                  </a>
                </div>
              )}
              {scan.branch && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Branch:</span>
                  <span className="text-white font-mono">{scan.branch}</span>
                </div>
              )}
              {scan.commit && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Commit:</span>
                  <span className="text-white font-mono">{scan.commit.substring(0, 12)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-300">Scanned:</span>
                <span className="text-white">{new Date(scan.scannedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Plan Ready:</span>
                <span className={`${scan.planReady ? 'text-green-400' : 'text-yellow-400'}`}>
                  {scan.planReady ? 'Yes' : 'No'}
                </span>
              </div>
              {scan.tags && scan.tags.length > 0 && (
                <div>
                  <span className="text-gray-300 block mb-2">Tags:</span>
                  <div className="flex flex-wrap gap-2">
                    {scan.tags.map(tag => (
                      <span key={tag} className="bg-white/10 px-2 py-1 rounded-full text-xs text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Libraries Sample */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Sample Libraries</h2>
            {scan.sampleLibs && scan.sampleLibs.length > 0 ? (
              <div className="space-y-3">
                {scan.sampleLibs.map((lib, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-white text-sm">{lib.name}</span>
                      {lib.severity && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          lib.severity === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          lib.severity === 'Med' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {lib.severity}
                        </span>
                      )}
                    </div>
                    {lib.current && (
                      <div className="text-sm text-gray-300">
                        Current: <span className="font-mono">{lib.current}</span>
                        {lib.latest && lib.current !== lib.latest && (
                          <span className="text-yellow-400"> → Latest: <span className="font-mono">{lib.latest}</span></span>
                        )}
                      </div>
                    )}
                    {lib.eol && (
                      <div className="text-sm text-red-400">
                        EOL: {lib.eol}
                      </div>
                    )}
                  </div>
                ))}
                {scan.sampleLibs.length < scan.libsTotal && (
                  <p className="text-gray-400 text-sm text-center">
                    Showing {scan.sampleLibs.length} of {scan.libsTotal} libraries
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400">No sample library data available</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            {scan.planReady ? (
              <Link
                href={`/plan?scan=${scan.id}`}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
              >
                View Upgrade Plan
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-gray-300 rounded-md cursor-not-allowed"
              >
                Upgrade Plan (Not Ready)
              </button>
            )}
            
            <Link
              href={`/compatibility?scan=${scan.id}`}
              className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              View Compatibility Matrix
            </Link>
            
            <button
              onClick={rescanRepository}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Run New Scan
            </button>
            
            <button className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors">
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export Full Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
