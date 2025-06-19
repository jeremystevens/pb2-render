import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Star, 
  GitFork, 
  Copy, 
  Download, 
  Share2, 
  Calendar,
  User,
  Code,
  Edit,
  Heart,
  MessageSquare,
  Shield,
  AlertTriangle,
  Key,
  Lock,
  Loader,
  Link,
  CheckCircle,
  X
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatDistanceToNow } from 'date-fns';
import { 
  extractKeyFromUrl, 
  importKeyFromString, 
  decryptContent,
  isWebCryptoSupported 
} from '../utils/crypto';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface PasteData {
  id: string;
  title: string;
  content: string;
  encryptedContent?: string;
  language: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
    bio?: string;
  };
  views: number;
  forks: number;
  stars: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  isPublic: boolean;
  isZeroKnowledge: boolean;
  version: number;
  versions: any[];
}

export const PastePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [paste, setPaste] = useState<PasteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showAccessLink, setShowAccessLink] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPaste();
    }
  }, [id]);

  useEffect(() => {
    // Handle zero-knowledge decryption when paste is loaded
    if (paste && paste.isZeroKnowledge && paste.encryptedContent) {
      handleZeroKnowledgeDecryption();
    }
  }, [paste]);

  useEffect(() => {
    // Show access link for zero-knowledge pastes
    if (paste && paste.isZeroKnowledge) {
      setShowAccessLink(true);
    }
  }, [paste]);

  const fetchPaste = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getPaste(id);
      setPaste(data);
    } catch (err) {
      console.error('Error fetching paste:', err);
      setError(err instanceof Error ? err.message : 'Failed to load paste');
    } finally {
      setLoading(false);
    }
  };

  const handleZeroKnowledgeDecryption = async () => {
    if (!paste || !paste.isZeroKnowledge || !paste.encryptedContent) return;
    
    setIsDecrypting(true);
    setDecryptionError(null);
    
    try {
      // Check Web Crypto API support
      if (!isWebCryptoSupported()) {
        throw new Error('Zero-knowledge decryption is not supported in your browser');
      }
      
      // Extract encryption key from URL fragment
      const keyString = extractKeyFromUrl();
      if (!keyString) {
        throw new Error('Missing decryption key. Make sure you have the complete link including the #key part.');
      }
      
      // Parse encrypted content
      const encryptedData = JSON.parse(paste.encryptedContent);
      if (!encryptedData.data || !encryptedData.iv) {
        throw new Error('Invalid encrypted content format');
      }
      
      // Import the encryption key
      const cryptoKey = await importKeyFromString(keyString);
      
      // Decrypt the content
      const decrypted = await decryptContent(
        encryptedData.data,
        encryptedData.iv,
        cryptoKey
      );
      
      setDecryptedContent(decrypted);
      toast.success('Content decrypted successfully!');
    } catch (err) {
      console.error('Decryption failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to decrypt content';
      setDecryptionError(errorMessage);
      toast.error('Failed to decrypt content');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCopyAccessLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Access link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopy = async () => {
    if (!paste) return;
    
    const contentToCopy = paste.isZeroKnowledge ? decryptedContent : paste.content;
    
    if (!contentToCopy) {
      toast.error('No content available to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(contentToCopy);
      toast.success('Code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleDownload = () => {
    if (!paste) return;
    
    const contentToDownload = paste.isZeroKnowledge ? decryptedContent : paste.content;
    
    if (!contentToDownload) {
      toast.error('No content available to download');
      return;
    }
    
    const element = document.createElement('a');
    const file = new Blob([contentToDownload], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${paste.title}.${paste.language}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('File downloaded!');
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: paste?.title,
          text: `Check out this code snippet: ${paste?.title}`,
          url: url,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading paste...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !paste) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center min-h-[400px] flex items-center justify-center">
          <div>
            <div className="text-6xl mb-4">😞</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Paste Not Found
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {error || "The paste you're looking for doesn't exist or has been removed."}
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayContent = paste.isZeroKnowledge ? decryptedContent : paste.content;
  const canShowContent = !paste.isZeroKnowledge || (paste.isZeroKnowledge && decryptedContent);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Zero-Knowledge Access Link */}
        {showAccessLink && paste.isZeroKnowledge && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6"
          >
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Key className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
                  🔑 This is your private access link. Save it to view your paste again.
                </h3>
                <p className="text-sm text-green-800 dark:text-green-400 mb-4">
                  This zero-knowledge paste can only be accessed with the complete URL including the encryption key. 
                  Share this link to allow others to view the decrypted content. Without the key, this paste cannot be decrypted.
                </p>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 rounded-lg p-3 font-mono text-sm break-all">
                    {window.location.href}
                  </div>
                  <button
                    onClick={handleCopyAccessLink}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowAccessLink(false)}
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                  {paste.title}
                </h1>
                {paste.isZeroKnowledge && (
                  <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium rounded-full">
                    <Shield className="h-4 w-4" />
                    <span>Zero-Knowledge</span>
                  </div>
                )}
                {!paste.isPublic && (
                  <div className="flex items-center space-x-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium rounded-full">
                    <Lock className="h-4 w-4" />
                    <span>Unlisted</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>by</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {paste.author.username}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(paste.createdAt), { addSuffix: true })}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Code className="h-4 w-4" />
                  <span className="capitalize">{paste.language}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopy}
                disabled={paste.isZeroKnowledge && !canShowContent}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </button>
              
              <button
                onClick={handleDownload}
                disabled={paste.isZeroKnowledge && !canShowContent}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all">
                <Edit className="h-4 w-4" />
                <span>Fork</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
              <Eye className="h-4 w-4" />
              <span>{paste.views} views</span>
            </div>
            
            <button className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-yellow-500 transition-colors">
              <Star className="h-4 w-4" />
              <span>{paste.stars}</span>
            </button>
            
            <button className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors">
              <GitFork className="h-4 w-4" />
              <span>{paste.forks}</span>
            </button>
            
            <button className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors">
              <Heart className="h-4 w-4" />
              <span>Like</span>
            </button>
          </div>

          {/* Tags */}
          {paste.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {paste.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Zero-Knowledge Decryption Status */}
        {paste.isZeroKnowledge && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            {isDecrypting ? (
              <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
                <Loader className="h-5 w-5 animate-spin" />
                <span>Decrypting content...</span>
              </div>
            ) : decryptionError ? (
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-900 dark:text-red-300 mb-1">
                    Decryption Failed
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-400 mb-3">
                    {decryptionError}
                  </p>
                  <button
                    onClick={handleZeroKnowledgeDecryption}
                    className="flex items-center space-x-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <Key className="h-4 w-4" />
                    <span>Retry Decryption</span>
                  </button>
                </div>
              </div>
            ) : decryptedContent ? (
              <div className="flex items-center space-x-3 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span>Content successfully decrypted and ready to view</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Code Block */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                {paste.language}
              </span>
              {paste.isZeroKnowledge && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                  <Shield className="h-3 w-3" />
                  <span>Encrypted</span>
                </span>
              )}
            </div>
            
            <button
              onClick={handleCopy}
              disabled={paste.isZeroKnowledge && !canShowContent}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Copy code
            </button>
          </div>
          
          <div className="p-6 overflow-auto">
            {canShowContent ? (
              <pre className="text-sm text-slate-800 dark:text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
                <code>{displayContent}</code>
              </pre>
            ) : paste.isZeroKnowledge ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Lock className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  Content is Encrypted
                </h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md">
                  This paste uses zero-knowledge encryption. The decryption key should be included in the URL fragment. 
                  Make sure you have the complete link including the #key part.
                </p>
                {!isWebCryptoSupported() && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-400">
                      Your browser doesn't support the Web Crypto API required for decryption.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-600 dark:text-slate-400">No content available</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};