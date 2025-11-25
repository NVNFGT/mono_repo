import { useState, useEffect } from 'react';
import { useLazyGetTaskSuggestionsQuery } from '../../../store/api/aiApi';
import { useDebounce } from './useDebounce';
import type { TaskSuggestion } from '../types';

/**
 * Hook for getting smart suggestions with debouncing
 */
export function useSmartSuggestions(taskId?: string | number, input?: string) {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const debouncedInput = useDebounce(input || '', 1000);
  
  const [getSuggestions, { isLoading, error }] = useLazyGetTaskSuggestionsQuery();

  useEffect(() => {
    if (taskId && debouncedInput.trim().length > 5) {
      getSuggestions({
        taskId: String(taskId),
        input: debouncedInput,
      })
        .unwrap()
        .then((result) => {
          setSuggestions(result);
        })
        .catch((err) => {
          console.error('Failed to get suggestions:', err);
          setSuggestions([]);
        });
    } else {
      setSuggestions([]);
    }
  }, [taskId, debouncedInput, getSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    refresh: () => {
      if (taskId) {
        getSuggestions({
          taskId: String(taskId),
          input: input || '',
        });
      }
    },
  };
}