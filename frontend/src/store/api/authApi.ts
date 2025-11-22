import { api } from './apiSlice'

export interface User {
  id: number
  username: string
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user?: User
  id?: number
  username?: string
  email?: string
}

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials: LoginRequest) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: any) => {
        // Handle backend response format
        if (response.user && response.token) {
          return { 
            token: response.token, 
            user: response.user 
          }
        }
        // Handle direct user data response
        return {
          token: response.token,
          user: {
            id: response.id,
            username: response.username,
            email: response.email
          }
        }
      },
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData: RegisterRequest) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      transformResponse: (response: any) => {
        // Handle backend response format
        if (response.user && response.token) {
          return { 
            token: response.token, 
            user: response.user 
          }
        }
        // Handle direct user data response
        return {
          token: response.token,
          user: {
            id: response.id,
            username: response.username,
            email: response.email
          }
        }
      },
    }),
    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
} = authApi