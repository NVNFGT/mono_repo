import React from 'react'
import { useAlerts } from '../hooks/useAlerts'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'

export function AlertDemo() {
  const { alert, notify } = useAlerts()

  const demoAlerts = () => {
    // Basic alerts
    alert.success('This is a success message!', 'Success')
    
    setTimeout(() => {
      alert.error('This is an error message!', 'Error')
    }, 500)
    
    setTimeout(() => {
      alert.warning('This is a warning message!', 'Warning')
    }, 1000)
    
    setTimeout(() => {
      alert.info('This is an info message!', 'Information')
    }, 1500)
    
    // Custom alert with action
    setTimeout(() => {
      alert.custom('warning', 'Do you want to continue?', 'Confirmation', {
        action: {
          label: 'Yes, Continue',
          onClick: () => alert.success('You clicked continue!', 'Action Executed')
        },
        duration: 0 // Don't auto-dismiss
      })
    }, 2000)
  }

  const demoNotifications = () => {
    notify.taskCreated('Sample Task')
    
    setTimeout(() => {
      notify.loginSuccess('John Doe')
    }, 500)
    
    setTimeout(() => {
      notify.overdueTask('Complete Project', '2024-01-15')
    }, 1000)
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Alert System Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={demoAlerts} className="w-full">
          Show All Alert Types
        </Button>
        
        <Button onClick={demoNotifications} variant="outline" className="w-full">
          Show Notification Examples
        </Button>
        
        <Button 
          onClick={() => alert.clear()} 
          variant="destructive" 
          className="w-full"
        >
          Clear All Alerts
        </Button>
      </CardContent>
    </Card>
  )
}