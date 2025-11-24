import { useState, useMemo, useEffect } from 'react'
import { useGetTasksQuery, useDeleteTaskMutation, useUpdateTaskMutation, type Task } from '../store/api/tasksApi'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { TaskForm } from './TaskForm'
import { useAlerts } from '../hooks/useAlerts'
import { Trash2, Edit2, Check, Plus, Search, Keyboard, Clock, Target } from 'lucide-react'

export function TaskList() {
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const { data: tasks = [], isLoading, error } = useGetTasksQuery()
  const [deleteTask] = useDeleteTaskMutation()
  const [updateTask] = useUpdateTaskMutation()
  const { alert, notify } = useAlerts()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault()
            setShowCreateForm(true)
            break
          case 'f':
            e.preventDefault()
            document.getElementById('task-search')?.focus()
            break
          case '?':
            e.preventDefault()
            setShowKeyboardShortcuts(!showKeyboardShortcuts)
            break
        }
      }
      if (e.key === 'Escape') {
        setShowCreateForm(false)
        setEditingTask(null)
        setShowKeyboardShortcuts(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showKeyboardShortcuts])

  const handleDelete = async (task: Task) => {
    const confirmDelete = () => {
      deleteTask(task.id).unwrap()
        .then(() => {
          notify.taskDeleted(task.title)
        })
        .catch((error) => {
          console.error('Failed to delete task:', error)
          notify.saveError()
        })
    }

    notify.deleteConfirmation(task.title, confirmDelete)
  }

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed'
      await updateTask({
        id: task.id,
        task: { status: newStatus }
      }).unwrap()
      
      if (newStatus === 'completed') {
        notify.taskCompleted(task.title)
      } else {
        alert.info(`Task "${task.title}" marked as ${newStatus}`, 'Task Updated')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      notify.saveError()
    }
  }

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = searchQuery.length === 0 || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter])

  const taskStats = useMemo(() => {
    const completed = filteredTasks.filter(t => t.status === 'completed').length
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length
    const pending = filteredTasks.filter(t => t.status === 'pending').length
    const overdue = filteredTasks.filter(t => {
      if (!t.due_date) return false
      return new Date(t.due_date) < new Date() && t.status !== 'completed'
    }).length
    
    return { completed, inProgress, pending, overdue, total: filteredTasks.length }
  }, [filteredTasks])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Loading tasks...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-destructive">Failed to load tasks</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Tasks
            </h2>
            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                {taskStats.completed} completed
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                {taskStats.inProgress} in progress
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                {taskStats.pending} pending
              </span>
              {taskStats.overdue > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  {taskStats.overdue} overdue
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
              title="Keyboard shortcuts (Ctrl+?)"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowCreateForm(true)} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="task-search"
              placeholder="Search tasks... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <Card className="border-2 border-violet-200 dark:border-violet-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>New Task</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Ctrl+N</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Search Tasks</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Ctrl+F</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Ctrl+?</kbd>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Close Modal</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Escape</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Cancel Form</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Escape</kbd>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              onSuccess={() => setShowCreateForm(false)}
              onCancel={() => setShowCreateForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {editingTask && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Task</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              task={editingTask}
              onSuccess={() => setEditingTask(null)}
              onCancel={() => setEditingTask(null)}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                {tasks.length === 0 ? (
                  <div className="space-y-2">
                    <Target className="h-12 w-12 mx-auto opacity-50" />
                    <p>No tasks yet. Create your first task to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Search className="h-12 w-12 mx-auto opacity-50" />
                    <p>No tasks match your current filters.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('all')
                        setPriorityFilter('all')
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className={`transition-all duration-200 hover:shadow-md ${
              task.status === 'completed' ? 'opacity-60' : ''
            } ${
              task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' 
                ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20' 
                : ''
            }`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleComplete(task)}
                      className={`mt-1 hover:scale-110 transition-transform ${
                        task.status === 'completed' 
                          ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' 
                          : 'text-muted-foreground hover:text-emerald-600'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      {task.description && (
                        <p className={`text-sm mt-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                          {task.description}
                        </p>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          <p className={`text-xs ${
                            new Date(task.due_date) < new Date() && task.status !== 'completed'
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-muted-foreground'
                          }`}>
                            Due: {new Date(task.due_date).toLocaleDateString()}
                            {new Date(task.due_date) < new Date() && task.status !== 'completed' && (
                              <span className="ml-1 text-red-600 dark:text-red-400">• Overdue</span>
                            )}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <span className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
                        Created: {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTask(task)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(task)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}