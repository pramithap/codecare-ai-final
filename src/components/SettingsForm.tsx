import React, { useState } from 'react';

interface SettingsFormProps {
  onSave?: (settings: Record<string, any>) => void;
}

export default function SettingsForm({ onSave }: SettingsFormProps) {
  const [settings, setSettings] = useState({
    autoUpgrade: false,
    includePrerelease: false,
    vulnerabilityCheck: true,
    backupBeforeUpgrade: true,
    notificationEmail: '',
    maxUpgradeRisk: 'medium' as 'low' | 'medium' | 'high',
    preferredRegistries: {
      npm: true,
      maven: false,
      cpan: false,
    },
    aiModel: 'gpt-4' as 'gpt-4' | 'gpt-3.5-turbo' | 'claude',
  });

  const handleToggleChange = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const handleSelectChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRegistryChange = (registry: string) => {
    setSettings(prev => ({
      ...prev,
      preferredRegistries: {
        ...prev.preferredRegistries,
        [registry]: !prev.preferredRegistries[registry as keyof typeof prev.preferredRegistries]
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave(settings);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
          Application Settings
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">General</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto Upgrade</label>
                  <p className="text-sm text-gray-500">Automatically apply low-risk upgrades</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('autoUpgrade')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoUpgrade ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoUpgrade ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Include Prerelease</label>
                  <p className="text-sm text-gray-500">Consider beta and RC versions</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('includePrerelease')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.includePrerelease ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.includePrerelease ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Vulnerability Check</label>
                  <p className="text-sm text-gray-500">Scan for security vulnerabilities</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('vulnerabilityCheck')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.vulnerabilityCheck ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.vulnerabilityCheck ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Risk Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Risk Management</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Upgrade Risk
                </label>
                <select
                  value={settings.maxUpgradeRisk}
                  onChange={(e) => handleSelectChange('maxUpgradeRisk', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low Risk Only</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">All Risks</option>
                </select>
              </div>
            </div>
          </div>

          {/* Registry Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Preferred Registries</h4>
            <div className="space-y-2">
              {Object.entries(settings.preferredRegistries).map(([registry, enabled]) => (
                <div key={registry} className="flex items-center">
                  <input
                    type="checkbox"
                    id={registry}
                    checked={enabled}
                    onChange={() => handleRegistryChange(registry)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={registry} className="ml-2 text-sm text-gray-700 capitalize">
                    {registry}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* AI Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">AI Configuration</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <select
                value={settings.aiModel}
                onChange={(e) => handleSelectChange('aiModel', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude">Claude</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
