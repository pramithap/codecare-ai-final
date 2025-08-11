'use client';

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cx, formatFileSize } from '../../lib/classnames';
import type { UploadInitResponse, CreateRepoRequest } from '../../types/repos';

const zipSchema = z.object({
  repoName: z.string()
    .min(1, 'Repository name is required'),
  defaultBranch: z.string().min(1, 'Default branch is required'),
});

type ZipFormData = z.infer<typeof zipSchema>;

interface ZipUploadCardProps {
  onSuccess?: () => void;
  className?: string;
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export function ZipUploadCard({ onSuccess, className }: ZipUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ZipFormData>({
    resolver: zodResolver(zipSchema),
    defaultValues: {
      defaultBranch: 'main',
    },
  });

  const repoName = watch('repoName');

  const validateFile = useCallback((selectedFile: File): string | null => {
    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      return 'Please select a ZIP file';
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`;
    }

    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);

    // Auto-populate repo name from filename if empty
    if (!repoName) {
      const nameFromFile = selectedFile.name
        .replace(/\.zip$/i, '')
        .toLowerCase();
      setValue('repoName', nameFromFile);
    }
  }, [repoName, setValue, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(selectedFiles[0]);
    }
  }, [handleFileSelect]);

  const uploadFile = async (file: File, uploadUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', 'application/zip');
      xhr.send(file);
    });
  };

  const handleUpload = async (data: ZipFormData) => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      // Initialize upload
      const initResponse = await fetch('/api/upload/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.error || 'Failed to initialize upload');
      }

      const uploadInit: UploadInitResponse = await initResponse.json();

      // Upload file
      await uploadFile(file, uploadInit.uploadUrl);

      // Register repository
      const createRepoData: CreateRepoRequest = {
        provider: 'zip',
        name: data.repoName,
        defaultBranch: data.defaultBranch,
        uploadId: uploadInit.uploadId,
      };

      const createResponse = await fetch('/api/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createRepoData),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to register repository');
      }

      setSuccess(`Repository "${data.repoName}" added successfully!`);
      setFile(null);
      setUploadProgress(0);
      
      // Reset form
      setValue('repoName', '');
      setValue('defaultBranch', 'main');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setError(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className={cx(
      'bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-600/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300',
      className
    )}>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <CloudArrowUpIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">
            Upload ZIP
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Upload a repository as a ZIP file
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleUpload)} className="space-y-4">
        {/* File Drop Zone */}
        <div
          data-testid="zip-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cx(
            'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragOver
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : file
              ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-2">
            {file ? (
              <>
                <DocumentIcon className="mx-auto h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {file.name}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="mx-auto h-8 w-8 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Drop your ZIP file here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400">
                    Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Repository Name */}
        <div>
          <label htmlFor="repoName" className="block text-sm font-medium text-slate-300 mb-2">
            Repository Name
          </label>
          <input
            {...register('repoName')}
            id="repoName"
            type="text"
            data-testid="zip-name-input"
            placeholder="my-awesome-project"
            className={cx(
              'block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              errors.repoName
                ? 'border-red-400'
                : 'border-slate-600',
              'bg-slate-700 text-white placeholder-slate-400'
            )}
          />
          {errors.repoName && (
            <p className="mt-1 text-sm text-red-400">
              {errors.repoName.message}
            </p>
          )}
        </div>

        {/* Default Branch */}
        <div>
          <label htmlFor="defaultBranch" className="block text-sm font-medium text-slate-300 mb-2">
            Default Branch
          </label>
          <input
            {...register('defaultBranch')}
            id="defaultBranch"
            type="text"
            data-testid="zip-branch-input"
            placeholder="main"
            className={cx(
              'block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              errors.defaultBranch
                ? 'border-red-400'
                : 'border-slate-600',
              'bg-slate-700 text-white placeholder-slate-400'
            )}
          />
          {errors.defaultBranch && (
            <p className="mt-1 text-sm text-red-400">
              {errors.defaultBranch.message}
            </p>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!file || isUploading}
          data-testid="zip-add-btn"
          className={cx(
            'w-full px-4 py-2 text-sm font-medium rounded-md focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
            !file || isUploading
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          )}
        >
          {isUploading ? 'Adding Repository...' : 'Add Repository'}
        </button>
      </form>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-red-200">
              {error}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-start gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {success}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
