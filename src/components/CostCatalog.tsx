'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CostItem {
  id: string
  owner_id: string
  name: string
  category: string
  unit_type: 'each' | 'sqft' | 'linear_ft' | 'hour' | 'flat'
  default_unit_cost: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CostCatalogProps {
  ownerId: string
}

export default function CostCatalog({ ownerId }: CostCatalogProps) {
  const [items, setItems] = useState<CostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<CostItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState('cabinets')
  const [unitType, setUnitType] = useState<'each' | 'sqft' | 'linear_ft' | 'hour' | 'flat'>('each')
  const [defaultUnitCost, setDefaultUnitCost] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const categories = [
    'cabinets',
    'countertop',
    'labor',
    'permit',
    'plumbing',
    'electrical',
    'flooring',
    'paint',
    'hardware',
    'other'
  ]

  useEffect(() => {
    loadItems()
  }, [ownerId])

  const loadItems = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cost_items')
      .select('*')
      .eq('owner_id', ownerId)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading cost items:', error)
    } else if (data) {
      setItems(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    try {
      if (editingItem) {
        // Update
        const { error } = await supabase
          .from('cost_items')
          .update({
            name,
            category,
            unit_type: unitType,
            default_unit_cost: parseFloat(defaultUnitCost),
            description: description || null,
            is_active: isActive,
          })
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('cost_items')
          .insert({
            owner_id: ownerId,
            name,
            category,
            unit_type: unitType,
            default_unit_cost: parseFloat(defaultUnitCost),
            description: description || null,
            is_active: isActive,
          })

        if (error) throw error
      }

      resetForm()
      await loadItems()
    } catch (error: any) {
      console.error('Error saving cost item:', error)
      alert('Failed to save cost item: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cost item?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('cost_items')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting item: ' + error.message)
    } else {
      await loadItems()
    }
  }

  const handleEdit = (item: CostItem) => {
    setEditingItem(item)
    setName(item.name)
    setCategory(item.category)
    setUnitType(item.unit_type)
    setDefaultUnitCost(item.default_unit_cost.toString())
    setDescription(item.description || '')
    setIsActive(item.is_active)
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingItem(null)
    setName('')
    setCategory('cabinets')
    setUnitType('each')
    setDefaultUnitCost('')
    setDescription('')
    setIsActive(true)
    setShowForm(false)
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatUnitType = (type: string) => {
    const map: Record<string, string> = {
      'each': 'Each',
      'sqft': 'Sq Ft',
      'linear_ft': 'Linear Ft',
      'hour': 'Hour',
      'flat': 'Flat'
    }
    return map[type] || type
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading catalog...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Cost Catalog</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Item
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
          <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-4">
            {editingItem ? 'Edit Cost Item' : 'Add Cost Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Quartz Countertop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Type *
                </label>
                <select
                  required
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="each">Each</option>
                  <option value="sqft">Square Foot</option>
                  <option value="linear_ft">Linear Foot</option>
                  <option value="hour">Hour</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Unit Cost *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={defaultUnitCost}
                  onChange={(e) => setDefaultUnitCost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Optional description..."
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active (visible in catalog)
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'No items match your search'
                    : 'No cost items yet. Create your first item!'}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatUnitType(item.unit_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.default_unit_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
