import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ITool, ICategory } from '../types/tool';

interface AppState {
  categories: ICategory[];
  tools: ITool[];
  selectedCategory: string | null;
  selectedTool: ITool | null;
  searchQuery: string;
  filteredTools: ITool[];
  isLoading: boolean;
}

type AppAction =
  | { type: 'SET_CATEGORIES'; payload: ICategory[] }
  | { type: 'SET_TOOLS'; payload: ITool[] }
  | { type: 'SELECT_CATEGORY'; payload: string | null }
  | { type: 'SELECT_TOOL'; payload: ITool | null }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTERED_TOOLS'; payload: ITool[] }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AppState = {
  categories: [],
  tools: [],
  selectedCategory: null,
  selectedTool: null,
  searchQuery: '',
  filteredTools: [],
  isLoading: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_TOOLS':
      return { ...state, tools: action.payload, filteredTools: action.payload };
    case 'SELECT_CATEGORY':
      return { ...state, selectedCategory: action.payload, selectedTool: null };
    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_FILTERED_TOOLS':
      return { ...state, filteredTools: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
