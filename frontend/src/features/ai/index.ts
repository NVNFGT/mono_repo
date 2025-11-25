/**
 * AI Features Module
 * 
 * This module provides AI-powered features for the todo app including:
 * - Smart task parsing and suggestions
 * - Priority prediction
 * - Natural language processing
 * - Task insights and analytics
 */

// Components
export { default as SmartTaskForm } from './components/SmartTaskForm';
export { default as AIInsights } from './components/AIInsights';
export { default as TaskSuggestions } from './components/TaskSuggestions';

// Hooks
export { useTaskParser } from './hooks/useTaskParser';
export { useAIInsights } from './hooks/useAIInsights';
export { useSmartSuggestions } from './hooks/useSmartSuggestions';

// Services
export { aiService } from './services/aiService';

// Types
export type * from './types';