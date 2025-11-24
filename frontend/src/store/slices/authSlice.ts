import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '../api/authApi'
import { api } from '../api/apiSlice'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

const token = localStorage.getItem('token')

const initialState: AuthState = {
  user: null,
  token,
  isAuthenticated: !!token,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      localStorage.setItem('token', action.payload.token)
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
  },

})

export const { setCredentials, logout, setUser } = authSlice.actions
export default authSlice.reducer