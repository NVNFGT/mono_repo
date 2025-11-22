import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store'
import { logout } from '../store/slices/authSlice'
import { Button } from './ui/Button'
import { useTheme } from '../hooks/useTheme'
import { Moon, Sun, LogOut, CheckSquare } from 'lucide-react'

export function Navigation() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <nav className="fixed top-0 w-full bg-background border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Todo App</span>
          </Link>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {user && (
              <>
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.username}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}