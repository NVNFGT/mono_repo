import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../../store'
import { removeAlert } from '../../store/slices/alertsSlice'
import { Alert } from './Alert'

export function AlertContainer() {
  const dispatch = useDispatch()
  const alerts = useSelector((state: RootState) => state.alerts.alerts)

  const handleDismiss = (id: string) => {
    dispatch(removeAlert(id))
  }

  // Auto-dismiss alerts with duration
  useEffect(() => {
    const timers = alerts
      .filter(alert => alert.duration && alert.duration > 0)
      .map(alert => {
        return setTimeout(() => {
          dispatch(removeAlert(alert.id))
        }, alert.duration)
      })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [alerts, dispatch])

  if (alerts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className="transform transition-all duration-300 ease-in-out"
          style={{
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <Alert
            id={alert.id}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            dismissible={alert.dismissible}
            onDismiss={handleDismiss}
            action={alert.action}
          />
        </div>
      ))}
      
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}