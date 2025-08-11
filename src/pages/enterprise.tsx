import Link from 'next/link';

export default function Enterprise() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl mb-8">
            <span className="text-white text-3xl">🏢</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent mb-6">
            Enterprise Solutions
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Scale your dependency management with enterprise-grade features, security, and support.
          </p>
        </div>

        {/* Coming Soon Section */}
        <div className="text-center">
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 shadow-2xl max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">🚧</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Enterprise Features Coming Soon</h2>
            <p className="text-slate-300 mb-8 leading-relaxed">
              We're building powerful enterprise features including advanced security scanning, 
              compliance reporting, team management, custom integrations, dedicated support, 
              and on-premises deployment options.
            </p>
            <div className="space-y-4">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300"
              >
                Back to Home
              </Link>
              <div className="text-sm text-slate-500">
                Expected launch: Q4 2025
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
