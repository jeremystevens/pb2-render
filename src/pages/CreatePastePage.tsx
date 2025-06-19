import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Eye, Settings, Upload, Wand2, Info, Globe, Link2, Lock, Shield, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { 
  generateEncryptionKey, 
  exportKeyToString, 
  encryptContent, 
  isWebCryptoSupported,
  addKeyToUrl 
} from '../utils/crypto';
import toast from 'react-hot-toast';

const languages = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby', 
  'go', 'rust', 'html', 'css', 'scss', 'sql', 'bash', 'powershell', 'json', 
  'yaml', 'xml', 'markdown', 'dockerfile', 'nginx', 'apache'
];

const expirationOptions = [
  { label: 'Never', value: '' },
  { label: '10 minutes', value: '10m' },
  { label: '1 hour', value: '1h' },
  { label: '1 day', value: '1d' },
  { label: '1 week', value: '1w' },
  { label: '1 month', value: '1M' }
];

export const CreatePastePage: React.FC = () => {
  const navigate = useNavigate();
  const { addPaste, checkBackendStatus } = useAppStore();
  const { user, isAuthenticated } = useAuthStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [expiration, setExpiration] = useState('');
  const [tags, setTags] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isZeroKnowledge, setIsZeroKnowledge] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Zero-knowledge encryption state
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [encryptedContent, setEncryptedContent] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionReady, setEncryptionReady] = useState(false);

  // Auto-encrypt content when zero-knowledge is enabled
  const ENCRYPTED_PLACEHOLDER =
    '// Encrypted — viewable only with decryption key';

  const performEncryption = useCallback(
    async (textToEncrypt?: string): Promise<boolean> => {
      const rawText = textToEncrypt !== undefined ? textToEncrypt : content;
      if (!isZeroKnowledge || !rawText.trim() || !isWebCryptoSupported()) {
        return false;
      }

    setIsEncrypting(true);
    try {
      // Generate new key if not exists
      let cryptoKey = encryptionKey;
      if (!cryptoKey) {
        cryptoKey = await generateEncryptionKey();
        setEncryptionKey(cryptoKey);
      }

      // Encrypt content
      const encrypted = await encryptContent(rawText.trim(), cryptoKey);
      const encryptedData = JSON.stringify({
        data: encrypted.encryptedData,
        iv: encrypted.iv
      });
      
      setEncryptedContent(encryptedData);
      setEncryptionReady(true);

      console.log('Content encrypted successfully');
      return true;
    } catch (error) {
      console.error('Encryption failed:', error);
      toast.error('Encryption failed. Please try again.');
      setEncryptionReady(false);
      return false;
    } finally {
      setIsEncrypting(false);
    }
  }, [isZeroKnowledge, content, encryptionKey]);

  // Trigger encryption on content change (with debounce)
  useEffect(() => {
    if (!isZeroKnowledge) {
      setEncryptionReady(false);
      return;
    }

    if (!content.trim() || content === ENCRYPTED_PLACEHOLDER) {
      return;
    }

    const timeoutId = setTimeout(() => {
      performEncryption(content);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [content, isZeroKnowledge, performEncryption]);

  // Handle content blur (immediate encryption)
  const handleContentBlur = async (
    e: React.FocusEvent<HTMLTextAreaElement>
  ) => {
    if (isZeroKnowledge) {
      const text = e.target.value;
      if (text.trim()) {
        const success = await performEncryption(text);
        if (success) {
          setContent(ENCRYPTED_PLACEHOLDER);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isZeroKnowledge && !content.trim()) {
      toast.error('Content is required');
      return;
    }

    // For anonymous users, prevent private pastes
    if (!isAuthenticated && visibility === 'private') {
      toast.error('Anonymous users cannot create private pastes');
      return;
    }

    // Check Web Crypto API support for zero-knowledge pastes
    if (isZeroKnowledge && !isWebCryptoSupported()) {
      toast.error('Zero-knowledge encryption is not supported in your browser');
      return;
    }

    // For zero-knowledge pastes, ensure encryption is ready
    if (isZeroKnowledge) {
      if (!encryptionReady || !encryptedContent) {
        toast.error('Please wait for encryption to complete');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let finalContent = content.trim();
      let finalEncryptedContent = '';
      let finalVisibility = visibility;

      // Handle zero-knowledge encryption
      if (isZeroKnowledge) {
        // Use pre-encrypted content
        finalEncryptedContent = encryptedContent;

        // Zero-knowledge pastes are always unlisted
        finalVisibility = 'unlisted';
        finalContent = ENCRYPTED_PLACEHOLDER;

        console.log('Using pre-encrypted content for zero-knowledge paste');
      }

      const pasteData = {
        title: title.trim() || 'Untitled',
        content: finalContent,
        language,
        author: isAuthenticated && user ? user : {
          id: 'anonymous',
          username: 'Anonymous',
          email: '',
          avatar: undefined,
          bio: undefined,
          website: undefined,
          location: undefined,
          joinDate: new Date().toISOString(),
          isAdmin: false,
          followers: 0,
          following: 0,
          pasteCount: 0,
          projectCount: 0
        },
        isPublic: finalVisibility === 'public',
        isUnlisted: finalVisibility === 'unlisted',
        isZeroKnowledge,
        encryptedContent: isZeroKnowledge ? finalEncryptedContent : undefined,
        expiresAt: expiration ? calculateExpirationDate(expiration) : undefined,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      console.log('Submitting paste payload:', pasteData);

      const pasteId = await addPaste(pasteData);
      
      if (pasteId) {
        toast.success('Paste created successfully!');
        
        // For zero-knowledge pastes, navigate with the encryption key in the URL fragment
        if (isZeroKnowledge && encryptionKey) {
          const keyString = await exportKeyToString(encryptionKey);
          const pasteUrl = `/paste/${pasteId}#${keyString}`;
          navigate(pasteUrl);
        } else {
          navigate(`/paste/${pasteId}`);
        }
      } else {
        throw new Error('Failed to create paste');
      }
    } catch (error) {
      console.error('Failed to create paste:', error);
      
      // Better error handling for different scenarios
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('sleeping')) {
          toast.error('Server is waking up or unreachable. Please try again shortly.');
          await checkBackendStatus();
        } else if (error.message.includes('Network error')) {
          toast.error('Connection failed. Please check your internet and try again.');
          await checkBackendStatus();
        } else {
          toast.error(error.message || 'Failed to create paste. Please try again.');
        }
      } else {
        toast.error('Failed to create paste. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateExpirationDate = (expiration: string): string => {
    const now = new Date();
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));
    
    switch (unit) {
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'w':
        now.setDate(now.getDate() + (value * 7));
        break;
      case 'M':
        now.setMonth(now.getMonth() + value);
        break;
    }
    
    return now.toISOString();
  };

  const generateSmartTitle = async () => {
    if (!content.trim()) {
      toast.error('Add some code first to generate a title');
      return;
    }

    setIsGeneratingTitle(true);
    
    // Simulate AI title generation
    setTimeout(() => {
      const suggestions = [
        'React Custom Hook Implementation',
        'Python Data Processing Script',
        'TypeScript Interface Definitions',
        'Node.js API Endpoint',
        'CSS Grid Layout Helper',
        'Database Query Optimization',
        'Authentication Middleware',
        'Utility Functions Collection'
      ];
      
      const randomTitle = suggestions[Math.floor(Math.random() * suggestions.length)];
      setTitle(randomTitle);
      setIsGeneratingTitle(false);
      toast.success('Title generated!');
    }, 1500);
  };

  // Handle zero-knowledge toggle
  const handleZeroKnowledgeToggle = (checked: boolean) => {
    setIsZeroKnowledge(checked);
    
    if (checked) {
      // Zero-knowledge pastes are automatically unlisted
      setVisibility('unlisted');
      
      // Check browser support
      if (!isWebCryptoSupported()) {
        toast.error('Zero-knowledge encryption is not supported in your browser');
        setIsZeroKnowledge(false);
        return;
      }
      
      // Reset encryption state
      setEncryptionKey(null);
      setEncryptedContent('');
      setEncryptionReady(false);
      
      toast('Zero-knowledge mode enabled. Content will be encrypted client-side.');
      
      // Trigger initial encryption if content exists
      if (content.trim()) {
        performEncryption(content);
      }
    } else {
      // Clear encryption state
      setEncryptionKey(null);
      setEncryptedContent('');
      setEncryptionReady(false);
    }
  };

  // Visibility options configuration
  const visibilityOptions = [
    {
      id: 'public',
      icon: Globe,
      title: 'Public',
      description: 'Visible in archive and search results',
      available: !isZeroKnowledge, // Zero-knowledge pastes cannot be public
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-700 dark:text-green-300'
    },
    {
      id: 'unlisted',
      icon: Link2,
      title: 'Unlisted',
      description: isZeroKnowledge ? 'Required for zero-knowledge pastes' : 'Only accessible via direct link',
      available: true,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-700 dark:text-blue-300'
    },
    {
      id: 'private',
      icon: Lock,
      title: 'Private',
      description: isAuthenticated ? 'Only you can see this paste' : 'Requires account',
      available: isAuthenticated && !isZeroKnowledge, // Zero-knowledge pastes cannot be private
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-700 dark:text-purple-300'
    }
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Create New Paste
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            {isAuthenticated 
              ? 'Share your code with the world or keep it private for your projects'
              : 'Share your code with the world - no account required!'
            }
          </p>
        </div>

        {/* Anonymous User Info */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
          >
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Creating as Anonymous User
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  Your paste will be attributed to "Anonymous". You can make it public (visible in archive) or unlisted (only accessible via link). 
                  <span className="font-medium"> Private pastes require an account.</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Zero-Knowledge Warning */}
        {!isWebCryptoSupported() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-900 dark:text-red-300 mb-1">
                  Zero-Knowledge Encryption Unavailable
                </h3>
                <p className="text-sm text-red-800 dark:text-red-400">
                  Your browser doesn't support the Web Crypto API required for zero-knowledge encryption. 
                  Please use a modern browser like Chrome, Firefox, Safari, or Edge.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title and AI Generation */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Title
              </label>
              <button
                type="button"
                onClick={generateSmartTitle}
                disabled={isGeneratingTitle}
                className="flex items-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
              >
                <Wand2 className={`h-4 w-4 ${isGeneratingTitle ? 'animate-spin' : ''}`} />
                <span>{isGeneratingTitle ? 'Generating...' : 'AI Generate'}</span>
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for your paste"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>

          {/* Zero-Knowledge Encryption Option */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex items-center h-5">
                <input
                  id="zero-knowledge"
                  type="checkbox"
                  checked={isZeroKnowledge}
                  onChange={(e) => handleZeroKnowledgeToggle(e.target.checked)}
                  disabled={!isWebCryptoSupported()}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 rounded disabled:opacity-50"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="zero-knowledge" className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Enable Zero-Knowledge Encryption</span>
                  {isEncrypting && (
                    <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                      <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Encrypting...</span>
                    </div>
                  )}
                  {isZeroKnowledge && encryptionReady && (
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <Shield className="h-3 w-3" />
                      <span className="text-xs">Ready</span>
                    </div>
                  )}
                </label>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Your content will be encrypted in your browser before being sent to the server. 
                  Even we can't read it without the decryption key, which is stored in the URL fragment.
                </p>
                {isZeroKnowledge && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-800 dark:text-amber-300">
                        <strong>Important:</strong> Zero-knowledge pastes are automatically set to "Unlisted" and cannot be made public or private. 
                        Keep the full URL (including the #key part) safe - without it, the content cannot be decrypted.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settings Row */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-slate-100"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Expiration
                </label>
                <select
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-slate-100"
                >
                  {expirationOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Visibility Options - Redesigned */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              Visibility
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {visibilityOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = visibility === option.id;
                const isDisabled = !option.available;
                
                return (
                  <motion.div
                    key={option.id}
                    whileHover={option.available ? { scale: 1.02 } : {}}
                    whileTap={option.available ? { scale: 0.98 } : {}}
                    className={`relative cursor-pointer transition-all duration-200 ${
                      isDisabled ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    onClick={() => option.available && setVisibility(option.id as any)}
                  >
                    <div className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200
                      ${isSelected 
                        ? `${option.borderColor} ${option.bgColor} shadow-lg` 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                      ${isDisabled ? 'border-slate-200 dark:border-slate-700' : ''}
                    `}>
                      {/* Selection indicator */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center"
                        >
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </motion.div>
                      )}
                      
                      {/* Icon */}
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-all duration-200
                        ${isSelected 
                          ? `bg-gradient-to-r ${option.color} shadow-lg` 
                          : 'bg-slate-200 dark:bg-slate-700'
                        }
                      `}>
                        <Icon className={`h-6 w-6 ${
                          isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                        }`} />
                      </div>
                      
                      {/* Content */}
                      <div>
                        <h3 className={`font-semibold mb-1 transition-colors duration-200 ${
                          isSelected 
                            ? option.textColor 
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {option.title}
                        </h3>
                        <p className={`text-sm transition-colors duration-200 ${
                          isSelected 
                            ? option.textColor.replace('700', '600').replace('300', '400')
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {option.description}
                        </p>
                      </div>
                      
                      {/* Radio button (hidden but accessible) */}
                      <input
                        type="radio"
                        name="visibility"
                        value={option.id}
                        checked={isSelected}
                        onChange={() => option.available && setVisibility(option.id as any)}
                        disabled={!option.available}
                        className="sr-only"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="react, hooks, javascript, utility"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>

          {/* Code Editor */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Code Editor
                  {isZeroKnowledge && (
                    <span className="ml-2 inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                      <Shield className="h-3 w-3" />
                      <span>
                        {isEncrypting ? 'Encrypting...' : encryptionReady ? 'Encrypted' : 'Will Encrypt'}
                      </span>
                    </span>
                  )}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsPreview(false)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      !isPreview 
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreview(true)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      isPreview 
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>
              
              <button
                type="button"
                className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload File</span>
              </button>
            </div>

            <div className="p-6">
              {!isPreview ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={handleContentBlur}
                  placeholder="Paste your code here..."
                  className="w-full h-96 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
                  required
                />
              ) : (
                <div className="h-96 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-4 overflow-auto">
                  <pre className="text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap">
                    <code>{content || 'No content to preview'}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (isZeroKnowledge && !encryptionReady)}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isZeroKnowledge ? 'Creating Encrypted Paste...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Create Paste</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};