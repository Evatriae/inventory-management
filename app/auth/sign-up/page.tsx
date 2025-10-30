"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("user")
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    fullName?: string
    email?: string
    password?: string
    repeatPassword?: string
  }>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const validateFullName = (name: string) => {
    if (!name.trim()) return "Full name is required"
    if (name.trim().length < 2) return "Full name must be at least 2 characters"
    if (!/^[a-zA-Z\s]*$/.test(name)) return "Full name can only contain letters and spaces"
    return ""
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return "Email is required"
    if (!emailRegex.test(email)) return "Please enter a valid email address"
    return ""
  }

  const validatePassword = (password: string) => {
    if (!password) return "Password is required"
    if (password.length < 6) return "Password must be at least 6 characters"
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) return "Password must contain at least one uppercase and one lowercase letter"
    if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number"
    return ""
  }

  const validateRepeatPassword = (repeatPassword: string, password: string) => {
    if (!repeatPassword) return "Please confirm your password"
    if (repeatPassword !== password) return "Passwords do not match"
    return ""
  }

  const handleFullNameChange = (value: string) => {
    setFullName(value)
    const nameError = validateFullName(value)
    setValidationErrors(prev => ({ ...prev, fullName: nameError }))
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    const emailError = validateEmail(value)
    setValidationErrors(prev => ({ ...prev, email: emailError }))
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    const passwordError = validatePassword(value)
    setValidationErrors(prev => ({ ...prev, password: passwordError }))
    
    // Also revalidate repeat password if it exists
    if (repeatPassword) {
      const repeatPasswordError = validateRepeatPassword(repeatPassword, value)
      setValidationErrors(prev => ({ ...prev, repeatPassword: repeatPasswordError }))
    }
  }

  const handleRepeatPasswordChange = (value: string) => {
    setRepeatPassword(value)
    const repeatPasswordError = validateRepeatPassword(value, password)
    setValidationErrors(prev => ({ ...prev, repeatPassword: repeatPasswordError }))
  }

  const isFormValid = () => {
    const nameError = validateFullName(fullName)
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    const repeatPasswordError = validateRepeatPassword(repeatPassword, password)
    return !nameError && !emailError && !passwordError && !repeatPasswordError
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate all fields
    const nameError = validateFullName(fullName)
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    const repeatPasswordError = validateRepeatPassword(repeatPassword, password)
    
    setValidationErrors({
      fullName: nameError,
      email: emailError,
      password: passwordError,
      repeatPassword: repeatPasswordError
    })

    if (!isFormValid()) {
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/items`,
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Lend</h1>
            <p className="text-sm text-slate-600">Inventory Management System</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sign up</CardTitle>
              <CardDescription>Create a new account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      type="text"
                      placeholder="John Doe"
                      required
                      value={fullName}
                      onChange={(e) => handleFullNameChange(e.target.value)}
                      className={validationErrors.fullName ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {validationErrors.fullName && (
                      <p className="text-sm text-red-500">{validationErrors.fullName}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={validationErrors.email ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-500">{validationErrors.email}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className={validationErrors.password ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {validationErrors.password && (
                      <p className="text-sm text-red-500">{validationErrors.password}</p>
                    )}
                    {!validationErrors.password && password && (
                      <p className="text-xs text-gray-600">
                        Password must contain uppercase, lowercase, and number
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Repeat Password</Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => handleRepeatPasswordChange(e.target.value)}
                      className={validationErrors.repeatPassword ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {validationErrors.repeatPassword && (
                      <p className="text-sm text-red-500">{validationErrors.repeatPassword}</p>
                    )}
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading || !isFormValid()}>
                    {isLoading ? "Creating account..." : "Sign up"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
