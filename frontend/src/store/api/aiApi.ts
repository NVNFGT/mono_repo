import { api } from './apiSlice'
import type { 
  ParseTaskRequest, 
  ParseTaskResponse, 
  AIInsight, 
  TaskPrediction, 
  TaskSuggestion 
} from '../../features/ai/types'

export const aiApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Parse task from natural language input
    parseTask: builder.mutation<ParseTaskResponse, ParseTaskRequest>({
      query: (data) => ({
        url: '/ai/parse-task',
        method: 'POST',
        body: data,
      }),
    }),

    // Get AI suggestions for task improvements
    getTaskSuggestions: builder.query<TaskSuggestion[], { taskId: string; input?: string }>({
      query: ({ taskId, input }) => ({
        url: `/ai/suggest-improvements/${taskId}`,
        method: 'GET',
        params: input ? { input } : undefined,
      }),
    }),

    // Get AI insights for a specific task
    getTaskInsights: builder.query<AIInsight[], string>({
      query: (taskId) => ({
        url: `/ai/insights/${taskId}`,
        method: 'GET',
      }),
      providesTags: (result, error, taskId) => [{ type: 'Task', id: taskId }],
    }),

    // Get AI predictions for a task
    getTaskPredictions: builder.query<TaskPrediction[], string>({
      query: (taskId) => ({
        url: `/ai/predictions/${taskId}`,
        method: 'GET',
      }),
      providesTags: (result, error, taskId) => [{ type: 'Task', id: taskId }],
    }),

    // Generate AI insights for all user tasks
    generateInsights: builder.mutation<{ message: string; insights: AIInsight[] }, void>({
      query: () => ({
        url: '/ai/generate-insights',
        method: 'POST',
      }),
      invalidatesTags: ['Task'],
    }),

    // Get smart task auto-complete suggestions
    getAutocompleteSuggestions: builder.query<string[], string>({
      query: (input) => ({
        url: '/ai/autocomplete',
        method: 'GET',
        params: { input },
      }),
      // Only keep the last 5 queries in cache
      keepUnusedDataFor: 30, // 30 seconds
    }),

    // Validate AI service health
    checkAIHealth: builder.query<{ status: string; model: string; features: string[] }, void>({
      query: () => ({
        url: '/ai/health',
        method: 'GET',
      }),
    }),
  }),
})

export const {
  useParseTaskMutation,
  useGetTaskSuggestionsQuery,
  useLazyGetTaskSuggestionsQuery,
  useGetTaskInsightsQuery,
  useGetTaskPredictionsQuery,
  useGenerateInsightsMutation,
  useGetAutocompleteSuggestionsQuery,
  useLazyGetAutocompleteSuggestionsQuery,
  useCheckAIHealthQuery,
} = aiApi