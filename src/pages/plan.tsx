import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Library {
  name: string
  currentVersion: string
  latestVersion: string
}

interface PlanStep {
  lib: string
  from: string
  to: string
  rationale: string
  diff: string
  testCommand: string
}

interface PlanData {
  project: string
  steps: PlanStep[]
}

export default function Plan() {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diffVisible, setDiffVisible] = useState<boolean[]>([]);
  const [testResults, setTestResults] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get libraries from localStorage (from dashboard)
      const storedLibraries = localStorage.getItem('selectedLibraries');
      const storedProject = localStorage.getItem('projectName') || 'My Project';
      
      let libraries: Library[] = [];
      
      if (storedLibraries) {
        const parsedLibs = JSON.parse(storedLibraries);
        // Transform stored library data to the format expected by the API
        libraries = parsedLibs.map((lib: any) => ({
          name: lib.name,
          currentVersion: lib.currentVersion || lib.version || '1.0.0',
          latestVersion: lib.latestVersion || lib.targetVersion || '2.0.0'
        }));
      } else {
        // Enhanced mock data for development - more realistic scenarios
        const mockScenarios = [
          // React/Next.js project
          [
            { name: 'react', currentVersion: '17.0.2', latestVersion: '18.2.0' },
            { name: 'next', currentVersion: '12.3.4', latestVersion: '14.1.0' },
            { name: 'typescript', currentVersion: '4.9.5', latestVersion: '5.3.3' },
            { name: 'eslint', currentVersion: '8.28.0', latestVersion: '8.56.0' },
            { name: 'tailwindcss', currentVersion: '3.2.7', latestVersion: '3.4.1' }
          ],
          // Spring Boot project
          [
            { name: 'spring-boot-starter', currentVersion: '2.7.8', latestVersion: '3.2.0' },
            { name: 'spring-security', currentVersion: '5.7.5', latestVersion: '6.2.1' },
            { name: 'hibernate-core', currentVersion: '5.6.15', latestVersion: '6.4.1' },
            { name: 'junit', currentVersion: '4.13.2', latestVersion: '5.10.1' }
          ],
          // Node.js utilities project
          [
            { name: 'express', currentVersion: '4.18.2', latestVersion: '4.18.2' },
            { name: 'lodash', currentVersion: '4.17.19', latestVersion: '4.17.21' },
            { name: 'axios', currentVersion: '0.27.2', latestVersion: '1.6.5' },
            { name: 'moment', currentVersion: '2.29.4', latestVersion: '2.30.1' },
            { name: 'jest', currentVersion: '28.1.3', latestVersion: '29.7.0' }
          ],
          // Python Django project
          [
            { name: 'Django', currentVersion: '3.2.16', latestVersion: '4.2.7' },
            { name: 'django-rest-framework', currentVersion: '3.14.0', latestVersion: '3.14.0' },
            { name: 'celery', currentVersion: '5.2.7', latestVersion: '5.3.4' },
            { name: 'redis', currentVersion: '4.5.1', latestVersion: '5.0.1' }
          ]
        ];
        
        // Select a random scenario or use based on stored project name/type
        const scenarioIndex = Math.floor(Math.random() * mockScenarios.length);
        libraries = mockScenarios[scenarioIndex];
      }

      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          libs: libraries,
          project: storedProject
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate upgrade plan');
      }

      const data = await response.json();
      setPlanData(data);
      setDiffVisible(new Array(data.steps.length).fill(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleDiff = (index: number) => {
    setDiffVisible(prev => {
      const newVisible = [...prev];
      newVisible[index] = !newVisible[index];
      return newVisible;
    });
  };

  const runTest = async (testCommand: string, stepLib: string) => {
    setTestResults(prev => ({ ...prev, [stepLib]: 'Running...' }));
    
    // Simulate more realistic test execution with varied timing and results
    const testDuration = Math.random() * 3000 + 1000; // 1-4 seconds
    
    setTimeout(() => {
      // More sophisticated success/failure logic based on library characteristics
      let successRate = 0.8; // Base 80% success rate
      
      // Adjust success rate based on library type and version jump
      const libName = stepLib.toLowerCase();
      if (libName.includes('test') || libName.includes('jest') || libName.includes('junit')) {
        successRate = 0.95; // Testing libraries usually upgrade smoothly
      } else if (libName.includes('react') || libName.includes('spring') || libName.includes('django')) {
        successRate = 0.65; // Framework upgrades are more risky
      } else if (libName.includes('typescript') || libName.includes('eslint')) {
        successRate = 0.75; // Dev tools have moderate risk
      }
      
      const success = Math.random() < successRate;
      
      const messages = {
        success: [
          '✅ All tests passed',
          '✅ Tests passed successfully', 
          '✅ No issues detected',
          '✅ Upgrade validated',
          '✅ All checks passed'
        ],
        failure: [
          '❌ 3 tests failed',
          '❌ Breaking changes detected',
          '❌ Type errors found',
          '❌ Integration tests failed',
          '❌ Compatibility issues'
        ]
      };
      
      const messageArray = success ? messages.success : messages.failure;
      const message = messageArray[Math.floor(Math.random() * messageArray.length)];
      
      setTestResults(prev => ({
        ...prev,
        [stepLib]: message
      }));
    }, testDuration);
  };

  const handleApplyAll = async () => {
    alert('Apply All functionality would be implemented here. This would execute all upgrade steps automatically.');
  };

  const handleExportScript = () => {
    if (!planData) return;

    const script = planData.steps.map((step, index) => 
      `# Step ${index + 1}: ${step.lib} ${step.from} → ${step.to}\n# ${step.rationale}\n${step.testCommand}\n`
    ).join('\n');

    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${planData.project}-upgrade-plan.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <h2 className="text-2xl font-semibold text-gray-900 mt-4">Generating AI-Powered Upgrade Plan</h2>
            <p className="text-gray-600 mt-2">Our AI is analyzing your dependencies and creating an optimal upgrade strategy...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error generating plan</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button 
                  onClick={fetchPlanData}
                  className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">No Plan Data</h1>
          <p className="text-gray-600">Please go back to the dashboard and select libraries to upgrade.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Upgrade Plan for {planData.project}
          </h1>
          <p className="text-gray-600">
            AI-generated step-by-step upgrade strategy optimized for minimal breaking changes
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          {planData.steps.map((step, index) => (
            <motion.div
              key={step.lib}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white shadow-lg rounded-2xl p-6 border border-gray-100"
            >
              {/* Step Header */}
              <div className="flex items-center mb-3">
                <span className="bg-indigo-100 text-indigo-600 rounded-full px-3 py-1 font-bold text-sm">
                  {index + 1}
                </span>
                <h3 className="ml-3 font-semibold text-lg text-gray-900">
                  {step.lib}: <span className="text-red-600">{step.from}</span> → <span className="text-green-600">{step.to}</span>
                </h3>
              </div>

              {/* Rationale */}
              <p className="text-gray-600 mb-4">{step.rationale}</p>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 mb-4">
                <button
                  onClick={() => toggleDiff(index)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  {diffVisible[index] ? 'Hide Diff' : 'Preview Diff'}
                </button>
                <button
                  onClick={() => runTest(step.testCommand, step.lib)}
                  disabled={testResults[step.lib] === 'Running...'}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testResults[step.lib] === 'Running...' ? 'Running...' : 'Run Tests'}
                </button>
                {testResults[step.lib] && testResults[step.lib] !== 'Running...' && (
                  <span className="text-sm">
                    {testResults[step.lib]}
                  </span>
                )}
              </div>

              {/* Diff Display */}
              <AnimatePresence>
                {diffVisible[index] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <pre className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-auto border">
                      {step.diff}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleApplyAll}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 py-3 font-medium transition-colors shadow-lg"
          >
            🚀 Apply All Steps
          </button>
          <button
            onClick={handleExportScript}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl px-6 py-3 font-medium transition-colors shadow-lg"
          >
            📄 Export Script
          </button>
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Upgrade Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{planData.steps.length}</div>
              <div className="text-sm text-gray-600">Total Steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(testResults).filter(result => result.includes('✅')).length}
              </div>
              <div className="text-sm text-gray-600">Tests Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ~{planData.steps.length * 15}min
              </div>
              <div className="text-sm text-gray-600">Estimated Time</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
