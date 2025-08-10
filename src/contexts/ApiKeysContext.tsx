"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface ApiKeys {
  anthropic: string;
  openai: string;
  google: string;
}

export interface SelectedModels {
  anthropic: string;
  openai: string;
  google: string;
}

interface ApiKeysContextType {
  apiKeys: ApiKeys;
  selectedModels: SelectedModels;
  updateApiKey: (provider: keyof ApiKeys, key: string) => void;
  updateSelectedModel: (provider: keyof SelectedModels, model: string) => void;
  clearApiKey: (provider: keyof ApiKeys) => void;
  clearAllApiKeys: () => void;
  hasAnyKeys: boolean;
}

const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

const DEFAULT_API_KEYS: ApiKeys = {
  anthropic: '',
  openai: '',
  google: '',
};

const DEFAULT_SELECTED_MODELS: SelectedModels = {
  anthropic: 'claude-opus-4-1-20250805',
  openai: 'gpt-5',
  google: 'gemini-2.5-pro',
};

const STORAGE_KEY = 'llm-cross-ref-api-keys';
const MODELS_STORAGE_KEY = 'llm-cross-ref-selected-models';

export function ApiKeysProvider({ children }: { children: React.ReactNode }) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(DEFAULT_API_KEYS);
  const [selectedModels, setSelectedModels] = useState<SelectedModels>(DEFAULT_SELECTED_MODELS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load API keys and models from localStorage on mount
  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem(STORAGE_KEY);
      if (storedKeys) {
        const parsedKeys = JSON.parse(storedKeys);
        setApiKeys({ ...DEFAULT_API_KEYS, ...parsedKeys });
      }
      
      const storedModels = localStorage.getItem(MODELS_STORAGE_KEY);
      if (storedModels) {
        const parsedModels = JSON.parse(storedModels);
        setSelectedModels({ ...DEFAULT_SELECTED_MODELS, ...parsedModels });
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
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

  // Save selected models to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(selectedModels));
      } catch (error) {
        console.error('Failed to save selected models to localStorage:', error);
      }
    }
  }, [selectedModels, isLoaded]);

  const updateApiKey = (provider: keyof ApiKeys, key: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: key.trim(),
    }));
  };

  const updateSelectedModel = (provider: keyof SelectedModels, model: string) => {
    setSelectedModels(prev => ({
      ...prev,
      [provider]: model,
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
      selectedModels,
      updateApiKey,
      updateSelectedModel,
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
