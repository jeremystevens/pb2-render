import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, User, Code, Folder, Bug, MessageSquare } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatDistanceToNow } from 'date-fns';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return User;
      case 'paste':
        return Code;
      case 'project':
        return Folder;
      case 'issue':
        return Bug;
      case 'comment':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'paste':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'project':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
      case 'issue':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'comment':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Notifications
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Stay updated with your activity and interactions
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {notifications.length}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">
                  Total Notifications
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {unreadCount}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">
                  Unread
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {notifications.length - unreadCount}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">
                  Read
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {notifications.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {notifications.map((notification, index) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClasses = getNotificationColor(notification.type);
                
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-lg ${colorClasses}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-sm font-medium ${
                              !notification.read 
                                ? 'text-slate-900 dark:text-white' 
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          
                          {!notification.read && (
                            <div className="ml-4">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No notifications yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                When you have notifications, they'll appear here
              </p>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
};