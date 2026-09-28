/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Building,
  UserPlus,
  Eye,
  EyeOff,
  Crown,
  Sparkles,
  Users,
  Copy,
  Check
} from 'lucide-react';
import { UserPersona } from '../types/security';
import { INITIAL_TEAM_CREDENTIALS, verifyCredentialsOffline } from '../data/teamMembers';

interface LoginPortalProps {
  onLoginSuccess: (user: UserPersona) => void;
  allUsers: UserPersona[];
  onRefreshUsers: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onLoginSuccess,
  allUsers,
  onRefreshUsers
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'directory'>('login');
  
  // Login form state
  const [email, setEmail] = useState<string>('admin@sarthi.sec');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Registration state for adding new team member
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [regRole, setRegRole] = useState<UserPersona['role']>('APPSEC_LEAD');
  const [regRoleTitle, setRegRoleTitle] = useState<string>('Application Security Architect');
  const [regDepartment, setRegDepartment] = useState<string>('Product Security');
  const [regAvatarColor, setRegAvatarColor] = useState<string>('bg-indigo-600');

  // Status feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Pre-fill email from team directory, but user MUST type password to log in!
  const handleSelectAccountForLogin = (targetEmail: string, suggestedPass?: string) => {
    setEmail(targetEmail);
    setPassword(suggestedPass || '');
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveTab('login');
  };

