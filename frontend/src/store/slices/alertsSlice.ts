import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AlertType } from '../../components/ui/Alert'

export interface AlertState {
  id: string
  type: AlertType
  title?: string
  message: string
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
  timestamp: number
}

interface AlertsState {
  alerts: AlertState[]
  maxAlerts: number
}

const initialState: AlertsState = {
  alerts: [],
  maxAlerts: 5
}

let alertIdCounter = 0

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addAlert: (state, action: PayloadAction<Omit<AlertState, 'id' | 'timestamp'> & { id?: string }>) => {
      const alert: AlertState = {
        ...action.payload,
        id: action.payload.id || `alert-${++alertIdCounter}`,
        timestamp: Date.now()
      }
      
      state.alerts.unshift(alert)
      
      // Keep only the maximum number of alerts
      if (state.alerts.length > state.maxAlerts) {
        state.alerts = state.alerts.slice(0, state.maxAlerts)
      }
    },
    
    removeAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload)
    },
    
    clearAllAlerts: (state) => {
      state.alerts = []
    },
    
    updateAlert: (state, action: PayloadAction<{ id: string; updates: Partial<AlertState> }>) => {
      const { id, updates } = action.payload
      const alertIndex = state.alerts.findIndex(alert => alert.id === id)
      if (alertIndex !== -1) {
        state.alerts[alertIndex] = { ...state.alerts[alertIndex], ...updates }
      }
    }
  }
})

export const { addAlert, removeAlert, clearAllAlerts, updateAlert } = alertsSlice.actions
export default alertsSlice.reducer

// Helper action creators for common alert types
export const showSuccessAlert = (message: string, title?: string, options?: Partial<AlertState>) => 
  addAlert({ type: 'success', message, title, duration: 4000, ...options })

export const showErrorAlert = (message: string, title?: string, options?: Partial<AlertState>) => 
  addAlert({ type: 'error', message, title, duration: 6000, ...options })

export const showWarningAlert = (message: string, title?: string, options?: Partial<AlertState>) => 
  addAlert({ type: 'warning', message, title, duration: 5000, ...options })

export const showInfoAlert = (message: string, title?: string, options?: Partial<AlertState>) => 
  addAlert({ type: 'info', message, title, duration: 4000, ...options })