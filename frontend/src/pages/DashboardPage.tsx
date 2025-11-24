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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-8">
          {/* Enhanced Header */}
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto">
              Welcome back, <span className="font-semibold text-foreground">{user?.username || 'User'}</span>! 
              Here's your productivity overview.
            </p>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-slide-up">
            <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-violet-500/10 to-purple-500/5">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-xl" />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-violet-700 dark:text-violet-300">
                  Tasks Overview
                </CardTitle>
                <CardDescription className="text-sm">
                  Your complete task summary
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{tasks.length}</div>
                <p className="text-sm text-muted-foreground/80">
                  Total tasks created
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-xl" />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                  Completed
                </CardTitle>
                <CardDescription className="text-sm">
                  Tasks you've accomplished
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {tasks.filter(task => task.status === 'completed').length}
                </div>
                <p className="text-sm text-muted-foreground/80">
                  Finished tasks
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-amber-500/10 to-orange-500/5 md:col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-xl" />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                  In Progress
                </CardTitle>
                <CardDescription className="text-sm">
                  Tasks awaiting completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {tasks.filter(task => task.status !== 'completed').length}
                </div>
                <p className="text-sm text-muted-foreground/80">
                  Pending tasks
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Task List */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <TaskList />
          </div>
        </div>
      </div>
    </div>
  )
}