import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, MoveRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PreviewStage = 'plan' | 'today' | 'adjust'

const stages: Array<{ id: PreviewStage; label: string }> = [
  { id: 'plan', label: 'Plan' },
  { id: 'today', label: 'Today' },
  { id: 'adjust', label: 'Adjust' },
]

const actions = [
  { title: 'Set one small priority', detail: 'Give it a place in your day' },
  { title: 'Take a short pause', detail: 'Step outside for a moment' },
  { title: 'Review what worked', detail: 'Write a quick note' },
]

export default function InteractivePreview() {
  const [stage, setStage] = useState<PreviewStage>('today')
  const [hasInteracted, setHasInteracted] = useState(false)
  const [completed, setCompleted] = useState<number[]>([0])
  const [movedToTomorrow, setMovedToTomorrow] = useState(false)
  const reduceMotion = useReducedMotion()
  const stageNumber = String(stages.findIndex((item) => item.id === stage) + 1).padStart(2, '0')

  function toggleAction(index: number) {
    setCompleted((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    )
  }

  return (
    <div className="preview-wrap">
      <div className="preview-orbit squircle-edge" aria-hidden="true" />
        <section id="sample-day" className="preview-shell squircle-edge" aria-label="Interactive sample of the DayKindle planner">
        <div className="preview-surface">
          <header className="preview-header">
            <div className="preview-brand">
              <span className="preview-brand-mark" aria-hidden="true">
                <img src="/daykindle-logo.png" alt="" width="28" height="28" />
              </span>
              <span>
                <span className="preview-brand-name">DayKindle</span>
                <span className="preview-caption">Daily planner</span>
              </span>
            </div>
            <span className="preview-pill">Preview</span>
          </header>

          <div className="preview-day">
            <div>
              <p className="preview-eyebrow">SAMPLE DAY</p>
              <h2>{stage === 'plan' ? 'Plan a day' : stage === 'adjust' ? 'Adjust the plan' : 'Today'}</h2>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={stage}
                className="preview-day-mark"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 520, damping: 38 }}
                aria-hidden="true"
              >
                {stageNumber}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="preview-tabs" role="tablist" aria-label="Preview stages">
            {stages.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className={`preview-tab${stage === item.id ? ' is-active' : ''}`}
                role="tab"
                aria-selected={stage === item.id}
                aria-controls="preview-panel"
                id={'preview-tab-' + item.id}
                onClick={() => {
                  setHasInteracted(true)
                  setStage(item.id)
                }}
              >
                {stage === item.id && (
                  <motion.span
                    layoutId="preview-tab-indicator"
                    className="preview-tab-indicator"
                    transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 520, damping: 38 }}
                    aria-hidden="true"
                  />
                )}
                <span className="preview-tab-label">{item.label}</span>
              </Button>
            ))}
          </div>

          <div className="preview-panel" id="preview-panel" role="tabpanel" aria-labelledby={'preview-tab-' + stage}>
            <motion.div
              key={stage}
              className="preview-stage"
              initial={hasInteracted && !reduceMotion ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
                {stage === 'plan' && (
                  <div className="stage-note">
                    <div className="stage-icon"><Sparkles size={18} strokeWidth={1.7} aria-hidden="true" /></div>
                    <div>
                      <span className="task-label">MAKE A PLAN</span>
                      <p>Choose a few actions that fit the day you have.</p>
                    </div>
                  </div>
                )}

                {stage === 'today' && (
                  <div className="preview-actions">
                    {actions.map((action, index) => {
                      const isComplete = completed.includes(index)
                      return (
                        <motion.button
                          key={action.title}
                          type="button"
                          className={'preview-action' + (isComplete ? ' is-complete' : '')}
                          aria-pressed={isComplete}
                          onClick={() => toggleAction(index)}
                          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                        >
                          <motion.span
                            className="task-check"
                            initial={false}
                            animate={{ scale: isComplete ? 1 : 0.92 }}
                            transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 420, damping: 24 }}
                          >
                            {isComplete ? <Check size={15} strokeWidth={2.5} /> : null}
                          </motion.span>
                          <span className="task-copy">
                            <span className="task-title">{action.title}</span>
                            <span className="task-detail">{action.detail}</span>
                          </span>
                          <ArrowRight className="task-arrow" size={16} aria-hidden="true" />
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                {stage === 'adjust' && (
                  <div className="adjust-card">
                    <div className="adjust-heading">
                      <div className="adjust-icon" aria-hidden="true"><MoveRight size={19} /></div>
                      <div>
                        <span className="task-label">ONE ACTION NEEDS MORE TIME</span>
                        <p>Move it without changing the rest of your list.</p>
                      </div>
                    </div>
                    <div className="adjust-item">
                      <span>Review what worked</span>
                      <motion.span
                        key={movedToTomorrow ? 'tomorrow' : 'today'}
                        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                        aria-live="polite"
                      >
                        {movedToTomorrow ? 'Tomorrow' : 'Today'}
                      </motion.span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="adjust-link"
                      aria-pressed={movedToTomorrow}
                      onClick={() => setMovedToTomorrow((current) => !current)}
                    >
                      {movedToTomorrow ? 'Move it back to today' : 'Move to tomorrow'}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Button>
                  </div>
                )}
            </motion.div>
          </div>

          <div className="preview-progress">
            <div className="preview-progress-top">
              <span>{stage === 'today' ? 'Sample progress' : stage === 'plan' ? 'Start with a few actions' : 'Change what you need'}</span>
              <span>{stage === 'today' ? completed.length + ' of 3' : 'Sample'}</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <motion.span
                className="progress-value"
                initial={false}
                style={{ transformOrigin: 'left center' }}
                animate={{ scaleX: stage === 'today' ? completed.length / 3 : stage === 'plan' ? 0.38 : 0.68 }}
                transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
              />
            </div>
            <p className="preview-footnote">This is a sample day. Your plan stays editable.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
