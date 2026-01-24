'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addProjectActivity, formatCurrency, formatUnitType as formatUnitTypeUtil } from '@/lib/activity'

interface CostItem {
  id: string
  name: string
  category: string
  unit_type: 'each' | 'sqft' | 'linear_ft' | 'hour' | 'flat'
  default_unit_cost: number
}

interface EstimateLineItem {
  id: string
  project_id: string
  owner_id: string
  cost_item_id: string | null
  name: string
  category: string
  unit_type: 'each' | 'sqft' | 'linear_ft' | 'hour' | 'flat'
  quantity: number
  unit_cost: number
  line_total: number
  sort_order: number
  is_customer_visible: boolean
  notes: string | null
}

interface EstimateSettings {
  project_id: string
  owner_id: string
  show_to_customer: boolean
  tax_rate: number | null
  discount_amount: number | null
  markup_percent: number | null
}

interface EstimateSectionProps {
  projectId: string
  ownerId: string
  userRole: 'owner' | 'customer'
}

export default function EstimateSection({ projectId, ownerId, userRole }: EstimateSectionProps) {
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([])
  const [settings, setSettings] = useState<EstimateSettings | null>(null)
  const [catalogItems, setCatalogItems] = useState<CostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [hasApprovedDesign, setHasApprovedDesign] = useState(false)

  // Add form state
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<string>('')
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState('cabinets')
  const [customUnitType, setCustomUnitType] = useState<'each' | 'sqft' | 'linear_ft' | 'hour' | 'flat'>('each')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')
  const [isCustomerVisible, setIsCustomerVisible] = useState(false)

  // Settings form state
  const [showToCustomer, setShowToCustomer] = useState(false)
  const [taxRate, setTaxRate] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [markupPercent, setMarkupPercent] = useState('')

  useEffect(() => {
    loadData()
  }, [projectId, ownerId])

  const loadData = async () => {
    const supabase = createClient()
    
    // Load line items
    const { data: itemsData } = await supabase
      .from('project_estimates')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (itemsData) {
      setLineItems(itemsData)
    }

    // Load settings
    const { data: settingsData } = await supabase
      .from('project_estimate_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (settingsData) {
      setSettings(settingsData)
      setShowToCustomer(settingsData.show_to_customer)
      setTaxRate(settingsData.tax_rate?.toString() || '')
      setDiscountAmount(settingsData.discount_amount?.toString() || '')
      setMarkupPercent(settingsData.markup_percent?.toString() || '')
    }

    // 🔧 2. Check if project has approved design (for estimate locking)
    // Always check (not just for owners) so we know state
    const { data: approvedDesigns, error: designError } = await supabase
      .from('project_designs')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'approved')
      .limit(1)

    if (designError) {
      console.error('Error checking approved designs:', designError)
      setHasApprovedDesign(false)
    } else {
      const hasApproved = (approvedDesigns?.length || 0) > 0
      setHasApprovedDesign(hasApproved)
      // Debug: Log if approved design found
      if (hasApproved) {
        console.log('[EstimateSection] Approved design detected - warning banner should show')
      }
    }

    // Load catalog (owner only)
    if (userRole === 'owner') {
      const { data: catalogData } = await supabase
        .from('cost_items')
        .select('id, name, category, unit_type, default_unit_cost')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (catalogData) {
        setCatalogItems(catalogData)
      }
    }

    setLoading(false)
  }

  const handleAddFromCatalog = async () => {
    if (!selectedCatalogItem) {
      alert('Please select an item from catalog')
      return
    }

    const catalogItem = catalogItems.find(item => item.id === selectedCatalogItem)
    if (!catalogItem) return

    await createLineItem({
      cost_item_id: catalogItem.id,
      name: catalogItem.name,
      category: catalogItem.category,
      unit_type: catalogItem.unit_type,
      unit_cost: catalogItem.default_unit_cost,
    })
  }

  const handleAddCustom = async () => {
    if (!customName || !unitCost) {
      alert('Please fill in name and unit cost')
      return
    }

    await createLineItem({
      cost_item_id: null,
      name: customName,
      category: customCategory,
      unit_type: customUnitType,
      unit_cost: parseFloat(unitCost),
    })
  }

  // 🔧 1. LOCK MATH LOGIC TO ONE PLACE
  // Single source of truth for line total calculation
  const calculateLineTotal = (qty: number, unitCost: number): number => {
    return qty * unitCost
  }

  const createLineItem = async (itemData: {
    cost_item_id: string | null
    name: string
    category: string
    unit_type: 'each' | 'sqft' | 'linear_ft' | 'hour' | 'flat'
    unit_cost: number
  }) => {
    // 🔧 2. Warn if adding item after design approval
    if (hasApprovedDesign && !confirm('This project has an approved design. Adding estimate items may require customer re-approval. Continue?')) {
      return
    }

    const supabase = createClient()
    const qty = parseFloat(quantity) || 1
    const cost = itemData.unit_cost
    const lineTotal = calculateLineTotal(qty, cost) // Use shared function

    try {
      // Get max sort_order
      const maxSort = lineItems.length > 0 
        ? Math.max(...lineItems.map(item => item.sort_order))
        : -1

      const { data: newItem, error } = await supabase
        .from('project_estimates')
        .insert({
          project_id: projectId,
          owner_id: ownerId,
          cost_item_id: itemData.cost_item_id,
          name: itemData.name,
          category: itemData.category,
          unit_type: itemData.unit_type,
          quantity: qty,
          unit_cost: cost,
          line_total: lineTotal, // Use calculated value
          sort_order: maxSort + 1,
          is_customer_visible: isCustomerVisible,
          notes: notes || null,
        })
        .select()
        .single()

      if (error) throw error

      // 🔧 2. AUTO-LOG ESTIMATE CHANGES
      await createChangeLog('add', null, newItem)
      
      // Create activity entry with visibility info
      const visibilityText = isCustomerVisible ? ' — Visible to customer' : ''
      const description = `Estimate item added: ${itemData.name} (${qty} ${formatUnitTypeUtil(itemData.unit_type)} @ ${formatCurrency(cost)})${visibilityText}`
      await addProjectActivity(
        supabase,
        projectId,
        'estimate_item_added',
        description,
        ownerId
      )

      resetAddForm()
      await loadData()
    } catch (error: any) {
      console.error('Error adding line item:', error)
      alert('Failed to add line item: ' + error.message)
    }
  }

  const handleUpdateItem = async (itemId: string, field: string, value: any) => {
    // 🔧 2. Warn if updating item after design approval
    if (hasApprovedDesign && !confirm('This project has an approved design. Changing estimate items may require customer re-approval. Continue?')) {
      return
    }

    const supabase = createClient()
    const item = lineItems.find(i => i.id === itemId)
    if (!item) return

    const beforeJson = { ...item }

    let updateData: any = { [field]: value }
    
    // 🔧 1. LOCK MATH LOGIC - Recalculate line_total using shared function
    if (field === 'quantity' || field === 'unit_cost') {
      const newQty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity
      const newCost = field === 'unit_cost' ? parseFloat(value) || 0 : item.unit_cost
      updateData.line_total = calculateLineTotal(newQty, newCost) // Use shared function
    }

    try {
      const { data: updatedItem, error } = await supabase
        .from('project_estimates')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error

      // 🔧 2. AUTO-LOG ESTIMATE CHANGES with before/after values
      await createChangeLog('update', beforeJson, updatedItem)
      
      // Create detailed activity message
      let activityMessage = `Estimate item updated: ${item.name}`
      if (field === 'quantity') {
        activityMessage = `Estimate updated: ${item.name} qty ${item.quantity} → ${value}`
      } else if (field === 'unit_cost') {
        activityMessage = `Estimate updated: ${item.name} rate ${formatCurrencyLocal(item.unit_cost)} → ${formatCurrencyLocal(parseFloat(value))}`
      } else if (field === 'is_customer_visible') {
        activityMessage = `Estimate updated: ${item.name} visibility ${item.is_customer_visible ? 'On' : 'Off'} → ${value ? 'On' : 'Off'}`
      } else if (field === 'name') {
        activityMessage = `Estimate updated: ${item.name} → ${value}`
      } else if (field === 'notes') {
        activityMessage = `Estimate updated: ${item.name} notes changed`
      } else {
        activityMessage = `Estimate updated: ${item.name} - ${field} changed`
      }
      
      await addProjectActivity(
        supabase,
        projectId,
        'estimate_item_updated',
        activityMessage,
        ownerId
      )

      await loadData()
    } catch (error: any) {
      console.error('Error updating line item:', error)
      alert('Failed to update: ' + error.message)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    const warningMessage = hasApprovedDesign
      ? 'This project has an approved design. Removing estimate items may require customer re-approval. Are you sure you want to remove this line item?'
      : 'Are you sure you want to remove this line item?'
    
    if (!confirm(warningMessage)) return

    const supabase = createClient()
    const item = lineItems.find(i => i.id === itemId)
    if (!item) return

    try {
      const { error } = await supabase
        .from('project_estimates')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      // Create change log
      await createChangeLog('delete', item, null)

      // Create activity
      await addProjectActivity(
        supabase,
        projectId,
        'estimate_item_removed',
        `Estimate item removed: ${item.name}`,
        ownerId
      )

      await loadData()
    } catch (error: any) {
      console.error('Error deleting line item:', error)
      alert('Failed to delete: ' + error.message)
    }
  }

  const handleSaveSettings = async () => {
    // 🔧 2. Warn if changing settings after design approval
    if (hasApprovedDesign && !confirm('This project has an approved design. Changing estimate settings may require customer re-approval. Continue?')) {
      return
    }

    const supabase = createClient()

    try {
      const beforeSettings = settings
      // Validate and clamp values to prevent overflow
      const taxRateValue = taxRate ? Math.max(0, Math.min(1, parseFloat(taxRate))) : null
      const markupPercentValue = markupPercent ? Math.max(0, Math.min(99999, parseFloat(markupPercent))) : null
      const discountAmountValue = discountAmount ? Math.max(0, parseFloat(discountAmount)) : null

      const settingsData = {
        project_id: projectId,
        owner_id: ownerId,
        show_to_customer: showToCustomer,
        tax_rate: taxRateValue,
        discount_amount: discountAmountValue,
        markup_percent: markupPercentValue,
      }

      const { error } = await supabase
        .from('project_estimate_settings')
        .upsert(settingsData, { onConflict: 'project_id' })

      if (error) throw error

      // 🔧 2. AUTO-LOG ESTIMATE CHANGES - Log settings changes
      if (beforeSettings) {
        const changes: string[] = []
        if (beforeSettings.show_to_customer !== showToCustomer) {
          changes.push(`show_to_customer ${beforeSettings.show_to_customer ? 'On' : 'Off'} → ${showToCustomer ? 'On' : 'Off'}`)
        }
        if (beforeSettings.tax_rate !== settingsData.tax_rate) {
          const oldTax = beforeSettings.tax_rate ? beforeSettings.tax_rate.toFixed(4) : '0.0000'
          const newTax = settingsData.tax_rate ? settingsData.tax_rate.toFixed(4) : '0.0000'
          changes.push(`tax ${oldTax} → ${newTax}`)
        }
        if (beforeSettings.discount_amount !== settingsData.discount_amount) {
          changes.push(`discount ${formatCurrencyLocal(beforeSettings.discount_amount || 0)} → ${formatCurrencyLocal(settingsData.discount_amount || 0)}`)
        }
        if (beforeSettings.markup_percent !== settingsData.markup_percent) {
          changes.push(`markup ${beforeSettings.markup_percent || 0}% → ${settingsData.markup_percent || 0}%`)
        }
        if (changes.length > 0) {
          await addProjectActivity(
            supabase,
            projectId,
            'estimate_settings_updated',
            `Estimate settings updated: ${changes.join(', ')}`,
            ownerId
          )
        }
      } else {
        await addProjectActivity(
          supabase,
          projectId,
          'estimate_settings_updated',
          'Estimate settings created',
          ownerId
        )
      }

      setShowSettings(false)
      await loadData()
    } catch (error: any) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings: ' + error.message)
    }
  }

  const createChangeLog = async (action: 'add' | 'update' | 'delete', before: any, after: any) => {
    const supabase = createClient()
    await supabase
      .from('estimate_change_log')
      .insert({
        project_id: projectId,
        owner_id: ownerId,
        action,
        before_json: before,
        after_json: after,
      })
  }

  // Removed old createActivity function - now using addProjectActivity from activity.ts

  const resetAddForm = () => {
    setSelectedCatalogItem('')
    setCustomName('')
    setCustomCategory('cabinets')
    setCustomUnitType('each')
    setQuantity('1')
    setUnitCost('')
    setNotes('')
    setIsCustomerVisible(false)
    setShowAddForm(false)
    setEditingItemId(null)
  }

  // Local formatting functions (using utilities from activity.ts)
  const formatCurrencyLocal = formatCurrency
  const formatUnitTypeLocal = formatUnitTypeUtil

  // 🔧 1. LOCK MATH LOGIC - Single source of truth for totals calculation
  const calculateTotals = (itemsToCalculate: EstimateLineItem[] = lineItems) => {
    // Subtotal: sum of all line totals (line_total calculated by shared function)
    const subtotal = itemsToCalculate.reduce((sum, item) => {
      // Double-check: ensure line_total is correct (quantity * unit_cost)
      const expectedTotal = calculateLineTotal(item.quantity, item.unit_cost)
      return sum + (item.line_total || expectedTotal)
    }, 0)
    
    // Apply markup if set (before discount and tax)
    let afterMarkup = subtotal
    if (settings?.markup_percent) {
      afterMarkup = subtotal * (1 + settings.markup_percent / 100)
    }

    // Apply discount (after markup)
    let afterDiscount = afterMarkup
    if (settings?.discount_amount) {
      afterDiscount = afterMarkup - settings.discount_amount
    }

    // Apply tax (on discounted amount)
    let tax = 0
    let total = afterDiscount
    if (settings?.tax_rate) {
      tax = afterDiscount * settings.tax_rate
      total = afterDiscount + tax
    }

    return { subtotal, afterMarkup, afterDiscount, tax, total }
  }

  // 🔧 3. CUSTOMER VISIBILITY RULE - Strict enforcement
  // 🔧 4. DISABLE EDITING - Customer view is completely read-only
  if (userRole === 'customer') {
    // When show_to_customer = false: customer sees NOTHING (not even totals)
    if (!settings || !settings.show_to_customer) {
      return null // Don't show estimate section at all
    }

    // Only show items with is_customer_visible = true
    const visibleItems = lineItems.filter(item => item.is_customer_visible)
    if (visibleItems.length === 0) {
      return null // No visible items, show nothing
    }

    // Calculate totals ONLY from visible items (protects margin/internal costs)
    const { subtotal, tax, total } = calculateTotals(visibleItems)

    // 🔧 4. READ-ONLY VIEW - No inputs, no buttons, no editing
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Project Estimate</h3>
        
        <div className="space-y-3 mb-6">
          {visibleItems.map((item) => (
            <div key={item.id} className="flex justify-between items-center p-3 border rounded bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} {formatUnitTypeLocal(item.unit_type)} × {formatCurrencyLocal(item.unit_cost)}
                </p>
                {item.notes && (
                  <p className="text-xs text-gray-400 mt-1 italic">{item.notes}</p>
                )}
              </div>
              <p className="font-semibold text-gray-900">{formatCurrencyLocal(item.line_total)}</p>
            </div>
          ))}
        </div>

        {/* Show final total (recommended for transparency) */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-900">{formatCurrencyLocal(subtotal)}</span>
          </div>
          {settings.tax_rate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({((settings.tax_rate || 0) * 100).toFixed(2)}%):</span>
              <span className="text-gray-900">{formatCurrencyLocal(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">{formatCurrencyLocal(total)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Owner view
  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading estimate...</div>
  }

  const { subtotal, afterMarkup, afterDiscount, tax, total } = calculateTotals()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Project Estimate</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Preliminary Estimate
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
          >
            Settings
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Add Line Item
          </button>
        </div>
      </div>

      {/* 🔧 2. Lock estimate after design approval - Show warning if approved design exists */}
      {hasApprovedDesign && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Design Approved:</strong> This project has an approved design. 
            Estimate changes may require customer re-approval.
          </p>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h4 className="font-medium mb-4">Estimate Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showToCustomer"
                checked={showToCustomer}
                onChange={(e) => setShowToCustomer(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="showToCustomer" className="text-sm">
                Show estimate to customer
              </label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (decimal, e.g. 0.0825 for 8.25%)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  value={taxRate}
                  onChange={(e) => {
                    const val = e.target.value
                    // Validate: must be between 0 and 1 (0% to 100%)
                    if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 1)) {
                      setTaxRate(val)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.0825"
                />
                <p className="text-xs text-gray-500 mt-1">Enter as decimal (0.0825 = 8.25%)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Markup (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Enter as percentage (15 = 15%)</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Settings
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h4 className="font-medium mb-4">Add Line Item</h4>
          
          {/* From Catalog */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add from Catalog
            </label>
            <div className="flex space-x-2">
              <select
                value={selectedCatalogItem}
                onChange={(e) => {
                  setSelectedCatalogItem(e.target.value)
                  const item = catalogItems.find(i => i.id === e.target.value)
                  if (item) {
                    setUnitCost(item.default_unit_cost.toString())
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select from catalog...</option>
                {catalogItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.category}) - {formatCurrencyLocal(item.default_unit_cost)}/{formatUnitTypeLocal(item.unit_type)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qty"
                className="w-24 px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="checkbox"
                id="visibleFromCatalog"
                checked={isCustomerVisible}
                onChange={(e) => setIsCustomerVisible(e.target.checked)}
                className="mr-2"
                title="Visible to customer"
              />
              <button
                onClick={handleAddFromCatalog}
                disabled={!selectedCatalogItem}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="text-center text-gray-500 my-2">OR</div>

          {/* Custom Item */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Custom Item
            </label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Item name"
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="cabinets">Cabinets</option>
                <option value="countertop">Countertop</option>
                <option value="labor">Labor</option>
                <option value="permit">Permit</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="flooring">Flooring</option>
                <option value="paint">Paint</option>
                <option value="hardware">Hardware</option>
                <option value="other">Other</option>
              </select>
              <select
                value={customUnitType}
                onChange={(e) => setCustomUnitType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="each">Each</option>
                <option value="sqft">Square Foot</option>
                <option value="linear_ft">Linear Foot</option>
                <option value="hour">Hour</option>
                <option value="flat">Flat</option>
              </select>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Qty"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="Unit cost"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <input
                type="checkbox"
                id="visibleCustom"
                checked={isCustomerVisible}
                onChange={(e) => setIsCustomerVisible(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="visibleCustom" className="text-sm">Visible to customer</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={handleAddCustom}
              disabled={!customName || !unitCost}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add Custom Item
            </button>
          </div>

          <button
            onClick={resetAddForm}
            className="mt-4 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Line Items Table */}
      {lineItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No estimate items yet. Add your first line item!
        </div>
      ) : (
        <>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category} • {formatUnitTypeLocal(item.unit_type)}</p>
                        {item.notes && (
                          <p className="text-xs text-gray-400 italic mt-1">{item.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0
                          // 🔧 1. UI updates instantly - calculate and show preview
                          handleUpdateItem(item.id, 'quantity', newValue)
                        }}
                        onBlur={(e) => {
                          // Ensure value is saved on blur
                          const newValue = parseFloat(e.target.value) || 0
                          if (newValue !== item.quantity) {
                            handleUpdateItem(item.id, 'quantity', newValue)
                          }
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_cost}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0
                          // 🔧 1. UI updates instantly - calculate and show preview
                          handleUpdateItem(item.id, 'unit_cost', newValue)
                        }}
                        onBlur={(e) => {
                          // Ensure value is saved on blur
                          const newValue = parseFloat(e.target.value) || 0
                          if (newValue !== item.unit_cost) {
                            handleUpdateItem(item.id, 'unit_cost', newValue)
                          }
                        }}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {/* 🔧 1. Line total calculated by shared function (via DB trigger) */}
                      {formatCurrencyLocal(item.line_total)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.is_customer_visible}
                        onChange={(e) => handleUpdateItem(item.id, 'is_customer_visible', e.target.checked)}
                        className="mr-2"
                        title="Visible to customer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 mt-4">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrencyLocal(subtotal)}</span>
              </div>
              {settings?.markup_percent && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>After Markup ({settings.markup_percent}%):</span>
                  <span>{formatCurrencyLocal(afterMarkup)}</span>
                </div>
              )}
              {settings?.discount_amount && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Discount:</span>
                  <span>-{formatCurrencyLocal(settings.discount_amount)}</span>
                </div>
              )}
              {settings?.tax_rate && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({((settings.tax_rate || 0) * 100).toFixed(2)}%):</span>
                  <span>{formatCurrencyLocal(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Estimate:</span>
                <span>{formatCurrencyLocal(total)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
