"use client"

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) {
        setMessage('Email or password is incorrect.')
      } else {
        router.replace('/')
        router.refresh()
      }
    } catch {
      setMessage('Sign-in is not configured yet. Contact the dashboard administrator.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="team-email">
        Email
        <Input
          id="team-email"
          className="login-input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
        />
      </label>
      <label htmlFor="team-password">
        Password
        <Input
          id="team-password"
          className="login-input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
        />
      </label>
      <Button className="login-submit" type="submit" disabled={isSubmitting}>
        <LockKeyhole size={15} /> {isSubmitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={15} />
      </Button>
      {message ? <p className="login-feedback" role="alert">{message}</p> : null}
    </form>
  )
}
