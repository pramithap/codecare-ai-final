import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;

  const getErrorMessage = (error: string | string[] | undefined) => {
    if (!error) return 'An unknown error occurred';
    
    const errorString = Array.isArray(error) ? error[0] : error;
    
    switch (errorString) {
      case 'Configuration':
        return 'Server configuration issue. Please contact support.';
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.';
      case 'Verification':
        return 'Unable to sign in. Please try again.';
      case 'OAuthSignin':
        return 'Error occurred during OAuth sign in process.';
      case 'OAuthCallback':
        return 'Error in OAuth callback. Please try again.';
      case 'OAuthCreateAccount':
        return 'Could not create account. Please contact support.';
      case 'EmailCreateAccount':
        return 'Could not create account with email. Please contact support.';
      case 'Callback':
        return 'Error in callback. Please try again.';
      case 'OAuthAccountNotLinked':
        return 'Account not linked. Please use the same provider you used previously.';
      case 'EmailSignin':
        return 'Unable to send sign in email. Please try again.';
      case 'CredentialsSignin':
        return 'Invalid credentials. Please check your email and try again.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      default:
        return `Authentication error: ${errorString}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl">⚠️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Authentication Error</h1>
          <p className="text-slate-400">Something went wrong during sign in</p>
        </div>

        {/* Error Details */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Error Details</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {getErrorMessage(error)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300"
            >
              Try Again
            </Link>
            
            <Link
              href="/"
              className="block w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-slate-300 font-semibold rounded-xl hover:bg-slate-700/70 transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Support Info */}
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-2">
            If the problem persists, please contact support
          </p>
          <p className="text-xs text-slate-600">
            Error Code: {error || 'UNKNOWN'}
          </p>
        </div>
      </div>
    </div>
  );
}
