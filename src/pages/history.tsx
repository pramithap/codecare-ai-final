import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { ClockIcon, EyeIcon } from '@heroicons/react/24/outline';
import type { ScanRecord } from '../lib/scanStorage';

export default function HistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan history');
      }
      
      const scanData = await response.json();
      setScans(scanData.scans || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch scan history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Scan History</h1>
            <p className="mt-2 text-gray-600">
              View and manage your previous dependency scans
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && scans.length === 0 && (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scan history</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven&apos;t run any scans yet.
              </p>
              <div className="mt-6">
                <Link
                  href="/scan"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Run Your First Scan
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && scans.length > 0 && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {scans.map((scan) => (
                  <li key={scan.id}>
                    <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ClockIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {scan.repoName || 'Unnamed Project'}
                            </p>
                            <p className="ml-2 flex-shrink-0 text-xs text-gray-500">
                              Scan Results Available
                            </p>
                          </div>
                          <p className="text-sm text-gray-500">
                            Scanned on {formatDate(scan.scannedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/history/${scan.id}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}