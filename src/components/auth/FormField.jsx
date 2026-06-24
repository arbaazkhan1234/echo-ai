import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const GOLD   = '#C9A84C'
const BORDER = '#2A2650'
const ERROR  = '#E05252'

export default function FormField({
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  disabled,
  onKeyDown,
  children,   // right-side slot (eye icon, etc.)
  inputRef,
}) {
  const [focused, setFocused] = useState(false)
  const floated = focused || (value && value.length > 0)

  const borderColor = error
    ? ERROR
    : focused
      ? GOLD
      : BORDER

  const labelColor = error
    ? ERROR
    : focused
      ? GOLD
      : floated
        ? 'rgba(245,237,224,0.38)'
        : 'rgba(245,237,224,0.32)'

  return (
    <div style={{ position: 'relative', paddingTop: 22 }}>
      {/* Floating label */}
      <label
        style={{
          position: 'absolute',
          left: 0,
          top: floated ? 2 : 22,
          fontSize: floated ? '0.63rem' : '0.9rem',
          fontFamily: "'Jost', sans-serif",
          fontWeight: floated ? 600 : 400,
          letterSpacing: floated ? '0.1em' : '0.01em',
          textTransform: floated ? 'uppercase' : 'none',
          color: labelColor,
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          zIndex: 1,
          userSelect: 'none',
        }}
      >
        {label}
      </label>

      {/* Input row */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          disabled={disabled}
          onKeyDown={onKeyDown}
          style={{
            display: 'block',
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: `1.5px solid ${borderColor}`,
            outline: 'none',
            padding: '10px 0 9px',
            paddingRight: children ? 36 : 0,
            fontFamily: "'Jost', sans-serif",
            fontSize: '0.95rem',
            fontWeight: 400,
            color: '#F5EDE0',
            letterSpacing: '0.01em',
            transition: 'border-color 0.22s ease',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            /* remove autofill blue */
            WebkitBoxShadow: '0 0 0 100px #0D0C1A inset',
            WebkitTextFillColor: '#F5EDE0',
          }}
          spellCheck={false}
        />

        {/* Right slot — eye icon, etc. */}
        {children && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
          }}>
            {children}
          </div>
        )}
      </div>

      {/* Error message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key={error}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              margin: '5px 0 0',
              fontFamily: "'Jost', sans-serif",
              fontSize: '0.7rem',
              fontWeight: 400,
              color: ERROR,
              lineHeight: 1.4,
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
