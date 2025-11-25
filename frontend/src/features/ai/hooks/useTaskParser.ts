import { useState } from 'react';
import { useParseTaskMutation } from '../../../store/api/aiApi';
import type { ParsedTask, ParseTaskRequest } from '../types';

/**
 * Hook for parsing tasks with AI
 */
export function useTaskParser() {
  const [parseTask, { isLoading, error }] = useParseTaskMutation();
  const [lastParsedTask, setLastParsedTask] = useState<ParsedTask | null>(null);

  const parse = async (input: string, context?: ParseTaskRequest['context']) => {
    try {
      const result = await parseTask({ input, context }).unwrap();
      setLastParsedTask(result.parsedTask);
      return result;
    } catch (err) {
      console.error('Task parsing failed:', err);
      throw err;
    }
  };

  return {
    parse,
    isLoading,
    error,
    lastParsedTask,
  };
}