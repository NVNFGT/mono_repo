import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect, useCallback } from 'react'
import { useCreateTaskMutation, useUpdateTaskMutation, type Task } from '../store/api/tasksApi'
import { useParseTaskMutation } from '../store/api/aiApi'
import { useDebounce } from '../features/ai/hooks/useDebounce'
import { useAlerts } from '../hooks/useAlerts'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Card } from './ui/Card'
import type { ParsedTask, TaskSuggestion } from '../features/ai/types'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  due_date: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
  task?: Task
  onSuccess: () => void
  onCancel: () => void
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation()
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation()
  const { notify, alert } = useAlerts()
  const isLoading = isCreating || isUpdating

  // AI Enhancement State
  const [isAIEnabled, setIsAIEnabled] = useState(true)
  const [aiInput, setAiInput] = useState('')
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<TaskSuggestion[]>([])

  // AI API hooks
  const [parseTask, { isLoading: isParsing, error: parseError }] = useParseTaskMutation()

  // Debounced AI input
  const debouncedAiInput = useDebounce(aiInput, 500)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'medium',
      status: task?.status || 'pending',
      due_date: task?.due_date?.split('T')[0] || '',
    },
  })

  const handleParseTask = useCallback(async (taskInput: string) => {
    try {
      const result = await parseTask({
        input: taskInput,
        context: {
          userPreferences: { source: 'enhanced_form' }
        }
      }).unwrap()

      setParsedTask(result.parsedTask)
      setAiSuggestions(result.suggestions || [])
      
      // Auto-populate form fields from AI analysis
      if (result.parsedTask) {
        setValue('title', result.parsedTask.title)
        if (result.parsedTask.description) {
          setValue('description', result.parsedTask.description)
        }
        setValue('priority', result.parsedTask.priority)
        if (result.parsedTask.dueDate) {
          try {
            let dateStr = ''
            if (typeof result.parsedTask.dueDate === 'object' && result.parsedTask.dueDate.parsed) {
              dateStr = new Date(result.parsedTask.dueDate.parsed).toISOString().split('T')[0]
            } else if (typeof result.parsedTask.dueDate === 'string') {
              dateStr = new Date(result.parsedTask.dueDate).toISOString().split('T')[0]
            }
            if (dateStr) {
              setValue('due_date', dateStr)
            }
          } catch {
            console.warn('Could not parse due date:', result.parsedTask.dueDate)
          }
        }
      }
    } catch (error) {
      console.error('Task parsing failed:', error)
      setParsedTask(null)
      setAiSuggestions([])
    }
  }, [parseTask, setValue])

  // Initialize AI input with existing task title
  useEffect(() => {
    if (task?.title && !aiInput) {
      setAiInput(task.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.title])

  // AI Task Parsing
  useEffect(() => {
    if (debouncedAiInput.trim().length > 3 && isAIEnabled && !task) {
      handleParseTask(debouncedAiInput)
    } else if (debouncedAiInput.trim().length <= 3) {
      setParsedTask(null)
      setAiSuggestions([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAiInput, isAIEnabled, task])

  const handleAiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAiInput(e.target.value)
  }

  const applySuggestion = (suggestion: TaskSuggestion) => {
    console.log('Applying suggestion:', suggestion) // Debug log
    
    switch (suggestion.type) {
      case 'priority':
      case 'priority_clarification': {
        // For priority clarification, extract priority from suggestion text or use high as default
        let priority: 'low' | 'medium' | 'high' = 'medium'
        if (suggestion.suggestion.toLowerCase().includes('high')) {
          priority = 'high'
        } else if (suggestion.suggestion.toLowerCase().includes('low')) {
          priority = 'low'
        } else if (suggestion.metadata?.suggested_priority) {
          priority = suggestion.metadata.suggested_priority as 'low' | 'medium' | 'high'
        }
        setValue('priority', priority)
        break
      }
      case 'due_date':
      case 'due_date_add': {
        if (suggestion.metadata?.suggested_date) {
          setValue('due_date', suggestion.metadata.suggested_date)
        } else {
          // If no specific date in metadata, open date picker or suggest tomorrow
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          setValue('due_date', tomorrow.toISOString().split('T')[0])
        }
        break
      }
      case 'description':
      case 'description_improve': {
        const currentDescription = document.getElementById('description') as HTMLTextAreaElement
        const currentValue = currentDescription?.value || ''
        
        if (suggestion.metadata?.improvement_type === 'length' && currentValue.length < 20) {
          // For short descriptions, append the suggestion
          const newDescription = currentValue 
            ? `${currentValue} - ${suggestion.suggestion}`
            : suggestion.suggestion
          setValue('description', newDescription)
        } else if (suggestion.metadata?.vague_verbs_found) {
          // For vague verbs, suggest more specific wording
          const examples = suggestion.metadata.suggestion_examples || []
          const newDescription = currentValue + (examples.length > 0 ? ` (${examples[0]})` : '')
          setValue('description', newDescription)
        } else {
          setValue('description', suggestion.suggestion)
        }
        break
      }
      case 'breakdown': {
        // For breakdown suggestions, add to description with steps format
        const currentDescription = document.getElementById('description') as HTMLTextAreaElement
        const currentValue = currentDescription?.value || ''
        const breakdownText = currentValue 
          ? `${currentValue}\n\nSuggested breakdown:\n- Step 1: [Define specific steps]\n- Step 2: [Add more details]\n- Step 3: [Set completion criteria]`
          : 'Suggested breakdown:\n- Step 1: [Define specific steps]\n- Step 2: [Add more details]\n- Step 3: [Set completion criteria]'
        setValue('description', breakdownText)
        break
      }
      case 'reminder': {
        // For reminder suggestions, we could add to description or show info
        alert.info(`💡 Reminder tip: ${suggestion.suggestion}`)
        return // Don't show success message for info-only suggestions
      }
      case 'delegation': {
        // For delegation suggestions, add note to description
        const currentDescription = document.getElementById('description') as HTMLTextAreaElement
        const currentValue = currentDescription?.value || ''
        const delegationNote = currentValue 
          ? `${currentValue}\n\n🤝 Delegation note: Consider involving team members for this task.`
          : '🤝 Delegation note: Consider involving team members for this task.'
        setValue('description', delegationNote)
        break
      }
      default: {
        // Generic handling for unknown suggestion types
        console.warn('Unknown suggestion type:', suggestion.type)
        alert.info(`💡 ${suggestion.suggestion}`)
        return
      }
    }
    alert.success('AI suggestion applied!')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600'
    if (confidence >= 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  const onSubmit = async (data: TaskFormData) => {
    try {
      const taskData = {
        ...data,
        due_date: data.due_date && data.due_date.trim() !== '' 
          ? new Date(data.due_date + 'T00:00:00').toISOString() 
          : undefined,
      }

      const cleanTaskData = Object.fromEntries(
        Object.entries(taskData).filter(([, value]) => value !== undefined && value !== '')
      )

      if (task) {
        await updateTask({
          id: task.id,
          task: cleanTaskData,
        }).unwrap()
        notify.taskUpdated(data.title || task.title)
      } else {
        // Ensure title is always present for new tasks
        await createTask({ title: data.title, ...cleanTaskData }).unwrap()
        notify.taskCreated(data.title || 'New Task')
      }
      onSuccess()
    } catch (error) {
      console.error('Failed to save task:', error)
      notify.saveError()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* AI Enhancement Toggle */}
      {!task && (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700">
              {isAIEnabled ? '🤖 AI Smart Mode Active' : '✏️ Manual Mode'}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAIEnabled(!isAIEnabled)}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            {isAIEnabled ? 'Switch to Manual' : 'Enable AI'}
          </Button>
        </div>
      )}

      {/* AI-Enhanced Input */}
      {!task && isAIEnabled && (
        <div className="space-y-2">
          <Label htmlFor="ai-input" className="flex items-center space-x-2">
            <span>🧠 Describe your task naturally</span>
            {isParsing && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </Label>
          <Input
            id="ai-input"
            type="text"
            value={aiInput}
            onChange={handleAiInputChange}
            placeholder="e.g., 'Call client about project deadline by Friday'"
            className="w-full"
          />
          
          {parseError && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ AI analysis unavailable. You can still create the task manually below.
            </p>
          )}
        </div>
      )}

      {/* AI Analysis Display */}
      {!task && parsedTask && isAIEnabled && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <span>🎯</span>
              <span>AI Analysis</span>
            </h3>
            <span className={`text-sm font-medium ${getConfidenceColor(parsedTask.confidence)}`}>
              {Math.round(parsedTask.confidence * 100)}% confidence
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wide">Priority</Label>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(parsedTask.priority)}`}>
                {parsedTask.priority}
              </span>
            </div>
            {parsedTask.category && (
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Category</Label>
                <span className="inline-block px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                  {parsedTask.category}
                </span>
              </div>
            )}
            {parsedTask.estimatedDurationMinutes && (
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Estimated Duration</Label>
                <span className="text-xs text-gray-700">
                  {parsedTask.estimatedDurationMinutes} minutes
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* AI Suggestions */}
      {!task && aiSuggestions.length > 0 && isAIEnabled && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <span>💡</span>
            <span>AI Suggestions</span>
          </h3>
          <div className="space-y-2">
            {aiSuggestions.slice(0, 3).map((suggestion, index) => (
              <div key={suggestion.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {suggestion.type.replace('_', ' ')}
                    </span>
                    <span className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {suggestion.suggestion}
                  </p>
                  <p className="text-xs text-gray-600">
                    {suggestion.reasoning}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applySuggestion(suggestion)}
                  className="flex-shrink-0"
                >
                  Apply
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Traditional Form Fields */}
      <div className="space-y-2">
        <Label htmlFor="title">Title {isAIEnabled && !task && '(auto-filled by AI)'}</Label>
        <Input
          id="title"
          type="text"
          {...register('title')}
          className={errors.title ? 'border-destructive' : ''}
          placeholder="Enter task title..."
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <textarea
          id="description"
          {...register('description')}
          className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            errors.description ? 'border-destructive' : ''
          }`}
          placeholder="Enter task description..."
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            {...register('priority')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            {...register('status')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="due_date">Due Date (optional)</Label>
        <Input
          id="due_date"
          type="date"
          {...register('due_date')}
          className={errors.due_date ? 'border-destructive' : ''}
        />
        {errors.due_date && (
          <p className="text-sm text-destructive">{errors.due_date.message}</p>
        )}
      </div>

      <div className="flex space-x-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}