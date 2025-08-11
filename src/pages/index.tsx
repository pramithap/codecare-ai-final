import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-purple-800/20"></div>
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)",
              backgroundSize: "20px 20px"
            }}
          ></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            {/* Logo/Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-400 rounded-2xl flex items-center justify-center shadow-2xl">
                <span className="text-3xl font-bold text-white">🚀</span>
              </div>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6 leading-tight">
              CodeCare AI
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-300 font-light mb-4 max-w-3xl mx-auto leading-relaxed">
              AI-Powered Dependency Upgrade Assistant
            </p>
            
            {/* Description */}
            <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Streamline your dependency management with intelligent analysis, compatibility checking, 
              and automated upgrade planning across multiple programming languages.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              {status === 'loading' ? (
                <div className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl opacity-50 text-lg">
                  Loading...
                </div>
              ) : status === 'authenticated' ? (
                <Link 
                  href="/dashboard"
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 text-lg"
                >
                  🎯 Go to Dashboard
                </Link>
              ) : (
                <Link href="/auth/signin">
                  <button className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 text-lg">
                    🎯 Get Started
                  </button>
                </Link>
              )}
              <Link 
                href="/repos"
                className="px-8 py-4 bg-slate-800/80 backdrop-blur-sm border border-slate-600 text-slate-200 font-semibold rounded-xl hover:bg-slate-700/80 transition-all duration-300 text-lg"
              >
                📚 Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
            Powerful Features
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Everything you need to keep your dependencies secure, up-to-date, and compatible
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Multi-Language Support */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/80 transition-all duration-300 group">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🌐</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Multi-Language Support</h3>
            <p className="text-slate-400 leading-relaxed">
              Support for NPM, Maven, Gradle, CPAN, Ant, and more. Analyze dependencies across different technology stacks.
            </p>
          </div>

          {/* AI-Powered Analysis */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/80 transition-all duration-300 group">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">AI-Powered Analysis</h3>
            <p className="text-slate-400 leading-relaxed">
              Intelligent compatibility analysis and risk assessment powered by advanced AI algorithms.
            </p>
          </div>

          {/* Security Scanning */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/80 transition-all duration-300 group">
            <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Security Scanning</h3>
            <p className="text-slate-400 leading-relaxed">
              Identify security vulnerabilities and EOL packages to keep your applications secure.
            </p>
          </div>

          {/* Automated Planning */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/80 transition-all duration-300 group">
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Automated Planning</h3>
            <p className="text-slate-400 leading-relaxed">
              Generate step-by-step upgrade plans with detailed compatibility analysis and risk assessment.
            </p>
          </div>

          {/* Repository Integration */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/80 transition-all duration-300 group">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Repository Integration</h3>
            <p className="text-slate-400 leading-relaxed">
              Connect with GitHub, GitLab, Bitbucket, and Azure DevOps. Upload ZIP files or scan directly from repositories.
            </p>
          </div>

          {/* Interactive Chat */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/80 transition-all duration-300 group">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Interactive Chat</h3>
            <p className="text-slate-400 leading-relaxed">
              Get instant answers about dependencies, compatibility issues, and upgrade recommendations through AI chat.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="relative bg-slate-800/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Simple, streamlined workflow to upgrade your dependencies safely
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Connect & Scan</h3>
              <p className="text-slate-400 leading-relaxed">
                Connect your repositories or upload project files. Our AI scans and identifies all dependencies automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Analyze & Plan</h3>
              <p className="text-slate-400 leading-relaxed">
                AI analyzes compatibility, security issues, and EOL status. Generate intelligent upgrade plans with risk assessment.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Execute & Monitor</h3>
              <p className="text-slate-400 leading-relaxed">
                Follow step-by-step upgrade plans with confidence. Monitor progress and get real-time assistance through AI chat.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border border-slate-600/50 rounded-3xl p-12">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent mb-6">
              Ready to Upgrade Smarter?
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Join the revolution in dependency management. Let AI help you keep your projects secure, up-to-date, and compatible.
            </p>
            <Link 
              href="/dashboard"
              className="inline-flex items-center px-10 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 text-lg"
            >
              🚀 Start Your First Scan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}