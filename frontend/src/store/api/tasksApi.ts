import { api } from './apiSlice'

export interface Task {
  id: number
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  created_at: string
  user_id?: number
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  due_date?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high'
  due_date?: string
}

export const tasksApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], void>({
      query: () => '/tasks/',
      providesTags: ['Task'], // Simplified - cache clearing on logout handles user isolation
      transformResponse: (response: Task[] | { items: Task[] }) => {
        // Handle paginated response from backend
        if ('items' in response && Array.isArray(response.items)) {
          return response.items
        }
        return response as Task[]
      },
    }),
    getTask: builder.query<Task, number>({
      query: (id: number) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation<Task, CreateTaskRequest>({
      query: (task: CreateTaskRequest) => ({
        url: '/tasks/',
        method: 'POST',
        body: task,
      }),
      invalidatesTags: ['Task'],
    }),
    updateTask: builder.mutation<Task, { id: number; task: UpdateTaskRequest }>({
      query: ({ id, task }: { id: number; task: UpdateTaskRequest }) => ({
        url: `/tasks/${id}`,
        method: 'PUT',
        body: task,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        'Task', // This invalidates the entire tasks list cache
      ],
      // Optimistic update - update cache immediately before request completes
      onQueryStarted: async ({ id, task }, { dispatch, queryFulfilled }) => {
        // Optimistically update the individual task cache
        const taskPatchResult = dispatch(
          tasksApi.util.updateQueryData('getTask', id, (draft) => {
            Object.assign(draft, task)
          })
        )
        
        // Optimistically update the tasks list cache
        const listPatchResult = dispatch(
          tasksApi.util.updateQueryData('getTasks', undefined, (draft) => {
            const taskIndex = draft.findIndex((t) => t.id === id)
            if (taskIndex !== -1) {
              Object.assign(draft[taskIndex], task)
            }
          })
        )

        try {
          await queryFulfilled
        } catch {
          // If the update fails, revert the optimistic updates
          taskPatchResult.undo()
          listPatchResult.undo()
        }
      },
    }),
    deleteTask: builder.mutation<void, number>({
      query: (id: number) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Task', id },
        'Task', // This invalidates the entire tasks list cache
      ],
    }),
  }),
})

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = tasksApi