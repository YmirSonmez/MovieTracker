import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface FieldChrome {
  label?: string
  helperText?: string
  error?: string
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldChrome {}

const fieldClasses =
  'w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(fieldClasses, error && 'border-danger focus:border-danger', className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-sm text-danger">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-sm text-text-subtle">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  },
)
Input.displayName = 'Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldChrome {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(fieldClasses, 'min-h-24 resize-y', error && 'border-danger focus:border-danger', className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-sm text-danger">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-sm text-text-subtle">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
