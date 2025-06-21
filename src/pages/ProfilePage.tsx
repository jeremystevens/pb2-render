import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Link as LinkIcon, 
  Calendar, 
  Users, 
  Code, 
  Folder,
  Star,
  GitFork,
  Settings,
  UserPlus,
  Loader
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';

const defaultAvatar = '/default-avatar.png';
import { UserAchievements, Achievement } from '../components/Achievements/UserAchievements';
import { PasteCard } from '../components/Paste/PasteCard';
import { ProfileSummary as ProfileSummaryComponent } from '../components/Profile/ProfileSummary';
import { ProfileSummary } from '../types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface ProfileUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  profile_picture?: string;
  profilePicture?: string;
  bio?: string;
  website?: string;
  location?: string;
  isAdmin: boolean;
  joinDate: string;
  followers: number;
  following: number;
  pasteCount: number;
  projectCount: number;
}

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { pastes } = useAppStore();
  const { user: currentUser } = useAuthStore();
  
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [userPastes, setUserPastes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  
  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    if (username) {
      fetchUserProfile();
    }
  }, [username]);

  const fetchUserProfile = async () => {
    if (!username) return;

    setLoading(true);
    setError(null);
    setProfileSummary(null);
    
    try {
      // If it's the current user's profile, use their data from auth store
      if (isOwnProfile && currentUser) {
        setProfileUser({
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          avatar: currentUser.avatar,
          profile_picture: currentUser.profile_picture,
          profilePicture: currentUser.profilePicture,
          bio: currentUser.bio,
          website: currentUser.website,
          location: currentUser.location,
          isAdmin: currentUser.isAdmin,
          joinDate: currentUser.joinDate,
          followers: currentUser.followers,
          following: currentUser.following,
          pasteCount: currentUser.pasteCount,
          projectCount: currentUser.projectCount
        });
        
        // Get user's pastes from the store (filtered by username)
        const filteredPastes = pastes.filter(p => p.author.username === username && p.isPublic);
        setUserPastes(filteredPastes);
        const ach = await apiService.getUserAchievements(currentUser.id);
        setAchievements(ach);
        const summary = await apiService.getProfileSummary(currentUser.id);
        setProfileSummary(summary);
      } else {
        // Fetch user data from API for other users
        try {
          const userData = await apiService.getUser(username);
          setProfileUser(userData);
          
          // Fetch user's pastes
          const userPastesData = await apiService.getUserPastes(username);
          setUserPastes(userPastesData);
          const ach = await apiService.getUserAchievements(userData.id);
          setAchievements(ach);
          const summary = await apiService.getProfileSummary(userData.id);
          setProfileSummary(summary);
        } catch (apiError) {
          console.error('API error:', apiError);
          // Fallback: try to find user in local data
          const localUser = pastes.find(p => p.author.username === username)?.author;
          if (localUser) {
            setProfileUser({
              id: localUser.id,
              username: localUser.username,
              avatar: localUser.avatar,
              profile_picture: localUser.profile_picture,
              profilePicture: localUser.profilePicture,
              bio: localUser.bio,
              website: localUser.website,
              location: localUser.location,
              isAdmin: localUser.isAdmin,
              joinDate: localUser.joinDate,
              followers: localUser.followers,
              following: localUser.following,
              pasteCount: localUser.pasteCount,
              projectCount: localUser.projectCount
            });
            
          const filteredPastes = pastes.filter(p => p.author.username === username && p.isPublic);
          setUserPastes(filteredPastes);
          const ach = await apiService.getUserAchievements(localUser.id);
          setAchievements(ach);
          const summary = await apiService.getProfileSummary(localUser.id);
          setProfileSummary(summary);
        } else {
            throw new Error('User not found');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center min-h-[400px] flex items-center justify-center">
          <div>
            <div className="text-6xl mb-4">😞</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              User Not Found
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {error || "The user you're looking for doesn't exist."}
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Profile Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16">
              <div className="relative">
                <img
                  src={profileUser.profilePicture || profileUser.profile_picture || profileUser.avatar || defaultAvatar}
                  alt={profileUser.username}
                  className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 object-cover"
                />
              </div>
              
              <div className="flex-1 mt-4 sm:mt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {profileUser.username}
                      </h1>
                      {profileUser.isAdmin && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    {profileUser.bio && (
                      <p className="text-slate-600 dark:text-slate-300 mt-1">
                        {profileUser.bio}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                    {isOwnProfile ? (
                      <Link to="/edit-profile">
                        <button className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                          <Settings className="h-4 w-4" />
                          <span>Edit Profile</span>
                        </button>
                      </Link>
                    ) : (
                      <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                        <UserPlus className="h-4 w-4" />
                        <span>Follow</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600 dark:text-slate-400">
                  {profileUser.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profileUser.location}</span>
                    </div>
                  )}
                  
                  {profileUser.website && (
                    <div className="flex items-center space-x-1">
                      <LinkIcon className="h-4 w-4" />
                      <a 
                        href={profileUser.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {profileUser.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDistanceToNow(new Date(profileUser.joinDate), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {profileUser.followers}
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              Followers
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {profileUser.following}
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              Following
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {profileUser.pasteCount}
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              Pastes
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {profileUser.projectCount}
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">
              Projects
            </div>
          </div>
        </div>

        {/* Profile Summary */}
        <ProfileSummaryComponent summary={profileSummary} />

        {/* Content Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-8 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <button className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 pb-4 -mb-4">
              <Code className="h-4 w-4" />
              <span>Pastes</span>
              <span className="bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded-full text-xs">
                {userPastes.length}
              </span>
            </button>
            
            <button className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              <Folder className="h-4 w-4" />
              <span>Projects</span>
              <span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full text-xs">
                {profileUser.projectCount}
              </span>
            </button>
          </div>

          <div className="p-6">
            {userPastes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userPastes.slice(0, 6).map((paste, index) => (
                  <motion.div
                    key={paste.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PasteCard paste={paste} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Code className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  No public pastes yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {isOwnProfile 
                    ? "Create your first paste to get started" 
                    : `${profileUser.username} hasn't shared any public pastes yet`
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <UserAchievements achievements={achievements} />
        </div>

        {/* Activity Graph Placeholder */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Contribution Activity
          </h3>
          
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 365 }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${
                  Math.random() > 0.7 
                    ? 'bg-green-500' 
                    : Math.random() > 0.5 
                    ? 'bg-green-300' 
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title={`Activity on day ${i + 1}`}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-4 text-sm text-slate-600 dark:text-slate-400">
            <span>Less</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-200 dark:bg-green-800 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-300 dark:bg-green-600 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 dark:bg-green-500 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-sm"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};