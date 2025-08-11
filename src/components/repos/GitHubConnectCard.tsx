'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cx } from '../../lib/classnames';
import type { PATValidationResponse } from '../../types/repos';

const patSchema = z.object({
  pat: z.string().min(1, 'Personal Access Token is required'),
});

type PatFormData = z.infer<typeof patSchema>;

interface GitHubConnectCardProps {
  onValidated?: () => void;
  className?: string;
}

export function GitHubConnectCard({ onValidated, className }: GitHubConnectCardProps) {
  const [showPat, setShowPat] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<PATValidationResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatFormData>({
    resolver: zodResolver(patSchema),
  });

  const handleValidate = async (data: PatFormData) => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/integrations/github/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pat: data.pat }),
      });

      const result: PATValidationResponse = await response.json();
      setValidationResult(result);

      if (result.valid && onValidated) {
        onValidated();
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        error: 'Network error. Please try again.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className={cx(
      'bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300',
      className
    )}>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">
            Connect GitHub
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Use a Personal Access Token to import repositories
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleValidate)} className="space-y-4">
        <div>
          <label htmlFor="pat" className="block text-sm font-medium text-slate-300 mb-2">
            Personal Access Token
          </label>
          <div className="relative">
            <input
              {...register('pat')}
              id="pat"
              type={showPat ? 'text' : 'password'}
              data-testid="pat-input"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className={cx(
                'block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                errors.pat
                  ? 'border-red-400'
                  : 'border-slate-600',
                'bg-slate-700 text-white placeholder-slate-400'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPat(!showPat)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-300"
            >
              {showPat ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.pat && (
            <p className="mt-1 text-sm text-red-400">
              {errors.pat.message}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Create a token at{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              github.com/settings/tokens
            </a>{' '}
            with <code className="px-1 py-0.5 bg-slate-700 text-slate-200 rounded text-xs">repo</code> scope
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isValidating}
            data-testid="validate-pat-btn"
            className={cx(
              'flex-1 px-4 py-2 text-sm font-medium rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
              isValidating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            )}
          >
            {isValidating ? 'Validating...' : 'Validate & Load Repos'}
          </button>
          
          {validationResult?.valid && (
            <button
              type="button"
              data-testid="add-from-github-btn"
              className="px-4 py-2 text-sm font-medium text-indigo-300 bg-indigo-900/20 border border-indigo-800 rounded-md hover:bg-indigo-900/30 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add from GitHub
            </button>
          )}
        </div>
      </form>

      {/* Validation Result */}
      {validationResult && (
        <div className={cx(
          'mt-4 p-3 rounded-md',
          validationResult.valid
            ? 'bg-green-900/20 border border-green-800'
            : 'bg-red-900/20 border border-red-800'
        )}>
          <div className="flex items-start gap-2">
            {validationResult.valid ? (
              <CheckIcon className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              {validationResult.valid ? (
                <div>
                  <p className="text-sm font-medium text-green-200">
                    Connected successfully!
                  </p>
                  {validationResult.user && (
                    <p className="text-sm text-green-300 mt-1">
                      Authenticated as <strong>{validationResult.user.login}</strong>
                      {validationResult.user.name && ` (${validationResult.user.name})`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-red-200">
                  {validationResult.error || 'Validation failed'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
