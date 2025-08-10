"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface ApiKeys {
  openai: string;
  anthropic: string;
  google: string;
  cohere: string;
}

interface ApiKeysContextType {
  apiKeys: ApiKeys;
  updateApiKey: (provider: keyof ApiKeys, key: string) => void;
  clearApiKey: (provider: keyof ApiKeys) => void;
  clearAllApiKeys: () => void;
  hasAnyKeys: boolean;
}

const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

const DEFAULT_API_KEYS: ApiKeys = {
  openai: '',
  anthropic: '',
  google: '',
  cohere: '',
};

const STORAGE_KEY = 'llm-cross-ref-api-keys';

export function ApiKeysProvider({ children }: { children: React.ReactNode }) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(DEFAULT_API_KEYS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load API keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setApiKeys({ ...DEFAULT_API_KEYS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load API keys from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save API keys to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys));
      } catch (error) {
        console.error('Failed to save API keys to localStorage:', error);
      }
    }
  }, [apiKeys, isLoaded]);

  const updateApiKey = (provider: keyof ApiKeys, key: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: key.trim(),
    }));
  };

  const clearApiKey = (provider: keyof ApiKeys) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: '',
    }));
  };

  const clearAllApiKeys = () => {
    setApiKeys(DEFAULT_API_KEYS);
  };

  const hasAnyKeys = Object.values(apiKeys).some(key => key.length > 0);

  if (!isLoaded) {
    return null; // Prevent hydration issues
  }

  return (
    <ApiKeysContext.Provider value={{
      apiKeys,
      updateApiKey,
      clearApiKey,
      clearAllApiKeys,
      hasAnyKeys,
    }}>
      {children}
    </ApiKeysContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeysContext);
  if (context === undefined) {
    throw new Error('useApiKeys must be used within an ApiKeysProvider');
  }
  return context;
}
