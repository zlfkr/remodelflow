'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Design {
  id: string
  project_id: string
  file_url: string
  file_name: string
  file_type: string | null
  file_size: number | null
  version: number
  status: 'draft' | 'in_review' | 'approved' | 'revised'
  uploaded_by: string
  description: string | null
  created_at: string
  updated_at: string
}

interface DesignApproval {
  id: string
  design_id: string
  approved_by: string
  approved_at: string
  comment: string | null
}

interface ProjectDesignsProps {
  projectId: string
  userRole: 'owner' | 'customer'
  userId: string
  onProjectUpdate?: () => void // Callback to refresh project data after status change
}

export default function ProjectDesigns({ projectId, userRole, userId, onProjectUpdate }: ProjectDesignsProps) {
  const [designs, setDesigns] = useState<Design[]>([])
  const [approvals, setApprovals] = useState<Record<string, DesignApproval>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [approvingDesignId, setApprovingDesignId] = useState<string | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadDesigns()
  }, [projectId])

  const loadDesigns = async () => {
    const supabase = createClient()
    
    // Load designs
    const { data: designsData, error: designsError } = await supabase
      .from('project_designs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (designsError) {
      console.error('Error loading designs:', designsError)
    } else if (designsData) {
      setDesigns(designsData)

      // Load approvals for all designs
      const designIds = designsData.map(d => d.id)
      if (designIds.length > 0) {
        const { data: approvalsData, error: approvalsError } = await supabase
          .from('design_approvals')
          .select('*')
          .in('design_id', designIds)

        if (approvalsError) {
          console.error('Error loading approvals:', approvalsError)
        } else if (approvalsData) {
          const approvalsMap: Record<string, DesignApproval> = {}
          approvalsData.forEach(approval => {
            approvalsMap[approval.design_id] = approval
          })
          setApprovals(approvalsMap)
        }
      }
    }

    setLoading(false)
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || uploading) return

    setUploading(true)
    const supabase = createClient()

    try {
      // Check if there's an approved design - if so, force new version
      const hasApprovedDesign = designs.some(d => d.status === 'approved')
      const maxVersion = designs.length > 0 
        ? Math.max(...designs.map(d => d.version)) 
        : 0
      
      // If there's an approved design, warn about creating new version
      if (hasApprovedDesign && !confirm('There is an approved design. This will create a new version. Continue?')) {
        setUploading(false)
        return
      }

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${projectId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-designs')
        .upload(fileName, selectedFile)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-designs')
        .getPublicUrl(fileName)

      // Create design record
      const { data: designData, error: designError } = await supabase
        .from('project_designs')
        .insert({
          project_id: projectId,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          version: maxVersion + 1,
          status: 'in_review',
          uploaded_by: userId,
          description: description || null,
        })
        .select()
        .single()

      if (designError) {
        throw designError
      }

      // Create activity entry
      await supabase.rpc('create_project_activity', {
        p_project_id: projectId,
        p_type: 'design_uploaded',
        p_description: `Design uploaded: ${selectedFile.name}`,
        p_metadata: { file_name: selectedFile.name, version: maxVersion + 1 },
        p_created_by: userId,
      })

      // Create notification for customer
      const { data: project } = await supabase
        .from('projects')
        .select('customer_id, customers(email)')
        .eq('id', projectId)
        .single()

      if (project && project.customers) {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', (project.customers as any).email) // This needs to be fixed - should get profile by email
          .single()

        // TODO: Get customer's profile ID properly
        // For now, notification creation might need adjustment
      }

      setShowUploadForm(false)
      setSelectedFile(null)
      setDescription('')
      await loadDesigns()
    } catch (error: any) {
      console.error('Error uploading design:', error)
      alert('Failed to upload design: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleApproveDesign = async (designId: string) => {
    if (sending) return // Prevent double-clicks
    
    const supabase = createClient()
    const design = designs.find(d => d.id === designId)
    
    if (!design) {
      alert('Design not found')
      return
    }

    // 🔧 3. Prevent double approval - Check status and approval record
    if (design.status === 'approved') {
      alert('This design has already been approved')
      await loadDesigns() // Refresh to get latest state
      setSending(false)
      return
    }
    
    // Also check if approval record exists (double-check)
    const existingApproval = approvals[designId]
    if (existingApproval) {
      alert('This design has already been approved')
      await loadDesigns() // Refresh to get latest state
      setSending(false)
      return
    }

    setSending(true)
    try {
      // Step 1: Insert approval (comment is optional)
      const { data: approvalData, error: approvalError } = await supabase
        .from('design_approvals')
        .insert({
          design_id: designId,
          approved_by: userId,
          comment: approvalComment.trim() || null,
        })
        .select()
        .single()

      if (approvalError) {
        // 🔧 3. Handle duplicate approval error gracefully
        if (approvalError.code === '23505' || approvalError.message.includes('duplicate')) {
          alert('This design has already been approved. Refreshing...')
          await loadDesigns()
          setSending(false)
          return
        }
        throw approvalError
      }

      // Step 2: Update design status to 'approved'
      const { error: updateError } = await supabase
        .from('project_designs')
        .update({ status: 'approved' })
        .eq('id', designId)

      if (updateError) {
        // Rollback: delete the approval if status update fails
        if (approvalData) {
          await supabase
            .from('design_approvals')
            .delete()
            .eq('id', approvalData.id)
        }
        throw updateError
      }

      // Step 3: Auto-update project status if needed
      // If project is "in_progress" and design is approved, move to "review"
      // Use stored function to avoid RLS recursion issues
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('status')
          .eq('id', projectId)
          .single()

        if (projectError) {
          console.error('[Design Approval] Error fetching project status:', projectError)
        } else if (projectData) {
          console.log('[Design Approval] Current project status:', projectData.status)
          
          if (projectData.status === 'in_progress') {
            console.log('[Design Approval] Auto-progressing project to "review" status')
            
            // Use stored function to update status (avoids RLS recursion)
            const { error: functionError } = await supabase.rpc('customer_progress_project_status', {
              p_project_id: projectId
            })

            if (functionError) {
              console.error('[Design Approval] Status update failed:', functionError)
              // Log detailed error for debugging
              console.error('[Design Approval] Error details:', {
                message: functionError.message,
                details: functionError.details,
                hint: functionError.hint,
                code: functionError.code
              })
              // Show error to user
              alert(`Design approved, but status update failed: ${functionError.message}`)
            } else {
              console.log('[Design Approval] Project status updated to "review" via function')
              // Refresh project data to show updated status
              if (onProjectUpdate) {
                onProjectUpdate()
              }
            }
          } else {
            console.log('[Design Approval] Project status is not "in_progress", skipping auto-progression. Current:', projectData.status)
          }
        }
      } catch (statusErr) {
        console.error('[Design Approval] Unexpected error in status update:', statusErr)
        // Don't fail approval if status update fails, but log it
      }

      // Step 4: Create activity entry for design approval
      // Try RPC first, fallback to direct INSERT
      const activityResult = await supabase.rpc('create_project_activity', {
        p_project_id: projectId,
        p_type: 'design_approved',
        p_description: `Customer approved design: ${design.file_name || 'Design'} (v${design.version})`,
        p_metadata: { 
          design_id: designId,
          file_name: design.file_name,
          version: design.version
        },
        p_created_by: userId,
      })

      // If RPC fails, try direct INSERT
      if (activityResult.error) {
        const { error: insertError } = await supabase
          .from('project_activity')
          .insert({
            project_id: projectId,
            type: 'design_approved',
            description: `Customer approved design: ${design.file_name || 'Design'} (v${design.version})`,
            metadata: { 
              design_id: designId,
              file_name: design.file_name,
              version: design.version
            },
            created_by: userId,
          })

        if (insertError) {
          console.error('Error creating activity:', insertError)
          // Don't fail the approval if activity creation fails
        }
      }

      // Success: Update UI immediately (optimistic update)
      // Update local state before refreshing to show immediate feedback
      setDesigns(prevDesigns => 
        prevDesigns.map(d => 
          d.id === designId 
            ? { ...d, status: 'approved' as const }
            : d
        )
      )
      
      // Update approvals map immediately
      if (approvalData) {
        setApprovals(prev => ({
          ...prev,
          [designId]: approvalData
        }))
      }
      
      // Clear form
      setApprovingDesignId(null)
      setApprovalComment('')
      
      // Refresh to get latest data (non-blocking)
      loadDesigns().catch(err => console.error('Error refreshing designs:', err))
      
      // Also refresh project data if callback is provided (to show status change)
      if (onProjectUpdate) {
        onProjectUpdate()
      }
      
      // Notify parent component to refresh project data (for status update)
      // Wait a bit to ensure status update completes
      if (onProjectUpdate) {
        setTimeout(() => {
          console.log('[Design Approval] Refreshing project data...')
          onProjectUpdate()
        }, 1000) // Give time for status update to complete
      }
    } catch (error: any) {
      console.error('Error approving design:', error)
      const errorMessage = error.code === '23505' 
        ? 'This design has already been approved'
        : error.message || 'Failed to approve design'
      alert(errorMessage)
      // Refresh to get latest state
      await loadDesigns()
    } finally {
      setSending(false)
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading designs...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Designs</h3>
        {userRole === 'owner' && (
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            {showUploadForm ? 'Cancel' : 'Upload Design'}
          </button>
        )}
      </div>

      {/* Upload Form (Owner only) */}
      {showUploadForm && userRole === 'owner' && (
        <form onSubmit={handleFileUpload} className="mb-6 p-4 border rounded-lg bg-gray-50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Design File
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a description for this design..."
              />
            </div>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      )}

      {/* Designs List */}
      {designs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">📐</div>
          <p className="text-gray-600 font-medium mb-2">
            {userRole === 'owner' 
              ? 'No designs uploaded yet'
              : 'No designs available yet'}
          </p>
          <p className="text-sm text-gray-500">
            {userRole === 'owner' 
              ? 'Designs will appear here once uploaded'
              : 'Designs will appear here once your project manager uploads them'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {designs.map((design) => {
            const approval = approvals[design.id]
            // 🔧 2. UI Update: isApproved if status is approved OR approval record exists
            const isApproved = design.status === 'approved' || !!approval
            const isLocked = isApproved // Lock approved designs

            return (
              <div key={design.id} className={`border rounded-lg p-4 ${isLocked ? 'bg-green-50 border-green-200' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{design.file_name}</h4>
                      {isLocked && <span className="text-lg" title="Approved and locked">🔒</span>}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isApproved || design.status === 'approved' ? 'bg-green-100 text-green-800' :
                        design.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {isApproved || design.status === 'approved' ? 'approved' : design.status}
                      </span>
                      <span className="text-xs text-gray-500">v{design.version}</span>
                    </div>
                    {design.description && (
                      <p className="text-sm text-gray-600 mt-1">{design.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(design.file_size)} • {new Date(design.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Design Preview/Download */}
                <div className="mt-3">
                  {design.file_type?.startsWith('image/') ? (
                    <div className="relative">
                      <img
                        src={design.file_url}
                        alt={design.file_name}
                        className="max-w-full h-auto rounded border"
                        loading="lazy"
                        style={{ display: 'block' }}
                      />
                    </div>
                  ) : (
                    <a
                      href={design.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      View PDF
                    </a>
                  )}
                </div>

                {/* Approval Section (Customer only) */}
                {userRole === 'customer' && (
                  <div className="mt-4 pt-4 border-t">
                    {/* Show approval info if approved (status is 'approved' OR approval record exists) */}
                    {isApproved ? (
                      <div className="space-y-2 bg-green-50 p-3 rounded">
                        <div className="flex items-center space-x-2 text-green-700">
                          <span className="text-lg">✅</span>
                          <span className="font-medium">Approved</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p className="font-medium">Approved by customer</p>
                          {approval?.approved_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(approval.approved_at).toLocaleString()}
                            </p>
                          )}
                          {approval?.comment && (
                            <p className="text-sm text-gray-700 mt-2 italic">
                              "{approval.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                    ) : design.status === 'in_review' ? (
                      /* Show approve button only if in_review and not approved */
                      approvingDesignId === design.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Approval Comment (optional)
                            </label>
                            <textarea
                              value={approvalComment}
                              onChange={(e) => setApprovalComment(e.target.value)}
                              placeholder="Add your approval comment (optional)..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Your approval will be final. You cannot approve this design again.
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveDesign(design.id)}
                              disabled={sending || design.status === 'approved' || isApproved}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sending ? 'Approving...' : '✓ Approve Design'}
                            </button>
                            <button
                              onClick={() => {
                                setApprovingDesignId(null)
                                setApprovalComment('')
                              }}
                              disabled={sending}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            // 🔧 3. Prevent double approval - Double-check before allowing
                            if (design.status === 'approved' || isApproved) {
                              alert('This design has already been approved')
                              loadDesigns()
                              return
                            }
                            setApprovingDesignId(design.id)
                          }}
                          disabled={design.status === 'approved' || isApproved}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✓ Approve Design
                        </button>
                      )
                    ) : null}
                  </div>
                )}

                {/* Owner Actions - Lock approved designs */}
                {userRole === 'owner' && (
                  <div className="mt-4 pt-4 border-t">
                    {isLocked ? (
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <span>🔒</span>
                        <span>This design is approved and locked. Upload a new version to make changes.</span>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this design?')) return
                          const supabase = createClient()
                          const { error } = await supabase
                            .from('project_designs')
                            .delete()
                            .eq('id', design.id)
                          if (error) {
                            alert('Error deleting design: ' + error.message)
                          } else {
                            await loadDesigns()
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        Delete Design
                      </button>
                    )}
                  </div>
                )}

                {/* Approval Info - Show for owner when approved (customer sees it in their section above) */}
                {userRole === 'owner' && isApproved && approval && (
                  <div className="mt-4 pt-4 border-t bg-green-50 p-3 rounded">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 text-lg">✅</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">✅ Approved</p>
                        <p className="text-xs text-green-700 mt-1">Approved by customer</p>
                        {approval.approved_at && (
                          <p className="text-xs text-green-600 mt-1">
                            {new Date(approval.approved_at).toLocaleString()}
                          </p>
                        )}
                        {approval.comment && (
                          <p className="text-sm text-green-700 mt-2 italic">
                            "{approval.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
