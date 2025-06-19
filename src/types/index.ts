export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  joinDate: string;
  isAdmin: boolean;
  followers: number;
  following: number;
  pasteCount: number;
  projectCount: number;
}

export interface Paste {
  id: string;
  title: string;
  content: string;
  language: string;
  author: User;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  isPublic: boolean;
  isUnlisted?: boolean; // New field for unlisted pastes
  isZeroKnowledge?: boolean; // New field for zero-knowledge encryption
  encryptedContent?: string; // Encrypted content for zero-knowledge pastes
  views: number;
  forks: number;
  stars: number;
  tags: string[];
  version: number;
  versions: PasteVersion[];
  projectId?: string;
  branchName?: string;
  aiSummary?: AISummary;
  relatedPastes?: RelatedPaste[];
}

export interface PasteVersion {
  id: string;
  version: number;
  content: string;
  createdAt: string;
  changes: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  author: User;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  branches: Branch[];
  collaborators: User[];
  readme?: string;
  license?: string;
  tags: string[];
  stars: number;
  forks: number;
  issues: Issue[];
  milestones: Milestone[];
}

export interface Branch {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  lastCommit: string;
  pastes: Paste[];
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
  assignee?: User;
  author: User;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  milestoneId?: string;
  comments: Comment[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  status: 'open' | 'closed';
  progress: number;
  projectId: string;
  issues: Issue[];
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  replies?: Comment[];
}

export interface DiscussionThread {
  id: string;
  title: string;
  category: 'Q&A' | 'Tip' | 'Idea' | 'Bug' | 'General';
  author: User;
  createdAt: string;
  postCount: number;
}

export interface AISummary {
  id: string;
  content: string;
  confidence: number;
  model: string;
  tokens: number;
  approved: boolean;
  createdAt: string;
  pasteId: string;
}

export interface RelatedPaste {
  paste: Paste;
  relevanceScore: number;
  reason: 'language' | 'user' | 'tags' | 'content';
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  author: User;
  pastes: Paste[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: 'follow' | 'paste' | 'project' | 'issue' | 'comment';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId: string;
  relatedId?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  recipient: User;
  createdAt: string;
  read: boolean;
  threadId: string;
}

export interface Theme {
  name: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}

export interface AppSettings {
  theme: 'light' | 'dark';
  aiEnabled: boolean;
  relatedContentEnabled: boolean;
  maxAIRequestsPerDay: number;
  defaultPasteExpiration: string;
}

// Zero-Knowledge Encryption Types
export interface EncryptedPasteData {
  data: string; // Base64 encoded encrypted content
  iv: string;   // Base64 encoded initialization vector
}

export interface ZeroKnowledgePaste extends Omit<Paste, 'content'> {
  content: null; // Content is always null for zero-knowledge pastes
  encryptedContent: string; // JSON string of EncryptedPasteData
  isZeroKnowledge: true;
}