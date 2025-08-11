import { useState } from 'react';
import Head from 'next/head';
import type { RepoRef, ScanRun, ScanResults } from '../types/scanNew';
import RepoSelector from '../components/scanNew/RepoSelector';
import ScanProgress from '../components/scanNew/ScanProgress';
import ScanResultsView from '../components/scanNew/ScanResults';

type ScanStep = 'select' | 'scanning' | 'results';

export default function ScanNewPage() {
  const [step, setStep] = useState<ScanStep>('select');
  const [selectedRepos, setSelectedRepos] = useState<RepoRef[]>([]);
  const [scanDepth, setScanDepth] = useState<'full' | 'incremental'>('full');
  const [currentRunId, setCurrentRunId] = useState<string>('');
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartScan = async () => {
    if (selectedRepos.length === 0) return;

    console.log('Starting scan with repos:', selectedRepos, 'depth:', scanDepth);
    setIsStarting(true);
    
    try {
      const response = await fetch('/api/scanNew/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repos: selectedRepos,
          depth: scanDepth,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Start scan API error:', response.status, errorText);
        throw new Error('Failed to start scan');
      }

      const result = await response.json();
      console.log('Scan started successfully, runId:', result.runId);
      setCurrentRunId(result.runId);
      setStep('scanning');
    } catch (error) {
      console.error('Failed to start scan:', error);
      alert('Failed to start scan. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleScanComplete = async (run: ScanRun) => {
    console.log('handleScanComplete called with run:', run);
    try {
      const response = await fetch(`/api/scanNew/results/${run.id}`);
      console.log('Results API response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      
      const results: ScanResults = await response.json();
      console.log('Fetched results:', results);
      setScanResults(results);
      setStep('results');
      
      // Store scan results in compatibility page
      try {
        const storeResponse = await fetch('/api/compatibility/store-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scanResults: results,
            repositories: selectedRepos,
          }),
        });
        
        if (storeResponse.ok) {
          const storeResult = await storeResponse.json();
          console.log('Scan results stored for compatibility analysis:', storeResult.scanId);
        } else {
          console.warn('Failed to store scan results for compatibility analysis');
        }
      } catch (storeError) {
        console.error('Error storing scan results for compatibility:', storeError);
      }
      
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const handleNewScan = () => {
    setStep('select');
    setSelectedRepos([]);
    setCurrentRunId('');
    setScanResults(null);
  };

  return (
    <>
      <Head>
        <title>New Scan - CodeCare AI</title>
        <meta name="description" content="Scan repositories for security vulnerabilities and EOL components" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-indigo-500/25">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">New Repository Scan</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Scan GitHub repositories remotely for security vulnerabilities, end-of-life components, and technical debt without cloning.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="flex items-center justify-center space-x-8">
              <button 
                onClick={() => {
                  if (step !== 'select') {
                    setStep('select');
                    // Keep the selected repos and current run ID when navigating back
                  }
                }}
                className={`flex items-center space-x-3 transition-all duration-200 ${
                  step === 'select' ? 'text-indigo-400' : step === 'scanning' || step === 'results' ? 'text-emerald-400 hover:text-emerald-300 cursor-pointer' : 'text-slate-400'
                } ${step !== 'select' ? 'hover:scale-105' : ''}`}
                disabled={step === 'select'}
                title={step !== 'select' ? 'Click to go back to repository selection' : undefined}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                  step === 'select' ? 'bg-indigo-800 text-indigo-300 ring-4 ring-indigo-800/30' : 
                  step === 'scanning' || step === 'results' ? 'bg-emerald-800 text-emerald-300 hover:bg-emerald-700' : 
                  'bg-slate-700 text-slate-400'
                }`}>
                  {step === 'scanning' || step === 'results' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  ) : '1'}
                </div>
                <span className="font-semibold">Select Repositories</span>
              </button>
              
              <div className={`w-12 h-1 rounded-full transition-all duration-300 ${step === 'scanning' || step === 'results' ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
              
              <button 
                onClick={() => {
                  if (step === 'results' && currentRunId) {
                    setStep('scanning');
                  }
                }}
                className={`flex items-center space-x-3 transition-all duration-200 ${
                  step === 'scanning' ? 'text-indigo-400' : step === 'results' ? 'text-emerald-400 hover:text-emerald-300 cursor-pointer' : 'text-slate-400'
                } ${step === 'results' && currentRunId ? 'hover:scale-105' : ''}`}
                disabled={step === 'scanning' || (step === 'results' && !currentRunId)}
                title={step === 'results' && currentRunId ? 'Click to view scanning progress' : undefined}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                  step === 'scanning' ? 'bg-indigo-800 text-indigo-300 ring-4 ring-indigo-800/30' : 
                  step === 'results' ? 'bg-emerald-800 text-emerald-300 hover:bg-emerald-700' : 
                  'bg-slate-700 text-slate-400'
                }`}>
                  {step === 'results' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  ) : step === 'scanning' ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : '2'}
                </div>
                <span className="font-semibold">Scanning</span>
              </button>
              
              <div className={`w-12 h-1 rounded-full transition-all duration-300 ${step === 'results' ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
              
              <div className={`flex items-center space-x-3 ${step === 'results' ? 'text-emerald-400' : 'text-slate-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                  step === 'results' ? 'bg-emerald-800 text-emerald-300 ring-4 ring-emerald-800/30' : 
                  'bg-slate-700 text-slate-400'
                }`}>
                  {step === 'results' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  ) : '3'}
                </div>
                <span className="font-semibold">Results</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="max-w-6xl mx-auto">
            {step === 'select' && (
              <div className="space-y-6">
                <RepoSelector
                  onReposSelected={setSelectedRepos}
                  isLoading={isStarting}
                  initialSelectedRepos={selectedRepos}
                />

                {selectedRepos.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border border-slate-600/60 shadow-lg shadow-slate-900/40 p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Scan Configuration</h3>
                        <p className="text-slate-300">Customize your scan settings for optimal results</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-3">
                          Scan Depth
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="relative">
                            <input
                              type="radio"
                              name="depth"
                              value="full"
                              checked={scanDepth === 'full'}
                              onChange={(e) => setScanDepth(e.target.value as 'full')}
                              className="sr-only"
                              disabled={isStarting}
                            />
                            <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              scanDepth === 'full' 
                                ? 'border-indigo-400 bg-indigo-900/30 text-indigo-300' 
                                : 'border-slate-600 bg-slate-800 hover:border-indigo-500 text-slate-300'
                            } ${isStarting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <div className="flex items-start space-x-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                                  scanDepth === 'full' ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'
                                }`}>
                                  {scanDepth === 'full' && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold">Full Scan</div>
                                  <div className="text-sm opacity-75 mt-1">Comprehensive analysis of all manifest files and dependencies</div>
                                </div>
                              </div>
                            </div>
                          </label>
                          
                          <label className="relative">
                            <input
                              type="radio"
                              name="depth"
                              value="incremental"
                              checked={scanDepth === 'incremental'}
                              onChange={(e) => setScanDepth(e.target.value as 'incremental')}
                              className="sr-only"
                              disabled={isStarting}
                            />
                            <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              scanDepth === 'incremental' 
                                ? 'border-indigo-400 bg-indigo-900/30 text-indigo-300' 
                                : 'border-slate-600 bg-slate-800 hover:border-indigo-500 text-slate-300'
                            } ${isStarting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <div className="flex items-start space-x-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                                  scanDepth === 'incremental' ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'
                                }`}>
                                  {scanDepth === 'incremental' && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold">Incremental Scan</div>
                                  <div className="text-sm opacity-75 mt-1">Quick scan focusing on recently changed files</div>
                                </div>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          onClick={handleStartScan}
                          disabled={selectedRepos.length === 0 || isStarting}
                          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-3 shadow-lg shadow-indigo-500/25 transform hover:scale-105"
                        >
                          {isStarting ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Starting Scan...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414-1.414L9 5.586 7.707 4.293a1 1 0 00-1.414 1.414L7.586 7l-1.293 1.293a1 1 0 101.414 1.414L9 8.414l2.293 2.293a1 1 0 001.414-1.414z"/>
                              </svg>
                              <span>Start Comprehensive Scan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'scanning' && currentRunId && (
              <ScanProgress
                runId={currentRunId}
                onComplete={handleScanComplete}
              />
            )}

            {step === 'results' && scanResults && (
              <ScanResultsView
                results={scanResults}
                onNewScan={handleNewScan}
              />
            )}

            {step === 'results' && !scanResults && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center text-slate-400">
                <p>No scan results available. Please try scanning again.</p>
                <p className="text-xs mt-2">Debug: step={step}, hasResults={!!scanResults}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
