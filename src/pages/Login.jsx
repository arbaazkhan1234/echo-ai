import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        // Map Supabase errors to warm, human messages
        if (authError.message.toLowerCase().includes('invalid login')) {
          setError("We couldn't find an account with those details. Please check your email and password.")
        } else if (authError.message.toLowerCase().includes('email not confirmed')) {
          setError('Please check your inbox and confirm your email address before signing in.')
        } else {
          setError('Something went wrong. Please try again in a moment.')
        }
        return
      }

      navigate('/dashboard')
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {/* Logo & tagline */}
      <div className="text-center mb-8 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-serif text-4xl font-light text-warmgray-900 tracking-wide mb-2">
          Echo <span className="text-terra italic">AI</span>
        </h1>
        <p className="font-sans text-sm text-warmgray-600 tracking-widest uppercase">
          Your memories. Your voice. Forever.
        </p>
      </div>

      {/* Divider */}
      <div
        className="h-px mb-8 animate-fade-in"
        style={{
          background: 'linear-gradient(to right, transparent, #d4a5a0, transparent)',
          animationDelay: '200ms',
          animationFillMode: 'forwards',
        }}
      />

      <form onSubmit={handleLogin} noValidate>
        <div className="flex flex-col gap-5">

          {/* Welcome text */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
          >
            <h2 className="font-serif text-2xl font-normal text-warmgray-800 mb-1">
              Welcome back
            </h2>
            <p className="font-sans text-sm text-warmgray-600">
              Your stories are waiting for you.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="bg-rose-pale border border-rose-dust rounded-xl px-4 py-3 animate-fade-in"
              style={{ animationFillMode: 'forwards' }}
            >
              <p className="font-sans text-sm text-terra-deep leading-relaxed">{error}</p>
            </div>
          )}

          {/* Fields */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}
          >
            <Input
              id="email"
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}
          >
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <div
            className="pt-1 animate-fade-in-up"
            style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}
          >
            <Button
              type="submit"
              loading={loading ? 'Signing you in…' : false}
              disabled={!email || !password}
            >
              Sign in
            </Button>
          </div>

          {/* Link to signup */}
          <p
            className="text-center font-sans text-sm text-warmgray-600 animate-fade-in"
            style={{ animationDelay: '550ms', animationFillMode: 'forwards' }}
          >
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="text-terra font-medium hover:text-terra-deep underline underline-offset-2 transition-colors duration-200"
            >
              Begin your story
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
