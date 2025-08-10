"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiKeys, type ApiKeys } from '../contexts/ApiKeysContext';

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_PROVIDERS = [
  {
    key: 'openai' as keyof ApiKeys,
    label: 'OpenAI',
    placeholder: 'sk-...',
    description: 'For GPT models',
    color: 'emerald',
  },
  {
    key: 'anthropic' as keyof ApiKeys,
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    description: 'For Claude models',
    color: 'amber',
  },
  {
    key: 'google' as keyof ApiKeys,
    label: 'Google',
    placeholder: 'AI...',
    description: 'For Gemini models',
    color: 'blue',
  },
  {
    key: 'cohere' as keyof ApiKeys,
    label: 'Cohere',
    placeholder: 'co_...',
    description: 'For Command models',
    color: 'purple',
  },
] as const;

export default function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const { apiKeys, updateApiKey, clearApiKey, clearAllApiKeys } = useApiKeys();
  const [localKeys, setLocalKeys] = useState<ApiKeys>(apiKeys);
  const [showKeys, setShowKeys] = useState<Record<keyof ApiKeys, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
    cohere: false,
  });

  const handleSave = () => {
    Object.entries(localKeys).forEach(([provider, key]) => {
      updateApiKey(provider as keyof ApiKeys, key);
    });
    onClose();
  };

  const handleCancel = () => {
    setLocalKeys(apiKeys);
    onClose();
  };

  const handleClearAll = () => {
    setLocalKeys({ openai: '', anthropic: '', google: '', cohere: '' });
  };

  const toggleShowKey = (provider: keyof ApiKeys) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.substring(0, 4) + '•'.repeat(Math.max(key.length - 8, 4)) + key.substring(key.length - 4);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={handleCancel}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="retro-heading text-2xl font-medium">API Settings</h2>
                  <p className="text-sm text-ink-muted/80 mt-1">
                    Enter your own API keys
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink/60">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* API Key Inputs */}
              <div className="space-y-6 mb-8">
                {API_PROVIDERS.map(({ key, label, placeholder, description, color }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-ink/90">{label}</label>
                        <p className="text-xs text-ink-muted/70">{description}</p>
                      </div>
                      {localKeys[key] && (
                        <button
                          onClick={() => setLocalKeys(prev => ({ ...prev, [key]: '' }))}
                          className="text-xs text-red-600/80 hover:text-red-600 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    <div className="relative">
                      <input
                        type={showKeys[key] ? "text" : "password"}
                        value={localKeys[key]}
                        onChange={(e) => setLocalKeys(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 rounded-xl border border-card-border bg-white/60 backdrop-blur-sm placeholder:text-ink-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20 transition-all"
                      />
                      
                      {localKeys[key] && (
                        <button
                          type="button"
                          onClick={() => toggleShowKey(key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5 transition-colors"
                        >
                          {showKeys[key] ? (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink/60">
                              <path d="M10.5 8C10.5 9.38 9.38 10.5 8 10.5C6.62 10.5 5.5 9.38 5.5 8C5.5 6.62 6.62 5.5 8 5.5C9.38 5.5 10.5 6.62 10.5 8Z" stroke="currentColor" strokeWidth="1.2"/>
                              <path d="M8 2C4.5 2 1.73 4.11 1 8C1.73 11.89 4.5 14 8 14C11.5 14 14.27 11.89 15 8C14.27 4.11 11.5 2 8 2Z" stroke="currentColor" strokeWidth="1.2"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink/60">
                              <path d="M9.88 10.12C9.42 10.2 8.96 10.25 8.5 10.25C5.02 10.25 2.25 8.14 1.52 4.25C2.06 5.08 2.79 5.8 3.68 6.34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                              <path d="M6.12 5.88C6.58 5.8 7.04 5.75 7.5 5.75C10.98 5.75 13.75 7.86 14.48 11.75C13.94 10.92 13.21 10.2 12.32 9.66" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                              <path d="M12.5 3.5L3.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {localKeys[key] && !showKeys[key] && (
                      <div className="text-xs text-ink-muted/60 font-mono">
                        Key: {maskKey(localKeys[key])}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-white">
                      <path d="M6 8.5V6M6 3.5H6.005M10.5 6C10.5 8.485 8.485 10.5 6 10.5C3.515 10.5 1.5 8.485 1.5 6C1.5 3.515 3.515 1.5 6 1.5C8.485 1.5 10.5 3.515 10.5 6Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Privacy & Security</h4>
                    <p className="text-xs text-blue-800/80 leading-relaxed">
                      Your API keys are stored locally in your browser and sent directly to the respective AI providers. 
                      They are never stored on our servers or transmitted to any third parties.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-600/80 hover:text-red-600 transition-colors"
                  disabled={!Object.values(localKeys).some(key => key.length > 0)}
                >
                  Clear all keys
                </button>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 text-sm font-medium text-ink/80 hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="neo-btn text-sm font-medium"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
