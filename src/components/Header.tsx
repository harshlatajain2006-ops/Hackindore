/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Shield,
  Upload,
  FileText,
  Sparkles,
  RefreshCw,
  User,
  TrendingUp,
  Users,
  LogOut,
  ChevronDown,
  Crown,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Radio,
  UserPlus
} from 'lucide-react';
import { PreloadedSpec } from '../data/sampleSpecs';
import { UserPersona } from '../types/security';

interface HeaderProps {
  currentSpecKey: string;
  onSelectSpec: (key: string) => void;
  activeTab: 'graph' | 'chokepoints' | 'roi' | 'activity' | 'paths' | 'replay' | 'findings' | 'pitch' | 'portal';
  setActiveTab: (tab: 'graph' | 'chokepoints' | 'roi' | 'activity' | 'paths' | 'replay' | 'findings' | 'pitch' | 'portal') => void;
  onOpenUpload: () => void;
  onOpenReport: () => void;
  onOpenPitch: () => void;
  onOpenLogin: () => void;
  onOpenTrafficScanner: () => void;
  onOpenEvidenceReplay: () => void;
  onLogout: () => void;
  currentUser: UserPersona | null;
  isSimulating: boolean;
  onResetSimulation: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSpecKey,
  onSelectSpec,
  activeTab,
  setActiveTab,
  onOpenUpload,
  onOpenReport,
  onOpenPitch,
  onOpenLogin,
  onOpenTrafficScanner,
  onOpenEvidenceReplay,
  onLogout,
  currentUser,
  isSimulating,
  onResetSimulation,
  onToggleSidebar
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="border-b backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-2.5" style={{ background: 'color-mix(in srgb, var(--bg-base) 88%, transparent)', borderColor: 'var(--border-soft)' }}>
      <div className="flex items-center justify-between gap-4">
        {/* Zone 1: Enterprise Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border"
            style={{ background: 'var(--surface)', color: 'var(--text-main)', borderColor: 'var(--border-soft)' }}
            aria-label="Toggle sidebar"
          >
            <span className="sr-only">Open menu</span>
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 rounded-full" style={{ background: 'var(--text-main)' }} />
              <span className="block h-0.5 w-4 rounded-full" style={{ background: 'var(--text-main)' }} />
              <span className="block h-0.5 w-4 rounded-full" style={{ background: 'var(--text-main)' }} />
            </span>
          </button>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-strong)', color: 'var(--accent)' }}>
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight whitespace-nowrap flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <span>Sarthi AppSec</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--border-strong)' }}>
                v2.6
              </span>
            </div>
            <div className="text-[11px] hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              API State-Graph &amp; Choke Point Defense
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented Tabs */}
        <nav className="flex items-center gap-1 p-1 rounded-xl border text-xs overflow-x-auto" style={{ background: 'rgba(11, 43, 38, 0.78)', borderColor: 'var(--border-soft)' }}>
          <button
            onClick={() => setActiveTab('graph')}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            style={{
              background: activeTab === 'graph' ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === 'graph' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'graph' ? '1px solid var(--border-strong)' : '1px solid transparent'
            }}
          >
            Attack Graph &amp; Simulator
          </button>
          <button
            onClick={() => setActiveTab('roi')}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
            style={{
              background: activeTab === 'roi' ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === 'roi' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'roi' ? '1px solid var(--border-strong)' : '1px solid transparent'
            }}
          >
            <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span>ROI Quadrants</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
            style={{
              background: activeTab === 'activity' ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === 'activity' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'activity' ? '1px solid var(--border-strong)' : '1px solid transparent'
            }}
          >
            <Users className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span>Team Activity</span>
          </button>
          <button
            onClick={() => setActiveTab('chokepoints')}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
            style={{
              background: activeTab === 'chokepoints' ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === 'chokepoints' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'chokepoints' ? '1px solid var(--border-strong)' : '1px solid transparent'
            }}
          >
            <span>Choke Points</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cta)' }}></span>
          </button>
          <button
            onClick={() => setActiveTab('paths')}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            style={{
              background: activeTab === 'paths' ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === 'paths' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'paths' ? '1px solid var(--border-strong)' : '1px solid transparent'
            }}
          >
            Attack Chains
          </button>
          <button
            onClick={onOpenEvidenceReplay}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            style={{
              background: activeTab === 'replay' ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === 'replay' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'replay' ? '1px solid var(--border-strong)' : '1px solid transparent'
            }}
          >
            Evidence Replay
          </button>
          <button
            onClick={() => setActiveTab('findings')}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
            style={{
              background: activeTab === 'findings' ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === 'findings' ? 'var(--text-main)' : 'var(--text-muted)',
              border: activeTab === 'findings' ? '1px solid var(--border-strong)' : '1px solid transparent'
            }}
          >
            Vulnerabilities
          </button>
          <button
            onClick={onOpenPitch}
            className="px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1 border"
            style={{ background: 'var(--accent-soft)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
            title="Algorithm explanation and hackathon pitch details"
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span>Pitch Guide</span>
          </button>
          <button
            onClick={onOpenLogin}
            className="px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 text-xs shadow-sm cursor-pointer"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-main)' }}
            title="Add a new team member or switch account"
          >
            <Users className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span>+ Team Member</span>
          </button>
        </nav>

        {/* Zone 3: Actions & User Persona */}
        <div className="flex items-center gap-2">
          {isSimulating && (
            <button
              onClick={onResetSimulation}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-500/30 rounded-lg hover:bg-amber-900/40 transition-colors flex items-center gap-1 whitespace-nowrap"
              title="Reset What-If Simulation"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Target Selector */}
          <div className="relative hidden xl:block">
            <select
              value={currentSpecKey}
              onChange={(e) => onSelectSpec(e.target.value)}
              className="rounded-lg px-2.5 py-1.5 pr-7 text-xs transition-colors appearance-none cursor-pointer border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border-soft)', color: 'var(--text-main)' }}
            >
              <option value="crapi">crAPI (Automotive)</option>
              <option value="fintech">vAPI (FinTech)</option>
              <option value="healthtrack">HealthTrack (EHR)</option>
              <option value="saas">CloudOps (SaaS)</option>
              {currentSpecKey === 'custom' && <option value="custom">Custom Spec</option>}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs" style={{ color: 'var(--text-muted)' }}>
              ▼
            </div>
          </div>

          <button
            onClick={onOpenTrafficScanner}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            style={{ background: 'var(--accent-soft)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
            title="Ingest & scan live API HTTP traffic logs"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--accent)' }} />
            <span className="hidden md:inline">Traffic Scanner</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-soft)', color: 'var(--text-main)' }}
          >
            <Upload className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="hidden sm:inline">Spec</span>
          </button>

          <button
            onClick={onOpenReport}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-main)' }}
          >
            <FileText className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span className="hidden sm:inline">Report</span>
          </button>

          {/* User Persona Profile Button with Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
              style={{
                background: 'var(--surface)',
                border: isAdmin ? '1px solid var(--border-strong)' : '1px solid var(--border-soft)',
                color: 'var(--text-main)'
              }}
              title="Account Menu"
            >
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm"
                style={{ background: currentUser?.avatarColor || 'var(--accent)', color: 'var(--text-main)' }}
              >
                {isAdmin ? (
                  <Crown className="w-3 h-3" style={{ color: 'var(--text-main)' }} />
                ) : currentUser ? (
                  currentUser.name.split(' ').map(n => n[0]).join('')
                ) : (
                  <User className="w-3 h-3" />
                )}
              </div>
              <div className="text-left hidden md:block">
                <div className="font-semibold text-[11px] leading-tight flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
                  <span>{currentUser?.name || 'Sign In'}</span>
                  {isAdmin && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-bold border" style={{ background: 'var(--accent-soft)', color: 'var(--text-main)', borderColor: 'var(--border-strong)' }}>
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                  {currentUser?.roleTitle.split(' ')[0] || 'Team'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 hidden sm:block" style={{ color: 'var(--text-muted)' }} />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 border rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1" style={{ background: 'var(--surface)', borderColor: 'var(--border-soft)' }}>
                  <div className="p-2 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                    <div className="font-bold flex items-center justify-between" style={{ color: 'var(--text-main)' }}>
                      <span>{currentUser?.name}</span>
                      {isAdmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold border" style={{ background: 'var(--accent-soft)', color: 'var(--text-main)', borderColor: 'var(--border-strong)' }}>
                          SUPERADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{currentUser?.email}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentUser?.department}</div>
                  </div>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    style={{ background: 'transparent', color: 'var(--text-main)' }}
                  >
                    <UserPlus className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span>+ Add Team Member</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    style={{ background: 'transparent', color: 'var(--text-main)' }}
                  >
                    <KeyRound className="w-3.5 h-3.5" style={{ color: 'var(--cta)' }} />
                    <span>Switch Team Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border-t mt-1"
                    style={{ background: 'transparent', color: 'var(--danger)', borderColor: 'var(--border-soft)' }}
                  >
                    <LogOut className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
