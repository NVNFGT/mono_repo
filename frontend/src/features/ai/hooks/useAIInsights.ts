import { useGetTaskInsightsQuery, useGetTaskPredictionsQuery } from '../../../store/api/aiApi';
import type { AIInsight, TaskPrediction } from '../types';

/**
 * Hook for getting AI insights for a task
 */
export function useAIInsights(taskId: string | number) {
  const {
    data: insights,
    isLoading,
    error,
    refetch,
  } = useGetTaskInsightsQuery(String(taskId), {
    skip: !taskId,
  });

  const {
    data: predictions,
    isLoading: isPredictionsLoading,
    error: predictionsError,
    refetch: refetchPredictions,
  } = useGetTaskPredictionsQuery(String(taskId), {
    skip: !taskId,
  });

  return {
    insights: insights || [],
    predictions: predictions || [],
    isLoading: isLoading || isPredictionsLoading,
    error: error || predictionsError,
    refetch: () => {
      refetch();
      refetchPredictions();
    },
  };
}