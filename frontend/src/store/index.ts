import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { api } from './api/apiSlice'
import authReducer from './slices/authSlice'
import alertsReducer from './slices/alertsSlice'

// Middleware to clear RTK Query cache on logout
const cacheInvalidationMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action)
  
  // Clear all cached data when user logs out to prevent cross-user data contamination
  if (action.type === 'auth/logout') {
    store.dispatch(api.util.resetApiState())
  }
  
  return result
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    alerts: alertsReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })
    .concat(api.middleware)
    .concat(cacheInvalidationMiddleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch