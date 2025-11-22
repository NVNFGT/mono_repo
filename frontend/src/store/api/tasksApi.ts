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
      providesTags: ['Task'],
      transformResponse: (response: any) => {
        // Handle paginated response from backend
        if (response.items) {
          return response.items
        }
        return response
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
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }],
    }),
    deleteTask: builder.mutation<void, number>({
      query: (id: number) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Task'],
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