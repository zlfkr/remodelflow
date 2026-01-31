'use client'

import { useState } from 'react'

interface AdvancedPanelProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function AdvancedPanel({
  title,
  defaultOpen = false,
  children,
}: AdvancedPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
      >
        {title}
        <span className="text-gray-500">{open ? '▼' : '▶'}</span>
      </button>
      {open && <div className="border-t border-gray-100 px-4 py-3">{children}</div>}
    </div>
  )
}
