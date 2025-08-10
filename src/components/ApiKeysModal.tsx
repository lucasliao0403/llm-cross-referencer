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
    key: 'anthropic' as keyof ApiKeys,
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    description: 'For Claude models',
    color: 'amber',
    models: [
      { value: 'claude-opus-4-1-20250805', label: 'Claude Opus 4.1' },
      { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    ]
  },
  {
    key: 'openai' as keyof ApiKeys,
    label: 'OpenAI',
    placeholder: 'sk-...',
    description: 'For GPT models',
    color: 'emerald',
    models: [
      { value: 'gpt-5', label: 'GPT-5' },
      { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'o3', label: 'o3' },
    ]
  },
  {
    key: 'google' as keyof ApiKeys,
    label: 'Google',
    placeholder: 'AI...',
    description: 'For Gemini models',
    color: 'blue',
    models: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    ]
  },
] as const;

export default function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const { apiKeys, selectedModels, updateApiKey, updateSelectedModel, clearApiKey, clearAllApiKeys } = useApiKeys();
  const [showKeys, setShowKeys] = useState<Record<keyof ApiKeys, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });

  const handleApiKeyChange = (provider: keyof ApiKeys, value: string) => {
    updateApiKey(provider, value);
  };

  const handleModelChange = (provider: keyof ApiKeys, value: string) => {
    updateSelectedModel(provider, value);
  };

  const handleClearAll = () => {
    clearAllApiKeys();
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
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="retro-heading text-2xl font-medium">Settings</h2>
                  <p className="text-sm text-ink-muted/80 mt-1">
                    Configure API keys and choose models.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-black/5 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink/60">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* API Key Inputs */}
              <div className="space-y-6 mb-8">
                {API_PROVIDERS.map(({ key, label, placeholder, description, color, models }) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-ink/90">{label}</label>
                        <p className="text-xs text-ink-muted/70">{description}</p>
                      </div>
                      <button
                        onClick={() => handleApiKeyChange(key, '')}
                        className="text-xs text-red-600/80 hover:text-red-600 transition-colors"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Model Selection */}
                    <div>
                      <label className="text-xs font-medium text-ink/70 mb-2 block">Model</label>
                      <div className="relative">
                        <select
                          value={selectedModels[key]}
                          onChange={(e) => handleModelChange(key, e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 rounded-lg border border-card-border bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20 transition-all appearance-none"
                        >
                          {models.map(({ value, label: modelLabel }) => (
                            <option key={value} value={value}>
                              {modelLabel}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-ink/60">
                            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input
                        type={showKeys[key] ? "text" : "password"}
                        value={apiKeys[key]}
                        onChange={(e) => handleApiKeyChange(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-card-border bg-white/60 backdrop-blur-sm placeholder:text-ink-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20 transition-all font-mono"
                      />
                      
                      <button
                        type="button"
                        onClick={() => toggleShowKey(key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5 transition-colors z-10"
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
                    </div>
                  </div>
                ))}
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-white">
                      <path d="M6 8.5V6M6 3.5H6.005M10.5 6C10.5 8.485 8.485 10.5 6 10.5C3.515 10.5 1.5 8.485 1.5 6C1.5 3.515 3.515 1.5 6 1.5C8.485 1.5 10.5 3.515 10.5 6Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-xs text-blue-800/80">
                    <span className="font-medium text-blue-900">Privacy:</span> Your API keys are stored locally and sent directly to AI providers. They are never stored on our servers.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-600/80 hover:text-red-600 transition-colors"
                  disabled={!Object.values(apiKeys).some(key => key.length > 0)}
                >
                  Clear all keys
                </button>
                
                <button
                  onClick={onClose}
                  className="neo-btn text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
