import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { useHasMounted } from '../hooks/useHasMounted';

const Navbar = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const hasMounted = useHasMounted();
  
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigation items for authenticated users
  const authenticatedNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Repositories', href: '/repos', icon: '📚' },
    { name: 'New Scan', href: '/scanNew', icon: '🔍' },
    { name: 'Compatibility', href: '/compatibility', icon: '🔗' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  // Navigation items for non-authenticated users
  const publicNavItems = [
    { name: 'Platform', href: '/platform', icon: '🚀' },
    { name: 'Pricing', href: '/pricing', icon: '💰' },
    { name: 'Solutions', href: '/solutions', icon: '💡' },
    { name: 'Enterprise', href: '/enterprise', icon: '🏢' },
    { name: 'Developers', href: '/developers', icon: '👩‍💻' },
    { name: 'Resources', href: '/resources', icon: '📖' },
  ];

  // Choose navigation items based on authentication status
  // Show public nav while loading or not mounted to prevent hydration mismatch
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const navItems = (!hasMounted || isLoading) ? publicNavItems : (isAuthenticated ? authenticatedNavItems : publicNavItems);

  const isActive = (href: string) => {
    return router.pathname === href;
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900 backdrop-blur-lg border-b border-white/10 shadow-2xl">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Enhanced Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl shadow-lg group-hover:shadow-cyan-500/25 transition-all duration-300 group-hover:scale-105">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent group-hover:from-cyan-200 group-hover:to-blue-200 transition-all duration-300 whitespace-nowrap">
                  CodeCare-AI
                </span>
                <span className="text-xs text-blue-200/80 font-medium -mt-1 whitespace-nowrap">
                  AI-Powered Software Upgrade Assistant
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation and Auth Section */}
          <div className="flex items-center space-x-6">
            {/* Enhanced Navigation Links */}
            <div className="hidden md:flex items-center space-x-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${
                    isActive(item.href)
                      ? 'bg-white/20 text-white shadow-lg shadow-white/10 backdrop-blur-sm'
                      : 'text-blue-100/80 hover:text-white hover:bg-white/10 backdrop-blur-sm'
                  }`}
                >
                  {isActive(item.href) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur-sm"></div>
                  )}
                  <span className="text-lg relative z-10">{item.icon}</span>
                  <span className="relative z-10">{item.name}</span>
                  {isActive(item.href) && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"></div>
                  )}
                </Link>
              ))}
            </div>

            {/* Authentication UI */}
            <div className="flex items-center">
              {!hasMounted || isLoading ? (
                <span className="text-sm text-blue-200/60">Loading...</span>
              ) : !isAuthenticated ? (
                <Link href="/auth/signin">
                  <button
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300 whitespace-nowrap"
                    aria-label="Sign in"
                    data-testid="signin-btn"
                  >
                    Sign in
                  </button>
                </Link>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm whitespace-nowrap"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-sm text-white font-medium hidden sm:block">
                      {session?.user?.name || session?.user?.email || 'User'}
                    </span>
                    <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <>
                      {/* Backdrop to close menu */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setMenuOpen(false)}
                      />
                      <div
                        className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 shadow-2xl z-20"
                        role="menu"
                      >
                        <div className="p-2">
                          <Link
                            href="/dashboard"
                            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                          >
                            <span>📊</span>
                            <span>Dashboard</span>
                          </Link>
                          <div className="mt-1">
                            <button
                              onClick={() => signOut({ callbackUrl: '/' })}
                              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                            >
                              <span>👤</span>
                              <span>{session?.user?.name || session?.user?.email}</span>
                            </button>
                            <button
                              onClick={() => signOut({ callbackUrl: '/' })}
                              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-900/20 rounded-lg transition-all duration-200 mt-1"
                            >
                              <span>🚪</span>
                              <span>Sign out</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Mobile menu button */}
          <div className="md:hidden flex items-center space-x-3">
            {/* Mobile Authentication */}
            {!hasMounted || isLoading ? (
              <span className="text-xs text-blue-200/60">...</span>
            ) : !isAuthenticated ? (
              <Link href="/auth/signin">
                <button
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg text-sm whitespace-nowrap"
                  aria-label="Sign in"
                >
                  Sign in
                </button>
              </Link>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-all duration-300"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <div className="w-6 h-6 relative">
                <span className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${menuOpen ? 'rotate-45 top-3' : 'top-1'}`}></span>
                <span className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${menuOpen ? 'opacity-0' : 'top-3'}`}></span>
                <span className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${menuOpen ? '-rotate-45 top-3' : 'top-5'}`}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Enhanced Mobile menu */}
        {menuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-slate-800/50 backdrop-blur-sm border-t border-white/10 rounded-b-xl mt-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-blue-100/80 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
              {isAuthenticated && (
                <div className="mt-2 border-t border-slate-700/50 pt-2">
                  <div className="px-4 py-3 rounded-xl text-base font-medium text-blue-100/80 w-full">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="text-white">{session?.user?.name || session?.user?.email}</span>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="flex items-center space-x-2 w-full px-2 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-900/20 rounded-lg transition-all duration-200"
                    >
                      <span>🚪</span>
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
