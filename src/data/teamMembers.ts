/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserPersona } from '../types/security';

export interface TeamMemberCredential {
  user: UserPersona;
  password: string; // Known credential for verification and UI directory display
  badgeLabel: string;
}

export const INITIAL_TEAM_CREDENTIALS: TeamMemberCredential[] = [
  {
    user: {
      id: 'user-admin',
      name: 'Sarthi Administrator',
      email: 'admin@sarthi.sec',
      role: 'ADMIN',
      roleTitle: 'Principal Security Administrator',
      department: 'Global Cyber Defense Center',
      avatarColor: 'bg-indigo-600',
      createdAt: '2026-01-10T08:00:00.000Z'
    },
    password: 'admin2026!',
    badgeLabel: 'ADMIN'
  },
  {
    user: {
      id: 'user-alex',
      name: 'Alex Rivera',
      email: 'alex.rivera@appsec.io',
      role: 'APPSEC_LEAD',
      roleTitle: 'Lead AppSec Architect',
      department: 'AppSec & Product Security',
      avatarColor: 'bg-blue-600',
      createdAt: '2026-03-01T10:00:00.000Z'
    },
    password: 'appsec123',
    badgeLabel: 'APPSEC'
  },
  {
    user: {
      id: 'user-priya',
      name: 'Priya Sharma',
      email: 'priya.sharma@redteam.io',
      role: 'PENTESTER',
      roleTitle: 'Senior Penetration Tester',
      department: 'Offensive Security',
      avatarColor: 'bg-amber-600',
      createdAt: '2026-03-05T14:30:00.000Z'
    },
    password: 'redteam123',
    badgeLabel: 'RED TEAM'
  },
  {
    user: {
      id: 'user-marcus',
      name: 'Marcus Chen',
      email: 'marcus.chen@devops.io',
      role: 'DEVSECOPS',
      roleTitle: 'DevSecOps & Platform Engineer',
      department: 'Cloud Platform & Infrastructure',
      avatarColor: 'bg-emerald-600',
      createdAt: '2026-03-10T09:15:00.000Z'
    },
    password: 'devops123',
    badgeLabel: 'DEVSECOPS'
  },
  {
    user: {
      id: 'user-elena',
      name: 'Elena Rostova',
      email: 'elena.rostova@corp.io',
      role: 'CISO',
      roleTitle: 'VP of Cybersecurity & Risk',
      department: 'Executive Risk & Compliance',
      avatarColor: 'bg-cyan-600',
      createdAt: '2026-02-15T08:00:00.000Z'
    },
    password: 'ciso123',
    badgeLabel: 'CISO'
  }
];

export const DEFAULT_USERS: UserPersona[] = INITIAL_TEAM_CREDENTIALS.map(c => c.user);

// Fallback client-side validator when server is starting/offline
export function verifyCredentialsOffline(email: string, pass: string): { success: boolean; user?: UserPersona; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Check initial credentials
  const found = INITIAL_TEAM_CREDENTIALS.find(c => c.user.email.toLowerCase() === cleanEmail);
  if (found) {
    if (found.password === cleanPass) {
      return { success: true, user: found.user };
    }
    return { success: false, error: 'Incorrect password. Access denied.' };
  }

  // Check dynamically registered users from localStorage
  try {
    const customUsersRaw = localStorage.getItem('sarthi_custom_users');
    if (customUsersRaw) {
      const customUsers: Array<{ user: UserPersona; password: string }> = JSON.parse(customUsersRaw);
      const customMatch = customUsers.find(c => c.user.email.toLowerCase() === cleanEmail);
      if (customMatch) {
        if (customMatch.password === cleanPass) {
          return { success: true, user: customMatch.user };
        }
        return { success: false, error: 'Incorrect password. Access denied.' };
      }
    }
  } catch {}

  return { success: false, error: 'No registered team account found with this email address.' };
}
