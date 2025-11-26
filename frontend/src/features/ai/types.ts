/**
 * AI Feature Types
 */

export interface ParsedTask {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: any; // Can be structured date object or string
  category?: string;
  estimatedDurationMinutes?: number;
  confidence: number;
}

export interface TaskSuggestion {
  id: string;
  type: 'priority' | 'due_date' | 'description' | 'category' | 'breakdown' | 'reminder' | 'delegation' | 'priority_clarification' | 'description_improve';
  source?: string;
  suggestion: string;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, any>;
}

export interface AIInsight {
  id: string;
  taskId: string;
  insightType: 'priority_suggestion' | 'due_date_prediction' | 'category_classification';
  confidenceScore: number;
  analysisData: Record<string, unknown>;
  createdAt: string;
}

export interface TaskPrediction {
  id: string;
  taskId: string;
  predictedCompletionTime?: number;
  predictedPriority?: 'low' | 'medium' | 'high';
  predictionConfidence: number;
  modelVersion: string;
  featuresUsed: Record<string, unknown>;
  createdAt: string;
}

export interface UserPattern {
  id: string;
  userId: string;
  patternType: 'productivity_peak' | 'task_preference' | 'completion_rate';
  patternData: Record<string, unknown>;
  confidenceScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmartTaskFormProps {
  initialValue?: string;
  onTaskParsed?: (parsedTask: ParsedTask) => void;
  onSuggestionApplied?: (suggestion: TaskSuggestion) => void;
  className?: string;
}

export interface AIServiceConfig {
  apiBaseUrl: string;
  enableRealTimeSuggestions: boolean;
  suggestionDebounceMs: number;
}

export interface ParseTaskRequest {
  input: string;
  context?: {
    existingTasks?: string[];
    userPreferences?: Record<string, unknown>;
  };
}

export interface ParseTaskResponse {
  parsedTask: ParsedTask;
  suggestions: TaskSuggestion[];
  alternatives: ParsedTask[];
}