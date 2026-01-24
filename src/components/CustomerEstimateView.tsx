'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EstimateSettings {
  project_id: string
  show_to_customer: boolean
  tax_rate: number | null
  discount_amount: number | null
  markup_percent: number | null
}

interface EstimateLineItem {
  id: string
  project_id: string
  name: string
  unit_type: 'each' | 'sqft' | 'linear_ft' | 'hour' | 'flat'
  quantity: number
  unit_cost: number
  line_total: number
  notes: string | null
}

interface CustomerEstimateViewProps {
  projectId: string
}

export default function CustomerEstimateView({ projectId }: CustomerEstimateViewProps) {
  const [settings, setSettings] = useState<EstimateSettings | null>(null)
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEstimateData()
  }, [projectId])

  const loadEstimateData = async () => {
    const supabase = createClient()
    setError(null)

    try {
      // Fetch estimate settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('project_estimate_settings')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (settingsError) {
        // If settings don't exist or error, hide section (not an error state)
        if (settingsError.code === 'PGRST116') {
          // No rows returned - settings not created yet
          setSettings(null)
          setLineItems([])
          setLoading(false)
          return
        }
        console.error('Error loading estimate settings:', settingsError)
        setError('Failed to load estimate settings')
        setLoading(false)
        return
      }

      // SECURITY: Only show if show_to_customer = true
      if (!settingsData || !settingsData.show_to_customer) {
        setSettings(null)
        setLineItems([])
        setLoading(false)
        return
      }

      setSettings(settingsData)

      // Fetch visible line items only (RLS will enforce is_customer_visible = true)
      const { data: itemsData, error: itemsError } = await supabase
        .from('project_estimates')
        .select('id, project_id, name, unit_type, quantity, unit_cost, line_total, notes')
        .eq('project_id', projectId)
        .eq('is_customer_visible', true)
        .order('created_at', { ascending: true })

      if (itemsError) {
        console.error('Error loading estimate items:', itemsError)
        setError('Failed to load estimate items')
        setLoading(false)
        return
      }

      setLineItems(itemsData || [])
    } catch (err: any) {
      console.error('Unexpected error loading estimate:', err)
      setError('An error occurred while loading the estimate')
    } finally {
      setLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Format unit type
  const formatUnitType = (type: string): string => {
    const map: Record<string, string> = {
      'each': 'Each',
      'sqft': 'Sq Ft',
      'linear_ft': 'Linear Ft',
      'hour': 'Hour',
      'flat': 'Flat',
    }
    return map[type] || type
  }

  // Calculate totals (client-side, read-only)
  const calculateTotals = () => {
    if (!settings || lineItems.length === 0) {
      return { subtotal: 0, markup: 0, discount: 0, tax: 0, total: 0 }
    }

    // Subtotal: sum of visible line items
    const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0)

    // Apply markup if set (before discount and tax)
    let afterMarkup = subtotal
    let markupAmount = 0
    if (settings.markup_percent) {
      markupAmount = subtotal * (settings.markup_percent / 100)
      afterMarkup = subtotal + markupAmount
    }

    // Apply discount (after markup)
    let afterDiscount = afterMarkup
    if (settings.discount_amount) {
      afterDiscount = afterMarkup - settings.discount_amount
    }

    // Apply tax (on discounted amount)
    let tax = 0
    let total = afterDiscount
    if (settings.tax_rate) {
      tax = afterDiscount * settings.tax_rate
      total = afterDiscount + tax
    }

    return { subtotal, markup: markupAmount, discount: settings.discount_amount || 0, tax, total }
  }

  // SECURITY: Hide section if settings fetch fails or show_to_customer = false
  if (loading) {
    return null // Don't show loading state, just hide until ready
  }

  // If settings don't exist or show_to_customer = false, show nothing or simple message
  if (!settings || !settings.show_to_customer) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Project Estimate</h3>
        <p className="text-gray-500 text-sm">Estimate not shared yet.</p>
      </div>
    )
  }

  // If error occurred, hide section (don't crash page)
  if (error) {
    return null
  }

  // Empty state: show_to_customer = true but no visible items
  if (lineItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Project Estimate</h3>
        <p className="text-gray-500 text-sm">Estimate shared, but no visible items yet.</p>
      </div>
    )
  }

  const { subtotal, markup, discount, tax, total } = calculateTotals()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Project Estimate</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Preliminary Estimate
        </span>
      </div>

      {/* Read-only line items table */}
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lineItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 italic mt-1">{item.notes}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatUnitType(item.unit_type)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatCurrency(item.unit_cost)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatCurrency(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary calculation */}
      <div className="border-t pt-4">
        <div className="max-w-md ml-auto space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-900">{formatCurrency(subtotal)}</span>
          </div>

          {markup > 0 && settings.markup_percent && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Markup ({settings.markup_percent.toFixed(2)}%):</span>
              <span>{formatCurrency(markup)}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Discount:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}

          {tax > 0 && settings.tax_rate && (
            <div className="flex justify-between text-sm">
              <span>Tax ({((settings.tax_rate || 0) * 100).toFixed(2)}%):</span>
              <span className="text-gray-900">{formatCurrency(tax)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
