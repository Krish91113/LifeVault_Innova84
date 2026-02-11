// file: src/components/layout/DashboardNavbar.tsx

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { getInitials } from '@/services/api';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { WalletAuthModal } from '@/components/wallet/WalletAuthModal';
import {
  Vault,
  LayoutDashboard,
  Shield,
  Heart,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
  Map,
  Trophy,
  History,
  ChevronDown,
  User,
  Bell,
} from 'lucide-react';

const navLinks = [
  { path: '/dashboard', label: 'Timeline', icon: LayoutDashboard },
  { path: '/quests', label: 'Quests', icon: Map },
  { path: '/campaigns', label: 'Campaigns', icon: Trophy },
  { path: '/quest-history', label: 'History', icon: History },
  { path: '/privacy', label: 'Privacy', icon: Shield },
  { path: '/legacy', label: 'Legacy', icon: Heart },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const DashboardNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { connected } = useWallet();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLinkWalletModal, setShowLinkWalletModal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const hasLinkedWallet = user?.aptosAddress && user.aptosAddress.length > 0;

  return (
    <>
      {/* Main Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-200/50'
          : 'bg-white border-b border-gray-100'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">

            {/* Logo */}
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 flex-shrink-0 group"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-300">
                  <Vault className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity -z-10"></div>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-extrabold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                  LifeVault
                </span>
                <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 rounded-full"></div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              <div className="flex items-center bg-gray-100/80 rounded-2xl p-1.5 gap-1">
                {navLinks.slice(0, 5).map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${active
                        ? 'bg-white text-gray-900 shadow-md shadow-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : ''}`} />
                      <span>{link.label}</span>
                      {active && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"></span>
                      )}
                    </Link>
                  );
                })}

                {/* More dropdown for remaining links */}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-white/50 transition-all">
                    <span>More</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200/50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    {navLinks.slice(5).map((link) => {
                      const Icon = link.icon;
                      const active = isActive(link.path);
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${active
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">

              {/* Notification Bell - Desktop */}
              <button className="hidden sm:flex relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>

              {/* Wallet Button */}
              {hasLinkedWallet || connected ? (
                <div className="hidden sm:block">
                  <ConnectWalletButton variant="ghost" size="sm" />
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkWalletModal(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Link Wallet</span>
                </button>
              )}

              {/* User Menu - Desktop */}
              <div className="hidden md:block relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl hover:bg-gray-100 transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                    {getInitials(user?.name || user?.email)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-semibold text-gray-900 leading-tight max-w-[100px] truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 leading-tight max-w-[100px] truncate">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold">
                            {getInitials(user?.name || user?.email)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 pt-2">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              >
                <div className="relative w-6 h-6">
                  <span className={`absolute left-0 block w-6 h-0.5 bg-current transform transition-all duration-300 ${mobileMenuOpen ? 'top-3 rotate-45' : 'top-1'}`}></span>
                  <span className={`absolute left-0 top-3 block w-6 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                  <span className={`absolute left-0 block w-6 h-0.5 bg-current transform transition-all duration-300 ${mobileMenuOpen ? 'top-3 -rotate-45' : 'top-5'}`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-50 lg:hidden transform transition-transform duration-300 ease-out shadow-2xl ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              {getInitials(user?.name || user?.email)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Navigation Links */}
          <div className="space-y-1 mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Navigation</p>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${active
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Wallet Section */}
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Wallet</p>
            {hasLinkedWallet || connected ? (
              <div className="px-3">
                <ConnectWalletButton variant="outline" size="md" className="w-full justify-center" />
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLinkWalletModal(true);
                }}
                className="flex items-center justify-center gap-3 w-full px-4 py-3.5 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors"
              >
                <Wallet className="w-5 h-5" />
                <span>Link Wallet</span>
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <User className="w-6 h-6 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Profile</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="relative flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-3 right-1/2 translate-x-4 w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-sm font-semibold text-gray-700">Alerts</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className="flex items-center justify-center gap-3 w-full px-4 py-3.5 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Spacer to prevent content overlap */}
      <div className="h-16 lg:h-18"></div>

      {/* Wallet Modal */}
      <WalletAuthModal
        isOpen={showLinkWalletModal}
        onClose={() => setShowLinkWalletModal(false)}
        mode="link"
      />
    </>
  );
};