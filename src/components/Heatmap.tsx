import React from 'react';

interface CompatibilityData {
  [key: string]: {
    [key: string]: 'compatible' | 'warning' | 'incompatible' | 'unknown';
  };
}

interface HeatmapProps {
  data?: CompatibilityData;
}

export default function Heatmap({ data = {} }: HeatmapProps) {
  const packages = Object.keys(data);
  
  const getColorClass = (status: string) => {
    switch (status) {
      case 'compatible':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'incompatible':
        return 'bg-red-500';
      case 'unknown':
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Compatibility Heatmap
        </h3>
        
        {packages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No compatibility data available. Run a scan to generate compatibility matrix.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span>Compatible</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                <span>Warning</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span>Incompatible</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded mr-2"></div>
                <span>Unknown</span>
              </div>
            </div>
            
            <div className="overflow-auto">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${packages.length + 1}, 1fr)` }}>
                <div></div>
                {packages.map((pkg) => (
                  <div key={pkg} className="text-xs p-2 text-center font-medium text-gray-700">
                    {pkg.substring(0, 8)}...
                  </div>
                ))}
                {packages.map((pkg1) => (
                  <React.Fragment key={pkg1}>
                    <div className="text-xs p-2 text-right font-medium text-gray-700">
                      {pkg1.substring(0, 8)}...
                    </div>
                    {packages.map((pkg2) => (
                      <div
                        key={`${pkg1}-${pkg2}`}
                        className={`w-8 h-8 ${getColorClass(data[pkg1]?.[pkg2] || 'unknown')} rounded-sm`}
                        title={`${pkg1} vs ${pkg2}: ${data[pkg1]?.[pkg2] || 'unknown'}`}
                      ></div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
