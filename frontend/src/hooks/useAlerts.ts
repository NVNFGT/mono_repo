import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../store'
import { 
  addAlert,
  removeAlert,
  clearAllAlerts,
  showSuccessAlert,
  showErrorAlert,
  showWarningAlert,
  showInfoAlert,
  type AlertState
} from '../store/slices/alertsSlice'
import type { AlertType } from '../components/ui/Alert'

export function useAlerts() {
  const dispatch = useDispatch<AppDispatch>()

  const alert = {
    success: (message: string, title?: string, options?: Partial<AlertState>) => {
      dispatch(showSuccessAlert(message, title, options))
    },
    
    error: (message: string, title?: string, options?: Partial<AlertState>) => {
      dispatch(showErrorAlert(message, title, options))
    },
    
    warning: (message: string, title?: string, options?: Partial<AlertState>) => {
      dispatch(showWarningAlert(message, title, options))
    },
    
    info: (message: string, title?: string, options?: Partial<AlertState>) => {
      dispatch(showInfoAlert(message, title, options))
    },
    
    custom: (type: AlertType, message: string, title?: string, options?: Partial<AlertState>) => {
      dispatch(addAlert({ type, message, title, duration: 4000, ...options }))
    },
    
    dismiss: (id: string) => {
      dispatch(removeAlert(id))
    },
    
    clear: () => {
      dispatch(clearAllAlerts())
    }
  }

  // Helper methods for common scenarios
  const notify = {
    taskCreated: (taskTitle: string) => {
      alert.success(`Task "${taskTitle}" created successfully`, 'Task Created')
    },
    
    taskUpdated: (taskTitle: string) => {
      alert.success(`Task "${taskTitle}" updated successfully`, 'Task Updated')
    },
    
    taskDeleted: (taskTitle: string) => {
      alert.success(`Task "${taskTitle}" deleted successfully`, 'Task Deleted')
    },
    
    taskCompleted: (taskTitle: string) => {
      alert.success(`Task "${taskTitle}" marked as completed`, 'Task Completed')
    },
    
    loginSuccess: (username: string) => {
      alert.success(`Welcome back, ${username}!`, 'Login Successful')
    },
    
    loginError: (error?: string) => {
      alert.error(error || 'Invalid credentials. Please try again.', 'Login Failed')
    },
    
    registerSuccess: (username: string) => {
      alert.success(`Account created successfully! Welcome, ${username}!`, 'Registration Successful')
    },
    
    registerError: (error?: string) => {
      alert.error(error || 'Registration failed. Please try again.', 'Registration Failed')
    },
    
    networkError: () => {
      alert.error('Unable to connect to the server. Please check your internet connection.', 'Network Error')
    },
    
    unexpectedError: (error?: string) => {
      alert.error(error || 'An unexpected error occurred. Please try again.', 'Error')
    },
    
    saveError: () => {
      alert.error('Failed to save changes. Please try again.', 'Save Failed')
    },
    
    deleteConfirmation: (itemName: string, onConfirm: () => void) => {
      const alertId = `delete-confirm-${Date.now()}`
      alert.warning(`Are you sure you want to delete "${itemName}"?`, 'Confirm Deletion', {
        id: alertId,
        action: {
          label: 'Delete',
          onClick: () => {
            onConfirm()
            alert.dismiss(alertId)
          }
        },
        duration: 0 // Don't auto-dismiss confirmation alerts
      })
    },
    
    overdueTask: (taskTitle: string, dueDate: string) => {
      alert.warning(`Task "${taskTitle}" was due on ${dueDate}`, 'Overdue Task')
    },
    
    dueSoon: (taskTitle: string, dueDate: string) => {
      alert.info(`Task "${taskTitle}" is due on ${dueDate}`, 'Upcoming Deadline')
    }
  }

  return { alert, notify }
}