  const handleCopyCredentials = (accountEmail: string, pass: string) => {
    navigator.clipboard?.writeText(`${accountEmail} / ${pass}`);
    setCopiedAccount(accountEmail);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  // Submit Login credentials (email & password strictly required)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMsg('Please enter your corporate email address.');
      return;
    }
    if (!cleanPassword) {
      setErrorMsg('Please enter your account password. Password is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });

      const data = await res.json();

      if (data.success && data.user) {
        setSuccessMsg(`Access granted. Welcome back, ${data.user.name}!`);
        if (rememberMe) {
          localStorage.setItem('sarthi_auth_user', JSON.stringify(data.user));
          if (data.token) localStorage.setItem('sarthi_auth_token', data.token);
        }
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 500);
      } else {
        setErrorMsg(data.message || 'Authentication failed. Please verify your credentials.');
      }
    } catch {
      // In-memory / offline credential verification fallback
      const offlineResult = verifyCredentialsOffline(cleanEmail, cleanPassword);
      if (offlineResult.success && offlineResult.user) {
        setSuccessMsg(`Access granted (Offline Mode). Welcome, ${offlineResult.user.name}!`);
        if (rememberMe) {
          localStorage.setItem('sarthi_auth_user', JSON.stringify(offlineResult.user));
        }
        setTimeout(() => {
          onLoginSuccess(offlineResult.user!);
        }, 500);
      } else {
        setErrorMsg(offlineResult.error || 'Authentication error. Please check your email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add / Register new team member
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim();
    const cleanPassword = regPassword.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setErrorMsg('All fields (Full Name, Corporate Email, and Password) are required.');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          role: regRole,
          roleTitle: regRoleTitle,
          department: regDepartment,
          avatarColor: regAvatarColor
        })
      });

      const data = await res.json();

      if (data.success && data.user) {
        setSuccessMsg(`Team member '${data.user.name}' successfully added! You can now log in.`);
        
        // Also persist to local custom users for offline fallback
        try {
          const raw = localStorage.getItem('sarthi_custom_users') || '[]';
          const list = JSON.parse(raw);
          list.push({ user: data.user, password: cleanPassword });
          localStorage.setItem('sarthi_custom_users', JSON.stringify(list));
        } catch {}

        onRefreshUsers();

        // Switch to login tab and prefill email
        setEmail(data.user.email);
        setPassword(cleanPassword);
        setActiveTab('login');
      } else {
        setErrorMsg(data.message || 'Could not register team member.');
      }
    } catch {
      // Local fallback registration
      const newUserId = `user-${Date.now()}`;
      const newUser: UserPersona = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail.toLowerCase(),
        role: regRole,
        roleTitle: regRoleTitle,
        department: regDepartment,
        avatarColor: regAvatarColor,
        createdAt: new Date().toISOString()
      };

      try {
        const raw = localStorage.getItem('sarthi_custom_users') || '[]';
        const list = JSON.parse(raw);
        list.push({ user: newUser, password: cleanPassword });
        localStorage.setItem('sarthi_custom_users', JSON.stringify(list));
      } catch {}

      setSuccessMsg(`Team member '${newUser.name}' created locally! You can now log in.`);
      setEmail(newUser.email);
      setPassword(cleanPassword);
      setActiveTab('login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-white font-sans antialiased">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 sm:px-8 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Sarthi AppSec</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Authentication Gateway
                </span>
              </div>
              <div className="text-xs text-slate-400">
                API State-Graph &amp; Choke Point Defense Platform
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Authentication Service Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Platform Brief & Team Accounts Directory */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Restricted Corporate Access</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Sign In with Valid Team Credentials
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Enter your authorized work email and password to unlock the API state-graph, vulnerability analyzers, choke point simulations, and team task boards.
              </p>
            </div>

            {/* Quick Access Team Member Credentials Directory */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 backdrop-blur-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Authorized Team Accounts
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Click to pre-fill email
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {INITIAL_TEAM_CREDENTIALS.map((cred) => {
                  const isSelected = email.toLowerCase() === cred.user.email.toLowerCase();
                  return (
                    <div
                      key={cred.user.id}
                      className={`p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/30'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg ${cred.user.avatarColor} flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm`}
                        >
                          {cred.user.role === 'ADMIN' ? (
                            <Crown className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            cred.user.name.split(' ').map(n => n[0]).join('')
                          )}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-white truncate flex items-center gap-1.5">
                            <span>{cred.user.name}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {cred.badgeLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {cred.user.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectAccountForLogin(cred.user.email, cred.password)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition-all cursor-pointer"
                          title={`Select ${cred.user.name} and fill password`}
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(cred.user.email, cred.password)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Copy Email & Password to clipboard"
                        >
                          {copiedAccount === cred.user.email ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-800/80">
                <span>Want to register a new colleague?</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
                >
                  + Add Team Member
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login & Registration Form */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            
            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Sign In with Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Team Member</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 shadow-sm animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-rose-300">Authentication Error</div>
                  <div className="mt-0.5">{errorMsg}</div>
                </div>
              </div>
            )}

            {/* Success Message Alert */}
            {successMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5 shadow-sm animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-emerald-300">Success</div>
                  <div className="mt-0.5">{successMsg}</div>
                </div>
              </div>
            )}

            {/* TAB 1: STRICT LOGIN FORM (Requires Email AND Password) */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Work Email Address</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@sarthi.sec or your corporate email"
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Account Password</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Required for login
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password..."
                      className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span>Remember authenticated session</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    AES-256 Auth Shield
                  </span>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Authenticating Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Log In to Sarthi Platform</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Security Clearance Verification</span>
                  </div>
                  <p className="text-slate-400">
                    To access the application, you must input the exact registered password. No instant session bypass is permitted.
                  </p>
                </div>
              </form>
            )}

            {/* TAB 2: ADD / REGISTER TEAM MEMBER */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="text-xs text-slate-400 mb-2">
                  Add a new engineer, security lead, or analyst to your organization. They can then log in with their created email and password.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Patel"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Corporate Email</label>
                    <input
                      type="email"
                      required
                      placeholder="maya@company.sec"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Account Password</label>
                    <span className="text-[10px] text-slate-500">Min 6 characters</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Create a strong password..."
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Security Role</label>
                    <select
                      value={regRole}
                      onChange={(e) => {
                        const val = e.target.value as UserPersona['role'];
                        setRegRole(val);
                        if (val === 'ADMIN') setRegRoleTitle('Principal Security Administrator');
                        else if (val === 'APPSEC_LEAD') setRegRoleTitle('Lead Application Security Architect');
                        else if (val === 'PENTESTER') setRegRoleTitle('Senior Penetration Tester & Red Team');
                        else if (val === 'DEVSECOPS') setRegRoleTitle('DevSecOps & Platform Engineer');
                        else if (val === 'CISO') setRegRoleTitle('VP of Cybersecurity & Risk');
                        else setRegRoleTitle('Security Engineer');
                      }}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="ADMIN">ADMIN - Security Administrator</option>
                      <option value="APPSEC_LEAD">APPSEC_LEAD - AppSec Architect</option>
                      <option value="PENTESTER">PENTESTER - Red Team Specialist</option>
                      <option value="DEVSECOPS">DEVSECOPS - Cloud Security Engineer</option>
                      <option value="CISO">CISO - VP of Cybersecurity &amp; Risk</option>
                      <option value="SECURITY_ENGINEER">SECURITY_ENGINEER - Security Analyst</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Department</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Product Security"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Job Title</label>
                  <input
                    type="text"
                    required
                    value={regRoleTitle}
                    onChange={(e) => setRegRoleTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Avatar Accent</label>
                  <div className="flex items-center gap-2">
                    {['bg-indigo-600', 'bg-blue-600', 'bg-cyan-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setRegAvatarColor(color)}
                        className={`w-6 h-6 rounded-lg ${color} transition-all ${
                          regAvatarColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold text-xs transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span>Saving Team Member...</span>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create &amp; Register Team Member</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Sarthi Enterprise Application Security Platform</span>
            <span className="mx-2">·</span>
            <span>Version 3.2</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Encrypted Authentication Engine · RBAC Enforced
          </div>
        </div>
      </footer>
    </div>
  );
};
