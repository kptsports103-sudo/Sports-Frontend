import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { API_BASE_URL } from './utils/backendUrl'

const WEB_VITALS_ENDPOINT = `${API_BASE_URL}/metrics/web-vitals`

const sendWebVital = (metric) => {
  const payload = {
    metricName: metric?.name,
    value: metric?.value,
    rating: metric?.rating,
    metricId: metric?.id,
    path: `${window.location.pathname}${window.location.search}`,
    navigationType: String(performance?.getEntriesByType?.('navigation')?.[0]?.type || ''),
    userAgent: navigator.userAgent || '',
    effectiveType: navigator.connection?.effectiveType || '',
    language: navigator.language || '',
    viewportWidth: window.innerWidth || 0,
    viewportHeight: window.innerHeight || 0,
    deviceMemory: Number(navigator.deviceMemory || 0),
    hardwareConcurrency: Number(navigator.hardwareConcurrency || 0),
    timestamp: new Date().toISOString(),
  }

  const body = JSON.stringify(payload)
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(WEB_VITALS_ENDPOINT, blob)
      return
    }
  } catch {}

  fetch(WEB_VITALS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

const startWebVitalsReporting = async () => {
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals')
    const report = (metric) => sendWebVital(metric)

    onCLS(report)
    onINP(report)
    onLCP(report)
    onFCP(report)
    onTTFB(report)
  } catch (error) {
    console.warn('Web Vitals logging unavailable:', error)
  }
}

const isClosedMessageChannelNoise = (value) => {
  const message = String(value || '').toLowerCase()
  return (
    message.includes('listener indicated an asynchronous response') &&
    message.includes('message channel closed')
  )
}

window.addEventListener('unhandledrejection', (event) => {
  const message = event?.reason?.message || event?.reason || ''
  if (isClosedMessageChannelNoise(message)) {
    event.preventDefault()
  }
})

window.addEventListener('error', (event) => {
  const message = event?.message || event?.error?.message || ''
  if (isClosedMessageChannelNoise(message)) {
    event.preventDefault()
  }
})

startWebVitalsReporting()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
