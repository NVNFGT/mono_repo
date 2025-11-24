import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLoginMutation } from '../store/api/authApi'
import { setCredentials } from '../store/slices/authSlice'
import { useAlerts } from '../hooks/useAlerts'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card'
import { useTheme } from '../hooks/useTheme'
import { CheckSquare, Eye, EyeOff, Moon, Sun } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [login, { isLoading, error }] = useLoginMutation()
  const { theme, setTheme } = useTheme()
  const { notify } = useAlerts()
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }
  
  // Check if user is already authenticated
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const token = useSelector((state: RootState) => state.auth.token)
  
  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated && token) {
      console.log('User already authenticated, redirecting to dashboard')
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, token, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data).unwrap()
      dispatch(setCredentials(result))
      notify.loginSuccess(result.user?.username || 'User')
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Login failed:', err)
      const errorMessage = err?.data?.detail || err?.data?.error || 'Login failed'
      notify.loginError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-pink-500/10 dark:from-violet-900/20 dark:via-purple-900/10 dark:to-pink-900/20" />
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-emerald-500/5" />
      
      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
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
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
              <CheckSquare className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground/80">
              Sign in to your account to continue your journey
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="animate-slide-up">
          <CardContent className="space-y-6 px-8">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/90">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register('email')}
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
                  placeholder="Enter your password"
                  {...register('password')}
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
            

          </CardContent>
          <CardFooter className="flex flex-col space-y-6 px-8 pb-8">
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="font-semibold text-transparent bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text hover:from-violet-700 hover:to-purple-700 transition-all duration-200 hover:underline"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}