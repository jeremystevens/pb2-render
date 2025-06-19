import { create } from 'zustand';
import { Paste, Project, Issue, Notification, Message } from '../types';
import { apiService } from '../services/api';

interface AppState {
  pastes: Paste[];
  projects: Project[];
  issues: Issue[];
  notifications: Notification[];
  messages: Message[];
  isLoading: boolean;
  apiError: string | null;
  backendStatus: 'unknown' | 'healthy' | 'sleeping' | 'error';
  
  // Pastes
  loadRecentPastes: () => Promise<void>;
  addPaste: (paste: Omit<Paste, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updatePaste: (id: string, updates: Partial<Paste>) => void;
  deletePaste: (id: string) => void;
  
  // Projects
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Issues
  addIssue: (issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  
  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  // Error handling
  clearApiError: () => void;
  checkBackendStatus: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  pastes: [],
  projects: [],
  issues: [],
  notifications: [],
  messages: [],
  isLoading: false,
  apiError: null,
  backendStatus: 'unknown',

  loadRecentPastes: async () => {
    set({ isLoading: true, apiError: null });
    
    try {
      console.log('📋 Loading recent pastes...');
      const pastes = await apiService.getRecentPastes();
      
      set({ 
        pastes: Array.isArray(pastes) ? pastes : [], 
        isLoading: false,
        backendStatus: 'healthy'
      });
      
      console.log(`✅ Loaded ${pastes.length} recent pastes`);
      
    } catch (error) {
      console.error('❌ Failed to load recent pastes:', error);
      
      let errorMessage = 'Failed to load recent pastes';
      let backendStatus: 'sleeping' | 'error' = 'error';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('sleeping')) {
          errorMessage = 'Server is waking up or unreachable. Please try again shortly.';
          backendStatus = 'sleeping';
          console.log('💤 Backend appears to be sleeping');
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Connection failed. Please check your internet connection.';
          console.log('🌐 Network connectivity issue');
        } else {
          errorMessage = error.message;
        }
      }
      
      set({ 
        isLoading: false, 
        apiError: errorMessage,
        backendStatus
      });
    }
  },

  addPaste: async (pasteData) => {
    try {
      console.log('📝 Creating new paste...');
      
      const response = await apiService.createPaste({
        title: pasteData.title,
        content: pasteData.content,
        language: pasteData.language,
        isPrivate: !pasteData.isPublic && !pasteData.isUnlisted,
        isZeroKnowledge: pasteData.isZeroKnowledge,
        encryptedContent: pasteData.encryptedContent,
        tags: pasteData.tags,
        expiration: pasteData.expiresAt
      });
      
      console.log('✅ Paste created successfully:', response.id);
      
      // Reload recent pastes to include the new one (only if not zero-knowledge)
      if (!pasteData.isZeroKnowledge) {
        console.log('🔄 Refreshing recent pastes...');
        get().loadRecentPastes();
      }
      
      set({ backendStatus: 'healthy', apiError: null });
      return response.id;
      
    } catch (error) {
      console.error('❌ Failed to create paste:', error);
      
      let errorMessage = 'Failed to create paste';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('sleeping')) {
          errorMessage = 'Server is waking up or unreachable. Please try again shortly.';
          set({ backendStatus: 'sleeping' });
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Connection failed. Please check your internet and try again.';
          set({ backendStatus: 'error' });
        } else {
          errorMessage = error.message;
        }
      }
      
      set({ apiError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updatePaste: (id, updates) => {
    set((state) => ({
      pastes: state.pastes.map((paste) =>
        paste.id === id
          ? { ...paste, ...updates, updatedAt: new Date().toISOString() }
          : paste
      ),
    }));
  },

  deletePaste: (id) => {
    set((state) => ({
      pastes: state.pastes.filter((paste) => paste.id !== id),
    }));
  },

  addProject: (projectData) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stars: 0,
      forks: 0,
      issues: [],
      milestones: [],
    };
    set((state) => ({ projects: [newProject, ...state.projects] }));
  },

  updateProject: (id, updates) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id
          ? { ...project, ...updates, updatedAt: new Date().toISOString() }
          : project
      ),
    }));
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }));
  },

  addIssue: (issueData) => {
    const newIssue: Issue = {
      ...issueData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    };
    set((state) => ({ issues: [newIssue, ...state.issues] }));
  },

  updateIssue: (id, updates) => {
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue.id === id
          ? { ...issue, ...updates, updatedAt: new Date().toISOString() }
          : issue
      ),
    }));
  },

  deleteIssue: (id) => {
    set((state) => ({
      issues: state.issues.filter((issue) => issue.id !== id),
    }));
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      ),
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }));
  },

  clearApiError: () => {
    set({ apiError: null });
  },

  checkBackendStatus: async () => {
    try {
      await apiService.healthCheck();
      set({ backendStatus: 'healthy', apiError: null });
    } catch (error) {
      console.warn('Backend status check failed:', error);

      if (error instanceof Error && error.message.includes('timeout')) {
        set({
          backendStatus: 'sleeping',
          apiError: 'Server is waking up or unreachable. Please try again shortly.'
        });
      } else {
        set({
          backendStatus: 'error',
          apiError: 'Server is waking up or unreachable. Please try again shortly.'
        });
      }
    }
  },
}));