import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  Flag,
  House,
  Plus,
  Signal,
  UserRound,
  Wifi,
  BatteryFull,
} from 'lucide-react'

const sampleActions = [
  {
    id: 'start-gently',
    title: 'Start gently',
    detail: 'Choose one small thing to begin with intention.',
    time: 'Morning',
  },
  {
    id: 'focus-priority',
    title: 'Focus on a priority',
    detail: 'Make space for one thing that matters today.',
    time: 'Late morning',
  },
  {
    id: 'pause-reset',
    title: 'Pause and reset',
    detail: 'Eat, move, rest, or step away for a few minutes.',
    time: 'Midday',
  },
]

function getMonday(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export default function InteractivePreview() {
  const reduceMotion = useReducedMotion()
  const week = useMemo(() => {
    const monday = getMonday(new Date())
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return date
    })
  }, [])
  const todayIndex = (new Date().getDay() + 6) % 7
  const [selectedDay, setSelectedDay] = useState(todayIndex)
  const [completed, setCompleted] = useState<string[]>(['start-gently'])
  const [walkComplete, setWalkComplete] = useState(false)
  const selectedDate = week[selectedDay]
  const isWeekend = selectedDay > 4

  function toggleAction(id: string) {
    setCompleted((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <div className="mobile-preview-wrap">
      <p className="mobile-preview-caption">
        <span className="mobile-preview-caption-dot" aria-hidden="true" />
        DayKindle mobile preview
      </p>

      <section
        id="sample-day"
        className="mobile-preview-device"
        aria-label="Interactive preview of DayKindle’s Today screen"
      >
        <span className="mobile-preview-device-control mobile-preview-device-mute" aria-hidden="true" />
        <span className="mobile-preview-device-control mobile-preview-device-volume" aria-hidden="true" />
        <span className="mobile-preview-device-control mobile-preview-device-volume mobile-preview-device-volume-secondary" aria-hidden="true" />
        <span className="mobile-preview-device-control mobile-preview-device-power" aria-hidden="true" />
        <div className="mobile-preview-screen">
          <div className="mobile-preview-status" aria-hidden="true">
            <span>9:41</span>
            <span className="mobile-preview-status-icons">
              <Signal size={12} strokeWidth={2} />
              <Wifi size={13} strokeWidth={2} />
              <BatteryFull size={14} strokeWidth={2} />
            </span>
          </div>

          <div className="mobile-preview-scroll">
            <header className="mobile-preview-heading">
              <p className="mobile-preview-date">
                {selectedDate.toLocaleDateString('en', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <h2>
                Good morning,
                <span>let’s find your rhythm.</span>
              </h2>
              <p className="mobile-preview-intro">See your plan and record what you did.</p>
            </header>

            <div className="mobile-preview-week" role="group" aria-label="Sample week">
              {week.map((date, index) => {
                const isSelected = selectedDay === index
                const isToday = index === todayIndex
                return (
                  <button
                    key={date.toISOString()}
                    className={`mobile-preview-day${isSelected ? ' is-selected' : ''}${isToday && !isSelected ? ' is-today' : ''}`}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={date.toLocaleDateString('en', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    onClick={() => setSelectedDay(index)}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="mobile-preview-selected-day"
                        className="mobile-preview-day-fill"
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.075, ease: 'easeInOut' }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="mobile-preview-day-name">
                      {date.toLocaleDateString('en', { weekday: 'narrow' })}
                    </span>
                    <span className="mobile-preview-day-number">{date.getDate()}</span>
                    {isToday && <span className="mobile-preview-today-dot" aria-label="Today" />}
                  </button>
                )
              })}
            </div>

            {isWeekend ? (
              <div className="mobile-preview-rhythm-prompt">
                <span className="mobile-preview-rhythm-icon" aria-hidden="true">
                  <CalendarDays size={20} strokeWidth={1.7} />
                </span>
                <span className="mobile-preview-rhythm-copy">
                  <span>Add a weekend rhythm</span>
                  <small>A routine groups actions into a daily plan.</small>
                </span>
                <ArrowRight size={18} strokeWidth={1.7} aria-hidden="true" />
              </div>
            ) : (
              <div className="mobile-preview-routine">
                <div className="mobile-preview-routine-heading">
                  <span>
                    <small>ROUTINE</small>
                    <strong>A steady weekday</strong>
                    <small>{completed.length} of 5 routine steps complete</small>
                  </span>
                  <ArrowRight size={19} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="mobile-preview-routine-meter" aria-hidden="true">
                  <span style={{ transform: `scaleX(${completed.length / 5})` }} />
                </div>
              </div>
            )}

            <section className="mobile-preview-section" aria-labelledby="preview-tasks-title">
              <div className="mobile-preview-section-heading">
                <span>
                  <h3 id="preview-tasks-title">Things to do</h3>
                  <small>Your daily checklist</small>
                </span>
                <span className="mobile-preview-add" aria-hidden="true"><Plus size={19} strokeWidth={1.8} /></span>
              </div>

              <div className="mobile-preview-actions">
                {sampleActions.map((action) => {
                  const isComplete = completed.includes(action.id)
                  return (
                    <motion.button
                      key={action.id}
                      type="button"
                      className={`mobile-preview-action${isComplete ? ' is-complete' : ''}`}
                      aria-pressed={isComplete}
                      onClick={() => toggleAction(action.id)}
                      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                      transition={{ duration: reduceMotion ? 0 : 0.12, ease: 'easeOut' }}
                    >
                      <motion.span
                        className="mobile-preview-check"
                        animate={{
                          backgroundColor: isComplete ? '#356348' : '#F7F8F5',
                          borderColor: isComplete ? '#356348' : '#758579',
                        }}
                        transition={{ duration: reduceMotion ? 0 : 0.12, ease: 'easeOut' }}
                        aria-hidden="true"
                      >
                        {isComplete && <Check size={15} strokeWidth={2.5} />}
                      </motion.span>
                      <span className="mobile-preview-action-copy">
                        <span className="mobile-preview-action-title">{action.title}</span>
                        <small>{action.time} · {isWeekend ? 'Your daily plan' : 'A steady weekday'}</small>
                        <span className="mobile-preview-action-detail">{action.detail}</span>
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </section>

            <section className="mobile-preview-section mobile-preview-habits" aria-labelledby="preview-habits-title">
              <div className="mobile-preview-section-heading">
                <span>
                  <h3 id="preview-habits-title">Habits &amp; practices</h3>
                  <small>Add an action you want to repeat.</small>
                </span>
                <span className="mobile-preview-add" aria-hidden="true"><Plus size={19} strokeWidth={1.8} /></span>
              </div>
              <motion.button
                type="button"
                className={`mobile-preview-habit-row${walkComplete ? ' is-complete' : ''}`}
                aria-pressed={walkComplete}
                onClick={() => setWalkComplete((current) => !current)}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                transition={{ duration: reduceMotion ? 0 : 0.12, ease: 'easeOut' }}
              >
                <motion.span
                  className="mobile-preview-habit-mark"
                  animate={{
                    backgroundColor: walkComplete ? '#356348' : '#fff',
                    borderColor: walkComplete ? '#356348' : '#758579',
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.12, ease: 'easeOut' }}
                  aria-hidden="true"
                >
                  {walkComplete && <Check size={13} strokeWidth={2.5} />}
                </motion.span>
                <span>
                  <strong>Take a short walk</strong>
                  <small>Movement · 15 minutes</small>
                </span>
              </motion.button>
            </section>
          </div>

          <nav className="mobile-preview-tabs" aria-label="DayKindle app navigation preview">
            <span className="is-active"><House size={19} strokeWidth={1.8} /><small>Today</small></span>
            <span><Flag size={19} strokeWidth={1.8} /><small>Goals</small></span>
            <span><ChartNoAxesColumn size={19} strokeWidth={1.8} /><small>Progress</small></span>
            <span><UserRound size={19} strokeWidth={1.8} /><small>Profile</small></span>
          </nav>
        </div>
      </section>

      <p className="mobile-preview-note">Preview only. Your changes are not saved.</p>
    </div>
  )
}
