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
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-border/50 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              TaskFlow
            </span>
          </Link>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-10 w-10 rounded-xl hover:bg-muted/80 transition-all duration-300 hover:scale-110"
            >
              {theme === 'light' ? 
                <Moon className="h-5 w-5 text-muted-foreground" /> : 
                <Sun className="h-5 w-5 text-muted-foreground" />
              }
            </Button>

            {user && (
              <>
                <div className="hidden sm:flex px-3 py-2 rounded-xl bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    Welcome, <span className="font-semibold text-foreground">{user.username}</span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2 h-10 px-4 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-300 hover:scale-105"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}