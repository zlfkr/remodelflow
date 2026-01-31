'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Customer {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  created_at: string
}

interface Project {
  id: string
  name: string
  status: string
  customer_id: string
  created_at: string
  customers: {
    email: string
    full_name: string | null
  }
}

export default function OwnerDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'customers' | 'projects'>('customers')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showDemo, setShowDemo] = useState(false)

  // Form states
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectCustomerId, setProjectCustomerId] = useState('')
  const [projectStatus, setProjectStatus] = useState<'draft' | 'in_progress' | 'review' | 'approved' | 'completed'>('draft')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    
    try {
      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (customersError) {
        console.error('Error loading customers:', customersError)
        alert('Error loading customers: ' + customersError.message)
      } else {
        console.log('Loaded customers:', customersData)
        setCustomers(customersData || [])
      }

      // Load projects (without join to avoid RLS issues)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) {
        console.error('Error loading projects:', projectsError)
        alert('Error loading projects: ' + projectsError.message)
      } else if (projectsData) {
        // Manually join customer data
        const customersList = customersData || []
        const projectsWithCustomers = projectsData.map(project => ({
          ...project,
          customers: customersList.find(c => c.id === project.customer_id) || null
        }))
        setProjects(projectsWithCustomers as Project[])
      } else {
        setProjects([])
      }
    } catch (err: any) {
      console.error('Error in loadData:', err)
      alert('Error loading data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Not authenticated')
      return
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, email, full_name')
      .eq('owner_id', user.id)
      .eq('email', customerEmail.toLowerCase().trim())
      .single()

    if (existingCustomer) {
      alert(`A customer with email "${customerEmail}" already exists. Please use a different email or update the existing customer.`)
      return
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        owner_id: user.id,
        email: customerEmail.toLowerCase().trim(),
        full_name: customerName || null,
        phone: customerPhone || null,
      })
      .select()

    if (error) {
      // Handle specific error cases
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        alert(`A customer with email "${customerEmail}" already exists. Please use a different email.`)
      } else {
        console.error('Error creating customer:', error)
        alert('Error creating customer: ' + error.message)
      }
      return
    }

    if (data && data.length > 0) {
      console.log('Customer created successfully:', data[0])
    }

    setShowCustomerForm(false)
    setEditingCustomer(null)
    setCustomerEmail('')
    setCustomerName('')
    setCustomerPhone('')
    
    // Reload data to show the new customer
    await loadData()
  }

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomer) return

    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({
        email: customerEmail.toLowerCase().trim(),
        full_name: customerName || null,
        phone: customerPhone || null,
      })
      .eq('id', editingCustomer.id)

    if (error) {
      console.error('Error updating customer:', error)
      alert('Error updating customer: ' + error.message)
      return
    }

    setShowCustomerForm(false)
    setEditingCustomer(null)
    setCustomerEmail('')
    setCustomerName('')
    setCustomerPhone('')
    await loadData()
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This will also delete all associated projects.')) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (error) {
      console.error('Error deleting customer:', error)
      alert('Error deleting customer: ' + error.message)
      return
    }

    await loadData()
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setCustomerEmail(customer.email)
    setCustomerName(customer.full_name || '')
    setCustomerPhone(customer.phone || '')
    setShowCustomerForm(true)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Not authenticated')
      return
    }

    const { error } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        customer_id: projectCustomerId,
        name: projectName,
        status: 'draft',
      })

    if (error) {
      alert('Error creating project: ' + error.message)
      return
    }

    setShowProjectForm(false)
    setEditingProject(null)
    setProjectName('')
    setProjectCustomerId('')
    setProjectStatus('draft')
    await loadData()
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Not authenticated')
      return
    }

    const { error } = await supabase
      .from('projects')
      .update({
        name: projectName,
        status: projectStatus,
        customer_id: projectCustomerId,
      })
      .eq('id', editingProject.id)

    if (error) {
      console.error('Error updating project:', error)
      alert('Error updating project: ' + error.message)
      return
    }

    setShowProjectForm(false)
    setEditingProject(null)
    setProjectName('')
    setProjectCustomerId('')
    setProjectStatus('draft')
    await loadData()
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      console.error('Error deleting project:', error)
      alert('Error deleting project: ' + error.message)
      return
    }

    await loadData()
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setProjectName(project.name)
    setProjectCustomerId(project.customer_id)
    setProjectStatus(project.status as any)
    setShowProjectForm(true)
  }

  const handleGenerateInvite = async (projectId: string) => {
    const supabase = createClient()
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    // Generate token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    const { data, error } = await supabase
      .from('project_invites')
      .insert({
        project_id: projectId,
        token,
        email: project.customers.email,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      alert('Error creating invite: ' + error.message)
      return
    }

    const inviteUrl = `${window.location.origin}/invite/${token}`
    setInviteLink(inviteUrl)
    setShowInviteForm(projectId)
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex flex-wrap items-center gap-x-6 gap-y-2">
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'customers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'projects'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Projects
          </button>
          <Link
            href="/owner/catalog"
            className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
          >
            Cost Catalog
          </Link>
          {/* Spacer to push Layout Builder button to the right */}
          <div className="flex-1" />
          {/* Wall Elevation - full canvas editor */}
          <Link
            href="/wall-elevation"
            className="py-2 px-4 bg-black text-white rounded-md hover:bg-gray-800 font-medium text-sm transition-colors whitespace-nowrap"
          >
            Wall Elevation
          </Link>
          <button
            onClick={() => setShowDemo(true)}
            className="py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 font-medium text-sm transition-colors whitespace-nowrap"
          >
            Load Marketing Demo
          </button>
        </nav>
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Customers</h2>
            <button
              onClick={() => setShowCustomerForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Customer
            </button>
          </div>

          {showCustomerForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-medium mb-4">
                {editingCustomer ? 'Edit Customer' : 'Create New Customer'}
              </h3>
              <form onSubmit={editingCustomer ? handleUpdateCustomer : handleCreateCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingCustomer ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerForm(false)
                      setEditingCustomer(null)
                      setCustomerEmail('')
                      setCustomerName('')
                      setCustomerPhone('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No customers yet. Create your first customer!
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.full_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
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
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Projects</h2>
            <div className="flex items-center gap-2">
              <Link
                href="/owner/projects"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                View full list →
              </Link>
              <button
                onClick={() => setShowProjectForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Project
              </button>
            </div>
          </div>

          {showProjectForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-medium mb-4">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer *</label>
                  <select
                    required
                    value={projectCustomerId}
                    onChange={(e) => setProjectCustomerId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name || customer.email}
                      </option>
                    ))}
                  </select>
                </div>
                {editingProject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status *</label>
                    <select
                      required
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value as any)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="draft">Draft</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingProject ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProjectForm(false)
                      setEditingProject(null)
                      setProjectName('')
                      setProjectCustomerId('')
                      setProjectStatus('draft')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No projects yet. Create your first project!
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link
                          href={`/owner/projects/${project.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.customers?.full_name || project.customers?.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          project.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditProject(project)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                          <button
                            onClick={() => handleGenerateInvite(project.id)}
                            className="text-green-600 hover:text-green-900 text-left"
                          >
                            Generate Invite
                          </button>
                          {showInviteForm === project.id && inviteLink && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border">
                              <p className="text-xs text-gray-600 mb-1">Invite Link:</p>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={inviteLink}
                                  className="flex-1 text-xs px-2 py-1 border rounded"
                                />
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(inviteLink)
                                    alert('Link copied to clipboard!')
                                  }}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Copy
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* MarketingDemoShowroom removed — optional demo component; add from @/app/marketing/MarketingDemoShowroom when available */}
    </div>
  )
}
