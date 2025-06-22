import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Lock, 
  Bell, 
  Palette, 
  Shield, 
  Database,
  Save,
  Eye,
  EyeOff,
  Upload
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';
import NotificationPreferences, { NotificationPrefs } from '../components/Settings/NotificationPreferences';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || user?.tagline || '',
    website: user?.website || '',
    location: user?.location || '',
    profilePicture: user?.profilePicture || user?.profile_picture || user?.avatar || ''
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    emailNotifications: false,
    pushNotifications: false,
    weeklySummary: false
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'data', label: 'Data', icon: Database }
  ];

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const basePicture =
          user.profilePicture || user.profile_picture || user.avatar || '';
        const data = await apiService.getEditableProfile(user.id);
        setProfileData(prev => ({
          ...prev,
          bio: data.bio || data.tagline || '',
          website: data.website || '',
          location: data.location || '',
          profilePicture: data.profilePicture || basePicture
        }));
        setPreviewUrl(data.profilePicture || basePicture);
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    const loadPrefs = async () => {
      if (!user || activeTab !== 'notifications') return;
      try {
        const data = await apiService.getNotificationPreferences(user.id);
        setNotificationPrefs({
          emailNotifications: !!data.email_notifications,
          pushNotifications: !!data.push_notifications,
          weeklySummary: !!data.weekly_summary
        });
      } catch (err) {
        console.error('Failed to load notification preferences', err);
      }
    };
    loadPrefs();
  }, [user, activeTab]);

  const handleProfileSave = async () => {
    if (!user) return;
    const formData = new FormData();
    formData.append('bio', profileData.bio);
    formData.append('website', profileData.website);
    formData.append('location', profileData.location);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      const result = await apiService.updateProfile(user.id, formData);
      updateProfile({
        bio: result.bio,
        website: result.website,
        location: result.location,
        profilePicture: result.profilePicture ?? user.profilePicture ?? user.avatar
      });
      setAvatarFile(null);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile', err);
      toast.error('Failed to update profile');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setAvatarFile(selected);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await apiService.updatePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: unknown) {
      console.error('Failed to change password', err);
      const message =
        typeof err === 'object' && err && 'error' in err
          ? (err as { error?: string }).error
          : undefined;
      toast.error(message || 'Failed to change password');
    }
  };

  const handleSaveNotificationPrefs = async () => {
    if (!user) return;
    try {
      await apiService.updateNotificationPreferences(user.id, {
        emailNotifications: notificationPrefs.emailNotifications,
        pushNotifications: notificationPrefs.pushNotifications,
        weeklySummary: notificationPrefs.weeklySummary
      });
      toast.success('Notification preferences updated!');
    } catch (err) {
      console.error('Failed to update notification preferences', err);
      toast.error('Failed to update notification preferences');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Profile Information
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <img
                      src={previewUrl || profileData.profilePicture || '/default-avatar.png'}
                      alt={user?.username}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Upload className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">
                      Profile Picture
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Upload a new profile picture
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      disabled
                      aria-disabled="true"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg opacity-70 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={profileData.website}
                      onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleProfileSave}
                  className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Change Password
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handlePasswordChange}
                  className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
                >
                  <Lock className="h-4 w-4" />
                  <span>Update Password</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Notification Preferences
              </h3>
              <NotificationPreferences
                prefs={notificationPrefs}
                onChange={setNotificationPrefs}
              />
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveNotificationPrefs}
                  className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Theme Preferences
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      Dark Mode
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Switch between light and dark themes
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="text-slate-400 dark:text-slate-500 mb-4">
              <Shield className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Coming Soon
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              This section is under development
            </p>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};