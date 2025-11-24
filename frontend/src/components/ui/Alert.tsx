import React from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { Button } from './Button'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertProps {
  id?: string
  type: AlertType
  title?: string
  message: string
  duration?: number
  dismissible?: boolean
  onDismiss?: (id?: string) => void
  action?: {
    label: string
    onClick: () => void
  }
}

const alertStyles = {
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-200',
    icon: 'text-emerald-600 dark:text-emerald-400',
    IconComponent: CheckCircle
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
    IconComponent: AlertCircle
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-200',
    icon: 'text-amber-600 dark:text-amber-400',
    IconComponent: AlertTriangle
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
    IconComponent: Info
  }
}

export function Alert({ 
  id,
  type, 
  title, 
  message, 
  dismissible = true, 
  onDismiss,
  action 
}: AlertProps) {
  const style = alertStyles[type]
  const { IconComponent } = style

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(id)
    }
  }

  return (
    <div className={`
      relative flex items-start gap-2.5 p-3 border rounded-lg shadow-sm animate-fade-in
      ${style.container}
    `}>
      <IconComponent className={`h-4 w-4 mt-0.5 flex-shrink-0 ${style.icon}`} />
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-medium text-xs mb-0.5">{title}</h4>
        )}
        <p className="text-xs leading-relaxed">{message}</p>
        
        {action && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="h-6 px-2 text-xs"
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>

      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-5 w-5 hover:bg-black/5 dark:hover:bg-white/5 text-current opacity-70 hover:opacity-100 flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}