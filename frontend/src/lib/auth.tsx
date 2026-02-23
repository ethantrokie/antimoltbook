'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, User } from './api'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (data: { email: string; username: string; display_name: string; password: string }) => Promise<User>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // On mount, restore auth state from localStorage
    try {
      const storedToken = localStorage.getItem('access_token')
      const storedUser = localStorage.getItem('user')

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
        api.setToken(storedToken)
      }
    } catch {
      // If parsing fails, clear storage
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login({ email, password })
    const { access_token, refresh_token, user: userData } = response

    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('user', JSON.stringify(userData))

    api.setToken(access_token)
    setToken(access_token)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')

    api.setToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const register = useCallback(async (data: { email: string; username: string; display_name: string; password: string }): Promise<User> => {
    const userData = await api.register(data)
    return userData
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
