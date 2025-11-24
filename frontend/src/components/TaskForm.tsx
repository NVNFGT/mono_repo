import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTaskMutation, useUpdateTaskMutation, type Task } from '../store/api/tasksApi'
import { useAlerts } from '../hooks/useAlerts'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'

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
  const { notify } = useAlerts()
  const isLoading = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'medium',
      status: task?.status || 'pending',
      due_date: task?.due_date?.split('T')[0] || '', // Extract date part for input[type="date"]
    },
  })

  const onSubmit = async (data: TaskFormData) => {
    try {
      // Prepare the task data, converting date to ISO format if provided
      const taskData = {
        ...data,
        due_date: data.due_date && data.due_date.trim() !== '' 
          ? new Date(data.due_date + 'T00:00:00').toISOString() 
          : undefined,
      }

      // Clean up undefined values before sending to API
      const cleanTaskData = Object.fromEntries(
        Object.entries(taskData).filter(([_, value]) => value !== undefined && value !== '')
      )

      console.log('Submitting task data:', cleanTaskData)

      if (task) {
        // Update existing task
        await updateTask({
          id: task.id,
          task: cleanTaskData,
        }).unwrap()
        notify.taskUpdated(cleanTaskData.title || task.title)
      } else {
        // Create new task
        const result = await createTask(cleanTaskData).unwrap()
        notify.taskCreated(cleanTaskData.title || 'New Task')
      }
      onSuccess()
    } catch (error) {
      console.error('Failed to save task:', error)
      notify.saveError()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
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