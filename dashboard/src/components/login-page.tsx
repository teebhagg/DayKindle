import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import LoginForm from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel squircle-edge" aria-labelledby="login-heading">
        <div className="login-panel-inner">
          <Image className="login-mark" src="/daykindle-logo.png" alt="" width={50} height={50} />
          <p className="setup-eyebrow">PRIVATE TEAM DASHBOARD</p>
          <h1 id="login-heading">Welcome back.</h1>
          <p>Sign in with your team email and password.</p>
          <LoginForm />
          <Link className="login-back" href="/"><ArrowLeft size={14} /> DayKindle dashboard</Link>
        </div>
      </section>
    </main>
  )
}
