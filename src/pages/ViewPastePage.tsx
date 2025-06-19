import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Copy, 
  Download, 
  Share2, 
  Eye, 
  Calendar, 
  User, 
  Tag, 
  Code2,
  Heart,
  MessageCircle,
  ExternalLink,
  Lock,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-html';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-xml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-apacheconf';
import { apiService } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Paste {
  id: number;
  title: string;
  content: string;
  syntax_language: string;
  author_id: number;
  author_username: string;
  author_avatar_url?: string;
  is_private: boolean;
  is_zero_knowledge: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

interface RelatedPaste {
  id: number;
  title: string;
  syntax_language: string;
  author_username: string;
  created_at: string;
}

const ViewPastePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [paste, setPaste] = useState<Paste | null>(null);
  const [relatedPastes, setRelatedPastes] = useState<RelatedPaste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sanitizeLanguage = (lang: string): string => {
    const supported = [
      'javascript',
      'typescript',
      'python',
      'java',
      'cpp',
      'csharp',
      'php',
      'ruby',
      'go',
      'rust',
      'html',
      'css',
      'scss',
      'sql',
      'bash',
      'powershell',
      'json',
      'yaml',
      'xml',
      'markdown',
      'dockerfile',
      'nginx',
      'apache',
    ];
    return supported.includes(lang) ? lang : 'javascript';
  };

  useEffect(() => {
    if (id) {
      fetchPaste();
      fetchRelatedPastes();
    }
  }, [id]);

  const displayContent = paste?.content || '';

  useEffect(() => {
    Prism.highlightAll();
  }, [displayContent]);

  const fetchPaste = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPaste(id!);
      setPaste(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load paste');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedPastes = async () => {
    try {
      const data = await apiService.getRelatedPastes(id!);
      setRelatedPastes(data);
    } catch (err) {
      console.error('Failed to load related pastes:', err);
    }
  };

  const handleCopy = async () => {
    if (!paste) return;
    
    try {
      await navigator.clipboard.writeText(paste.content);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleDownload = async () => {
    if (!paste) return;
    
    try {
      const blob = await apiService.downloadPaste(paste.id.toString());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${paste.title}.${getFileExtension(paste.syntax_language)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Paste downloaded!');
    } catch (err) {
      toast.error('Failed to download paste');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: paste?.title,
          text: `Check out this code snippet: ${paste?.title}`,
          url: url
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  const getFileExtension = (language: string): string => {
    const extensions: { [key: string]: string } = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      sql: 'sql',
      bash: 'sh',
      powershell: 'ps1',
      yaml: 'yml',
      markdown: 'md',
    };
    return extensions[language] || 'txt';
  };

  const getLanguageDisplayName = (language: string): string => {
    const names: { [key: string]: string } = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      csharp: 'C#',
      php: 'PHP',
      ruby: 'Ruby',
      go: 'Go',
      rust: 'Rust',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      json: 'JSON',
      xml: 'XML',
      sql: 'SQL',
      bash: 'Bash',
      powershell: 'PowerShell',
      yaml: 'YAML',
      markdown: 'Markdown',
      text: 'Plain Text',
    };
    return names[language] || language.charAt(0).toUpperCase() + language.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading paste...</p>
        </div>
      </div>
    );
  }

  if (error || !paste) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Paste Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'The paste you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {paste.title}
                </h1>
                {paste.is_private && (
                  <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                )}
                {paste.is_zero_knowledge && (
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <button
                    onClick={() => navigate(`/user/${paste.author_username}`)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {paste.author_username}
                  </button>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(paste.created_at), 'MMM d, yyyy')}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{paste.view_count} views</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Code2 className="h-4 w-4" />
                  <span>{getLanguageDisplayName(paste.syntax_language)}</span>
                </div>
              </div>

              {paste.tags && paste.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {paste.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Copy className={`h-4 w-4 ${copied ? 'text-green-600' : ''}`} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getLanguageDisplayName(paste.syntax_language)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {paste.content.split('\n').length} lines
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <pre className={`!bg-transparent !m-0 !p-4 line-numbers language-${sanitizeLanguage(paste.syntax_language)}`}> 
                  <code className={`language-${sanitizeLanguage(paste.syntax_language)}`}>
                    {displayContent}
                  </code>
                </pre>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Author Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Author
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {paste.author_username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <button
                    onClick={() => navigate(`/user/${paste.author_username}`)}
                    className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {paste.author_username}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Member since {format(new Date(paste.created_at), 'yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Related Pastes */}
            {relatedPastes.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Related Pastes
                </h3>
                <div className="space-y-3">
                  {relatedPastes.map((relatedPaste) => (
                    <div
                      key={relatedPaste.id}
                      className="group cursor-pointer"
                      onClick={() => navigate(`/paste/${relatedPaste.id}`)}
                    >
                      <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                        <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm mb-1">
                          {relatedPaste.title}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{getLanguageDisplayName(relatedPaste.syntax_language)}</span>
                          <span>{format(new Date(relatedPaste.created_at), 'MMM d')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy Code
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={handleShare}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ViewPastePage;
