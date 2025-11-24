import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '../index'

// Get API URL from environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    headers.set('content-type', 'application/json')
    return headers
  },
  // Add timeout and retry logic
  timeout: 30000, // Increased to 30 seconds for development
})

// Enhanced base query with retry logic for backend connectivity
const baseQueryWithRetry = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions)
  
  // If network error or 5xx error, retry after a delay
  if (result.error && (result.error.status === 'FETCH_ERROR' || (typeof result.error.status === 'number' && result.error.status >= 500))) {
    console.warn('API request failed, retrying...', result.error)
    
    // Wait 2 seconds before retry
    await new Promise(resolve => setTimeout(resolve, 2000))
    result = await baseQuery(args, api, extraOptions)
  }
  
  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['User', 'Task'],
  endpoints: () => ({}),
})

export default api