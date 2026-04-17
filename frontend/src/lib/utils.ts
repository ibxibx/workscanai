// Utility functions for WorkScanAI

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes (useful for component variants)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format hours
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`
  }
  return `${Math.round(hours)} hours`
}

// Calculate automation readiness category
export function getAutomationCategory(score: number): {
  label: string
  color: string
} {
  if (score >= 80) {
    return { label: 'High', color: 'green' }
  } else if (score >= 60) {
    return { label: 'Medium', color: 'yellow' }
  } else if (score >= 40) {
    return { label: 'Low', color: 'orange' }
  } else {
    return { label: 'Very Low', color: 'red' }
  }
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Format date
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}
