import Link from 'next/link';

export default function Resources() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl mb-8">
            <span className="text-white text-3xl">📖</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-300 to-red-300 bg-clip-text text-transparent mb-6">
            Resources & Learning
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Documentation, tutorials, best practices, and learning materials for mastering dependency management.
          </p>
        </div>

        {/* Coming Soon Section */}
        <div className="text-center">
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 shadow-2xl max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">🚧</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Learning Resources Coming Soon</h2>
            <p className="text-slate-300 mb-8 leading-relaxed">
              We're preparing a comprehensive knowledge base including tutorials, video guides, 
              best practices, case studies, webinars, and community forums. Learn everything 
              about modern dependency management and security practices.
            </p>
            <div className="space-y-4">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300"
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
