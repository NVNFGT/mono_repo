import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { useGetMeQuery } from '../store/api/authApi'
import { useGetTasksQuery } from '../store/api/tasksApi'
import { setUser } from '../store/slices/authSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { TaskList } from '../components/TaskList'

export function DashboardPage() {
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const { data: userData, isLoading } = useGetMeQuery()
  const { data: tasks = [] } = useGetTasksQuery()

  useEffect(() => {
    if (userData && !user) {
      dispatch(setUser(userData))
    }
  }, [userData, user, dispatch])

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username || 'User'}!
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks Overview</CardTitle>
              <CardDescription>
                Your task management summary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
              <p className="text-xs text-muted-foreground">
                Total tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completed</CardTitle>
              <CardDescription>
                Tasks you've finished
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.filter(task => task.status === 'completed').length}</div>
              <p className="text-xs text-muted-foreground">
                Completed tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending</CardTitle>
              <CardDescription>
                Tasks still to do
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.filter(task => task.status !== 'completed').length}</div>
              <p className="text-xs text-muted-foreground">
                Pending tasks
              </p>
            </CardContent>
          </Card>
        </div>

        <TaskList />
      </div>
    </div>
  )
}