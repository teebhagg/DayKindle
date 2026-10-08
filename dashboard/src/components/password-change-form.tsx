'use client'

import { useState, type FormEvent } from 'react'
import { Check, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (newPassword.length < 12) {
      setIsError(true)
      setMessage('Use at least 12 characters for your new password.')
      return
    }
    if (newPassword !== confirmation) {
      setIsError(true)
      setMessage('The new passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      })

      if (error) {
        setIsError(true)
        setMessage('Password was not changed. Check your current password and try again.')
      } else {
        setIsError(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmation('')
        setMessage('Password updated.')
      }
    } catch {
      setIsError(true)
      setMessage('Password was not changed. Try again when the connection is available.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="password-form" onSubmit={handleSubmit}>
      <label htmlFor="current-password">
        Current password
        <Input
          id="current-password"
          className="settings-input"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </label>
      <label htmlFor="new-password">
        New password
        <Input
          id="new-password"
          className="settings-input"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </label>
      <label htmlFor="confirm-password">
        Confirm new password
        <Input
          id="confirm-password"
          className="settings-input"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <p className="password-hint">Use 12 characters or more. Your current password is required to make this change.</p>
      <Button className="password-save" type="submit" disabled={isSubmitting}>
        {message && !isError ? <Check size={15} aria-hidden="true" /> : <KeyRound size={15} aria-hidden="true" />}
        {isSubmitting ? 'Saving…' : 'Save new password'}
      </Button>
      {message ? <p className={isError ? 'password-feedback error' : 'password-feedback'} role={isError ? 'alert' : 'status'}>{message}</p> : null}
    </form>
  )
}
