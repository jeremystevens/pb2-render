import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Code, 
  Folder, 
  Shield, 
  Settings, 
  BarChart3, 
  Activity,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  Database,
  Globe,
  Clock,
  TrendingUp,
  UserCheck,
  FileText,
  MessageSquare
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { mockUsers } from '../data/mockData';
import { formatDistanceToNow } from 'date-fns';

export const AdminPage: React.FC = () => {
  const { pastes, projects, issues, notifications } = useAppStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate statistics
  const totalUsers = mockUsers.length;
  const totalPastes = pastes.length;
  const publicPastes = pastes.filter(p => p.isPublic).length;
  const privatePastes = pastes.filter(p => !p.isPublic).length;
  const totalProjects = projects.length;
  const activeIssues = issues.filter(i => i.status === 'open').length;
  const totalViews = pastes.reduce((acc, p) => acc + p.views, 0);

  // Recent activity data
  const recentUsers = mockUsers.slice(0, 5);
  const recentPastes = pastes.slice(0, 5);
  const recentIssues = issues.slice(0, 5);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'content', label: 'Content', icon: Code },
    { id: 'ai-moderation', label: 'AI Moderation', icon: Brain },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System', icon: Settings }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalUsers}
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">
                Total Users
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Code className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalPastes}
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">
                Total Pastes
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Folder className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalProjects}
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">
                Active Projects
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Eye className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalViews.toLocaleString()}
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">
                Total Views
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart Placeholder */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
          Activity Overview
        </h3>
        <div className="h-64 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Activity chart visualization would go here
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Recent Users
          </h3>
          <div className="space-y-4">
            {recentUsers.map(user => (
              <div key={user.id} className="flex items-center space-x-3">
                {user.profile_picture || user.avatar ? (
                  <img
                    src={user.profile_picture || user.avatar}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {user.username}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Joined {formatDistanceToNow(new Date(user.joinDate), { addSuffix: true })}
                  </div>
                </div>
                {user.isAdmin && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Recent Pastes
          </h3>
          <div className="space-y-4">
            {recentPastes.map(paste => (
              <div key={paste.id} className="border-l-4 border-indigo-500 pl-4">
                <div className="font-medium text-slate-900 dark:text-white truncate">
                  {paste.title}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  by {paste.author.username} • {formatDistanceToNow(new Date(paste.createdAt), { addSuffix: true })}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded">
                    {paste.language}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    paste.isPublic 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                  }`}>
                    {paste.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          User Management
        </h3>
        <div className="flex items-center space-x-3">
          <select className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg">
            <option>All Users</option>
            <option>Admins Only</option>
            <option>Regular Users</option>
            <option>Recently Joined</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {mockUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      {user.profile_picture || user.avatar ? (
                        <img
                          src={user.profile_picture || user.avatar}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {user.username}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.isAdmin 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {user.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                    {formatDistanceToNow(new Date(user.joinDate), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {user.pasteCount} pastes
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {user.projectCount} projects
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm">
                        Edit
                      </button>
                      <button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm">
                        Suspend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-900 dark:text-white">Paste Statistics</h4>
            <Code className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Public:</span>
              <span className="font-medium text-slate-900 dark:text-white">{publicPastes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Private:</span>
              <span className="font-medium text-slate-900 dark:text-white">{privatePastes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Views:</span>
              <span className="font-medium text-slate-900 dark:text-white">{totalViews.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-900 dark:text-white">Project Status</h4>
            <Folder className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Projects:</span>
              <span className="font-medium text-slate-900 dark:text-white">{totalProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Active Issues:</span>
              <span className="font-medium text-slate-900 dark:text-white">{activeIssues}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Collaborators:</span>
              <span className="font-medium text-slate-900 dark:text-white">{projects.reduce((acc, p) => acc + p.collaborators.length, 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-900 dark:text-white">Popular Languages</h4>
            <Activity className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-2">
            {['JavaScript', 'Python', 'TypeScript'].map((lang, index) => (
              <div key={lang} className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">{lang}:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                      style={{ width: `${100 - (index * 20)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {Math.floor(Math.random() * 50) + 10}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Management Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Content Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center space-x-2 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <FileText className="h-5 w-5" />
            <span>Review Flagged</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
            <XCircle className="h-5 w-5" />
            <span>Remove Expired</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <CheckCircle className="h-5 w-5" />
            <span>Approve Pending</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <Database className="h-5 w-5" />
            <span>Cleanup Database</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAIModeration = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          AI Feature Controls
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div>
                <div className="font-medium text-slate-900 dark:text-white">AI Summaries</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Enable AI-powered code analysis
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div>
                <div className="font-medium text-slate-900 dark:text-white">Related Content</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Show related paste suggestions
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Daily AI Requests Limit
              </label>
              <input
                type="number"
                defaultValue="100"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                AI Model Selection
              </label>
              <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option>GPT-4</option>
                <option>Claude</option>
                <option>Gemini</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pending AI Summaries */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Pending AI Summaries for Review
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map(item => (
            <div key={item} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                    React Hook for API Calls
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    This custom React hook provides a clean abstraction for handling API calls with built-in loading, error, and data states. It includes automatic cleanup and supports multiple request options.
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>Confidence: 95%</span>
                    <span>Tokens: 150</span>
                    <span>Model: GPT-4</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">Secure</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">System Status</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">24h</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">Last Scan</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">Threats Detected</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Security Logs
        </h3>
        <div className="space-y-3">
          {[
            { type: 'info', message: 'User admin logged in successfully', time: '2 minutes ago' },
            { type: 'warning', message: 'Multiple failed login attempts detected', time: '1 hour ago' },
            { type: 'success', message: 'Security scan completed successfully', time: '24 hours ago' },
            { type: 'info', message: 'New user registration: developer', time: '2 days ago' }
          ].map((log, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${
                log.type === 'success' ? 'bg-green-500' :
                log.type === 'warning' ? 'bg-yellow-500' :
                log.type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
              }`} />
              <div className="flex-1">
                <div className="text-sm text-slate-900 dark:text-white">{log.message}</div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{log.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            System Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Site Name
              </label>
              <input
                type="text"
                defaultValue="PasteForge"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Registration
              </label>
              <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option>Open Registration</option>
                <option>Invite Only</option>
                <option>Disabled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Default Paste Expiration
              </label>
              <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option>Never</option>
                <option>1 Hour</option>
                <option>1 Day</option>
                <option>1 Week</option>
                <option>1 Month</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Database Management
          </h3>
          <div className="space-y-4">
            <button className="w-full flex items-center justify-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Database className="h-5 w-5" />
              <span>Backup Database</span>
            </button>

            <button className="w-full flex items-center justify-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <Zap className="h-5 w-5" />
              <span>Optimize Database</span>
            </button>

            <button className="w-full flex items-center justify-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
              <Activity className="h-5 w-5" />
              <span>View Performance</span>
            </button>

            <button className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <AlertTriangle className="h-5 w-5" />
              <span>Emergency Cleanup</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">99.9%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Uptime</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">15.2GB</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Database Size</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">2.1GB</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Storage Used</div>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">v1.2.0</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Version</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'users':
        return renderUsers();
      case 'content':
        return renderContent();
      case 'ai-moderation':
        return renderAIModeration();
      case 'security':
        return renderSecurity();
      case 'system':
        return renderSystem();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Manage users, content, and system settings
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium rounded-full">
              System Healthy
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-1 p-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {renderTabContent()}
        </div>
      </motion.div>
    </div>
  );
};