import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // For now, accept the dummy email and simulate authentication
    if (email === 'pramitha.perera@cognizant.com') {
      try {
        // Create a mock session by calling a custom credential signin
        const result = await signIn('credentials', {
          email: email,
          redirect: false,
        });
        
        if (result?.ok) {
          router.push('/dashboard');
        } else {
          // Fallback: direct redirect for demo purposes
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        }
      } catch (error) {
        // Fallback: direct redirect for demo purposes
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } else {
      alert('Please use the dummy email: pramitha.perera@cognizant.com');
      setIsLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: string) => {
    const providerIds: { [key: string]: string } = {
      'Google': 'google',
      'GitHub': 'github',
      'GitLab': 'gitlab', // Will show "coming soon" for now
      'Bitbucket': 'bitbucket', // Will show "coming soon" for now
      'Azure DevOps': 'azure-ad'
    };
    
    const providerId = providerIds[provider];
    if (providerId && ['google', 'github', 'azure-ad'].includes(providerId)) {
      await signIn(providerId, { callbackUrl: '/dashboard' });
    } else {
      // For providers not yet configured (GitLab, Bitbucket)
      alert(`${provider} sign-in coming soon! We're working on integrating this provider.`);
    }
  };

  const providers = [
    { name: 'Google', icon: '🔍', color: 'from-red-500 to-red-600' },
    { name: 'GitHub', icon: '🐙', color: 'from-gray-700 to-gray-800' },
    { name: 'GitLab', icon: '🦊', color: 'from-orange-500 to-orange-600' },
    { name: 'Bitbucket', icon: '🪣', color: 'from-blue-600 to-blue-700' },
    { name: 'Azure DevOps', icon: '☁️', color: 'from-blue-500 to-blue-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3 group mb-6">
            <div className="relative">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl shadow-lg group-hover:shadow-cyan-500/25 transition-all duration-300">
                <span className="text-white font-bold text-2xl">C</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                CodeCare-AI
              </span>
              <span className="text-sm text-blue-200/80 font-medium -mt-1">
                AI-Powered Software Upgrade Assistant
              </span>
            </div>
          </Link>
          
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Sign in to your account to continue</p>
        </div>

        {/* Sign In Form */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Email Sign In */}
          <form onSubmit={handleEmailSignIn} className="mb-8">
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                required
              />
              <p className="text-xs text-slate-400 mt-2">
                For demo, use: pramitha.perera@cognizant.com
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Next'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-800/60 text-slate-400">Or continue with</span>
            </div>
          </div>

          {/* Provider Sign In */}
          <div className="space-y-3">
            {providers.map((provider) => (
              <button
                key={provider.name}
                onClick={() => handleProviderSignIn(provider.name)}
                className={`w-full flex items-center justify-center space-x-3 px-4 py-3 bg-gradient-to-r ${provider.color} text-white font-semibold rounded-xl shadow-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300`}
              >
                <span className="text-lg">{provider.icon}</span>
                <span>Continue with {provider.name}</span>
              </button>
            ))}
          </div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors duration-300"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
