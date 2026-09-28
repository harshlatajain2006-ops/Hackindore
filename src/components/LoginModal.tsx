/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  Shield,
  UserPlus,
  Check,
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  Crown,
  Users
} from 'lucide-react';
import { UserPersona } from '../types/security';
import { INITIAL_TEAM_CREDENTIALS, verifyCredentialsOffline } from '../data/teamMembers';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserPersona | null;
  allUsers: UserPersona[];
  onSelectUser: (user: UserPersona) => void;
  onRefreshUsers: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onSelectUser,
  onRefreshUsers
}) => {
  const [tab, setTab] = useState<'login' | 'add_member'>('login');
  
  // Login fields
  const [email, setEmail] = useState<string>('admin@sarthi.sec');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Add team member fields
  const [name, setName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [role, setRole] = useState<UserPersona['role']>('APPSEC_LEAD');
  const [roleTitle, setRoleTitle] = useState<string>('Security Architect');
  const [department, setDepartment] = useState<string>('Application Security');
  const [avatarColor, setAvatarColor] = useState<string>('bg-indigo-600');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectAccount = (targetEmail: string, suggestedPass?: string) => {
    setEmail(targetEmail);
    setPassword(suggestedPass || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Both corporate email and password are required.');
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
        localStorage.setItem('sarthi_auth_user', JSON.stringify(data.user));
        onSelectUser(data.user);
        onClose();
      } else {
        setErrorMsg(data.message || 'Incorrect password or unauthorized email.');
      }
    } catch {
      // Offline fallback
      const offline = verifyCredentialsOffline(cleanEmail, cleanPassword);
      if (offline.success && offline.user) {
        localStorage.setItem('sarthi_auth_user', JSON.stringify(offline.user));
        onSelectUser(offline.user);
        onClose();
      } else {
        setErrorMsg(offline.error || 'Authentication error. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = name.trim();
    const cleanEmail = newEmail.trim();
    const cleanPassword = newPassword.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setErrorMsg('Name, email, and password are required.');
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
          role,
          roleTitle,
          department,
          avatarColor
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setSuccessMsg(`Team member '${data.user.name}' successfully added!`);
        
        // Cache to local custom users for offline fallback
        try {
          const raw = localStorage.getItem('sarthi_custom_users') || '[]';
          const list = JSON.parse(raw);
          list.push({ user: data.user, password: cleanPassword });
          localStorage.setItem('sarthi_custom_users', JSON.stringify(list));
        } catch {}

        onRefreshUsers();
        setEmail(data.user.email);
        setPassword(cleanPassword);
        setTab('login');
      } else {
        setErrorMsg(data.message || 'Registration failed.');
      }
    } catch {
      // Local fallback
      const newUser: UserPersona = {
        id: `user-${Date.now()}`,
        name: cleanName,
        email: cleanEmail.toLowerCase(),
        role,
        roleTitle,
        department,
        avatarColor,
        createdAt: new Date().toISOString()
      };

      try {
        const raw = localStorage.getItem('sarthi_custom_users') || '[]';
        const list = JSON.parse(raw);
        list.push({ user: newUser, password: cleanPassword });
        localStorage.setItem('sarthi_custom_users', JSON.stringify(list));
      } catch {}

      setSuccessMsg(`Team member '${newUser.name}' created locally!`);
      setEmail(newUser.email);
      setPassword(cleanPassword);
      setTab('login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Team Authentication &amp; Member Onboarding
              </h2>
              <p className="text-[11px] text-slate-400">
                Password Verification Required · Sarthi Security Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center gap-1.5 text-xs">
          <button
            onClick={() => { setTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Switch / Login</span>
          </button>
          <button
            onClick={() => { setTab('add_member'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5 ${
              tab === 'add_member'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Team Member</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="m-4 mb-0 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="m-4 mb-0 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Authenticate with password */}
        {tab === 'login' && (
          <div className="p-5 space-y-4 text-xs">
            {/* Quick account selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Select Team Account:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INITIAL_TEAM_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.user.id}
                    type="button"
                    onClick={() => handleSelectAccount(cred.user.email, cred.password)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      email.toLowerCase() === cred.user.email.toLowerCase()
                        ? 'border-indigo-500 bg-indigo-950/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-white flex items-center justify-between">
                      <span className="truncate">{cred.user.name}</span>
                      <span className="text-[9px] font-mono bg-slate-800 px-1 py-0.5 rounded text-indigo-300">
                        {cred.badgeLabel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {cred.user.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3 pt-2 border-t border-slate-800">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Account Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Account Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In with Password'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Add New Team Member */}
        {tab === 'add_member' && (
          <form onSubmit={handleRegister} className="p-5 space-y-3 text-xs">
            <div className="text-slate-400">
              Create an account for a new teammate. They will be added to the team roster and can log in with their email and password.
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Teammate Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maya Patel"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Corporate Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="maya@company.sec"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Initial Password (min 6 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Role</label>
                <select
                  value={role}
                  onChange={(e) => {
                    const r = e.target.value as UserPersona['role'];
                    setRole(r);
                    if (r === 'ADMIN') setRoleTitle('Principal Security Administrator');
                    else if (r === 'APPSEC_LEAD') setRoleTitle('Lead Application Security Architect');
                    else if (r === 'PENTESTER') setRoleTitle('Senior Penetration Tester');
                    else if (r === 'DEVSECOPS') setRoleTitle('DevSecOps Engineer');
                    else if (r === 'CISO') setRoleTitle('VP of Cybersecurity');
                    else setRoleTitle('Security Engineer');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="APPSEC_LEAD">APPSEC_LEAD</option>
                  <option value="PENTESTER">PENTESTER</option>
                  <option value="DEVSECOPS">DEVSECOPS</option>
                  <option value="CISO">CISO</option>
                  <option value="SECURITY_ENGINEER">SECURITY_ENGINEER</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Department</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer mt-3"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Adding Member...' : 'Register Team Member'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
