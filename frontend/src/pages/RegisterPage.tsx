import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRegisterMutation } from '../store/api/authApi'
import { setCredentials } from '../store/slices/authSlice'
import { useAlerts } from '../hooks/useAlerts'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card'
import { useTheme } from '../hooks/useTheme'
import { CheckSquare, Eye, EyeOff, Moon, Sun } from 'lucide-react'

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [register, { isLoading, error }] = useRegisterMutation()
  const { theme, setTheme } = useTheme()
  const { notify } = useAlerts()
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, ...registerData } = data
      const result = await register(registerData).unwrap()
      dispatch(setCredentials(result))
      notify.registerSuccess(result.user?.username || registerData.username)
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Registration failed:', err)
      const errorMessage = err?.data?.detail || err?.data?.error || 'Registration failed'
      notify.registerError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-cyan-900/20" />
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5" />
      
      {/* Floating elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      
      {/* Theme Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 glass hover:bg-white/20 dark:hover:bg-black/20 backdrop-blur-md border-white/20"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>
      
      <Card className="w-full max-w-md relative z-10 glass dark:glass-dark border-white/20 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <CheckSquare className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground/80">
              Join us and start organizing your tasks today
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="animate-slide-up">
          <CardContent className="space-y-5 px-8">
            <div className="space-y-3">
              <Label htmlFor="username" className="text-sm font-medium text-foreground/90">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                {...registerField('username')}
                className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 ${errors.username ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
              />
              {errors.username && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="w-1 h-1 bg-destructive rounded-full" />
                  {errors.username.message}
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/90">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...registerField('email')}
                className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 ${errors.email ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="w-1 h-1 bg-destructive rounded-full" />
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium text-foreground/90">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  {...registerField('password')}
                  className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 pr-12 transition-all duration-200 ${errors.password ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-10 w-10 hover:bg-muted/50 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="w-1 h-1 bg-destructive rounded-full" />
                  {errors.password.message}
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/90">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  {...registerField('confirmPassword')}
                  className={`h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 pr-12 transition-all duration-200 ${errors.confirmPassword ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-10 w-10 hover:bg-muted/50 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span className="w-1 h-1 bg-destructive rounded-full" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            

          </CardContent>
          <CardFooter className="flex flex-col space-y-6 px-8 pb-8">
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="font-semibold text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}