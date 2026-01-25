// Supabase Edge Function: Cabinet Bulk Upload
// Handles Excel file uploads, validation, and database insertion

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

// Types
interface ExcelCabinetRow {
  Room?: string
  Cabinet_Type?: string
  Width_in?: number | string
  Height_in?: number | string
  Depth_in?: number | string
  Quantity?: number | string
  Project_ID?: string
  Cabinet_Code?: string
  Material?: string
  Finish?: string
  Door_Type?: string
  Drawer_Count?: number | string
  Hinge_Type?: string
  Labor_Level?: string
  CNC_Ready?: string
  SKU?: string
  Unit_Price?: number | string
  Notes?: string
}

interface ValidatedCabinet {
  project_id: string
  owner_id: string
  customer_id: string | null
  room: string
  cabinet_type: string
  width_in: number
  height_in: number
  depth_in: number
  quantity: number
  cabinet_code: string | null
  material: string | null
  finish: string | null
  door_type: string | null
  drawer_count: number | null
  hinge_type: string | null
  labor_level: string | null
  cnc_ready: boolean
  sku: string | null
  unit_price: number | null
  notes: string | null
}

interface RowError {
  row: number
  errors: string[]
}

interface UploadResponse {
  batchId: string
  totalRows: number
  successRows: number
  failedRows: number
  errors: RowError[]
}

// Constants
const ALLOWED_ROOMS = ['Kitchen', 'Bathroom', 'Laundry', 'Mudroom', 'Closet', 'Other'] as const
const ALLOWED_CABINET_TYPES = ['Base', 'Wall', 'Tall', 'Pantry', 'Island', 'Other'] as const
const BATCH_SIZE = 100

// Helper: Parse numeric value
function parseNumeric(value: any): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) {
    return null
  }
  return num
}

// Helper: Parse integer value
function parseInteger(value: any): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const num = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (isNaN(num) || !Number.isInteger(num)) {
    return null
  }
  return num
}

// Validate a single Excel row
function validateRow(
  row: ExcelCabinetRow,
  rowNumber: number,
  defaultProjectId: string,
  defaultOwnerId: string,
  defaultCustomerId: string | null
): { valid: true; data: ValidatedCabinet } | { valid: false; errors: string[] } {
  const errors: string[] = []

  // Required: Room
  const room = row.Room?.toString().trim()
  if (!room) {
    errors.push('Room is required')
  } else if (!ALLOWED_ROOMS.includes(room as any)) {
    errors.push(`Room must be one of: ${ALLOWED_ROOMS.join(', ')}`)
  }

  // Required: Cabinet_Type
  const cabinetType = row.Cabinet_Type?.toString().trim()
  if (!cabinetType) {
    errors.push('Cabinet_Type is required')
  } else if (!ALLOWED_CABINET_TYPES.includes(cabinetType as any)) {
    errors.push(`Cabinet_Type must be one of: ${ALLOWED_CABINET_TYPES.join(', ')}`)
  }

  // Required: Width_in
  const widthIn = parseNumeric(row.Width_in)
  if (widthIn === null) {
    errors.push('Width_in is required and must be a number > 0')
  } else if (widthIn <= 0) {
    errors.push('Width_in must be > 0')
  }

  // Required: Height_in
  const heightIn = parseNumeric(row.Height_in)
  if (heightIn === null) {
    errors.push('Height_in is required and must be a number > 0')
  } else if (heightIn <= 0) {
    errors.push('Height_in must be > 0')
  }

  // Required: Depth_in
  const depthIn = parseNumeric(row.Depth_in)
  if (depthIn === null) {
    errors.push('Depth_in is required and must be a number > 0')
  } else if (depthIn <= 0) {
    errors.push('Depth_in must be > 0')
  }

  // Required: Quantity
  const quantity = parseInteger(row.Quantity)
  if (quantity === null) {
    errors.push('Quantity is required and must be an integer > 0')
  } else if (quantity <= 0) {
    errors.push('Quantity must be > 0')
  }

  // Optional: Project_ID (use default if not provided)
  const projectId = row.Project_ID?.toString().trim() || defaultProjectId

  // Optional: Drawer_Count
  let drawerCount: number | null = null
  if (row.Drawer_Count !== undefined && row.Drawer_Count !== null && row.Drawer_Count !== '') {
    const parsed = parseInteger(row.Drawer_Count)
    if (parsed === null) {
      errors.push('Drawer_Count must be an integer >= 0 if provided')
    } else if (parsed < 0) {
      errors.push('Drawer_Count must be >= 0')
    } else {
      drawerCount = parsed
    }
  }

  // Optional: Unit_Price
  let unitPrice: number | null = null
  if (row.Unit_Price !== undefined && row.Unit_Price !== null && row.Unit_Price !== '') {
    const parsed = parseNumeric(row.Unit_Price)
    if (parsed === null) {
      errors.push('Unit_Price must be a number >= 0 if provided')
    } else if (parsed < 0) {
      errors.push('Unit_Price must be >= 0')
    } else {
      unitPrice = parsed
    }
  }

  // Optional: CNC_Ready
  let cncReady = false
  if (row.CNC_Ready !== undefined && row.CNC_Ready !== null && row.CNC_Ready !== '') {
    const cncValue = row.CNC_Ready.toString().trim().toLowerCase()
    if (cncValue === 'yes' || cncValue === 'true' || cncValue === '1') {
      cncReady = true
    } else if (cncValue === 'no' || cncValue === 'false' || cncValue === '0') {
      cncReady = false
    } else {
      errors.push('CNC_Ready must be "Yes" or "No" if provided')
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const validated: ValidatedCabinet = {
    project_id: projectId,
    owner_id: defaultOwnerId,
    customer_id: defaultCustomerId,
    room: room!,
    cabinet_type: cabinetType!,
    width_in: widthIn!,
    height_in: heightIn!,
    depth_in: depthIn!,
    quantity: quantity!,
    cabinet_code: row.Cabinet_Code?.toString().trim() || null,
    material: row.Material?.toString().trim() || null,
    finish: row.Finish?.toString().trim() || null,
    door_type: row.Door_Type?.toString().trim() || null,
    drawer_count: drawerCount,
    hinge_type: row.Hinge_Type?.toString().trim() || null,
    labor_level: row.Labor_Level?.toString().trim() || null,
    cnc_ready: cncReady,
    sku: row.SKU?.toString().trim() || null,
    unit_price: unitPrice,
    notes: row.Notes?.toString().trim() || null,
  }

  return { valid: true, data: validated }
}

// Verify JWT and get user info
async function verifyUser(supabaseUrl: string, supabaseAnonKey: string, token: string, serviceRoleKey: string): Promise<{ userId: string; role: string }> {
  if (!token || token.length === 0) {
    console.error('Missing token')
    throw new Error('Missing or invalid Authorization header')
  }

  console.log('Verifying token, length:', token.length)
  
  try {
    // Verify token by making a request to Supabase Auth API
    // This properly verifies the JWT signature
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
    })
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error('Auth API error:', authResponse.status, errorText)
      throw new Error(`Token verification failed: ${authResponse.status} ${errorText}`)
    }
    
    const user = await authResponse.json()
    
    if (!user || !user.id) {
      console.error('No user returned from auth API')
      throw new Error('Invalid token: user not found')
    }
    
    console.log('User verified via Auth API:', user.id, user.email)
    
    // Get user profile to check role using Admin API
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError.message)
      throw new Error(`User profile not found: ${profileError.message}`)
    }
    
    if (!profile) {
      console.error('No profile found for user:', user.id)
      throw new Error('User profile not found')
    }

    if (profile.role !== 'owner') {
      console.error('User is not owner, role:', profile.role)
      throw new Error('Only owners can upload cabinets')
    }

    console.log('User verified as owner:', user.id)
    return { userId: user.id, role: profile.role }
  } catch (error: any) {
    console.error('Token verification failed:', error.message, error.stack)
    throw new Error(`Invalid or expired token: ${error.message}`)
  }
}

// Verify user owns the project
async function verifyProjectOwnership(
  supabase: any,
  projectId: string,
  ownerId: string
): Promise<void> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    throw new Error('Project not found')
  }

  if (project.owner_id !== ownerId) {
    throw new Error('You do not have permission to upload cabinets for this project')
  }
}

// Parse multipart form data
async function parseMultipartFormData(request: Request): Promise<{ file: File; fileName: string }> {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    throw new Error('No file provided. Expected field name: "file"')
  }

  // Validate file type
  if (!file.name.endsWith('.xlsx')) {
    throw new Error('File must be an Excel file (.xlsx only)')
  }

  return { file, fileName: file.name }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get projectId from query params
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing required query parameter: projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization')

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not configured. Set it as a secret or ensure it\'s available in the environment.')
    }

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Supabase keys not configured. Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY secrets.')
    }
    
    // Extract token from header
    const token = authHeader?.replace(/^Bearer\s+/i, '') || ''
    
    console.log('Auth header received:', {
      hasHeader: !!authHeader,
      headerLength: authHeader?.length || 0,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
    })
    
    if (!token) {
      console.error('No token extracted from Authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Client for database operations (uses service role key)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify user and get owner ID
    const { userId: ownerId } = await verifyUser(supabaseUrl, supabaseAnonKey, token, supabaseServiceKey)

    // Verify project ownership
    await verifyProjectOwnership(supabase, projectId, ownerId)

    // Parse multipart form data
    const { file, fileName } = await parseMultipartFormData(req)
    const fileBuffer = await file.arrayBuffer()

    // Parse Excel file
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' })
    
    // Get the "Cabinet_Requirements" sheet
    const sheetName = 'Cabinet_Requirements'
    if (!workbook.SheetNames.includes(sheetName)) {
      return new Response(
        JSON.stringify({ 
          error: `Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const worksheet = workbook.Sheets[sheetName]
    const rows: ExcelCabinetRow[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
    })

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Excel file contains no data rows' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get project's customer_id (optional)
    const { data: project } = await supabase
      .from('projects')
      .select('customer_id')
      .eq('id', projectId)
      .single()

    const customerId = project?.customer_id || null

    // Validate and collect rows
    const validatedCabinets: ValidatedCabinet[] = []
    const rowErrors: RowError[] = []

    rows.forEach((row, index) => {
      const rowNumber = index + 2 // Row 1 is header, so data starts at row 2
      const validation = validateRow(row, rowNumber, projectId, ownerId, customerId)

      if (validation.valid) {
        validatedCabinets.push(validation.data)
      } else {
        rowErrors.push({
          row: rowNumber,
          errors: validation.errors,
        })
      }
    })

    // Create batch record
    const { data: batchData, error: batchError } = await supabase
      .from('project_cabinet_batches')
      .insert({
        project_id: projectId,
        owner_id: ownerId,
        total_rows: rows.length,
        success_rows: 0,
        failed_rows: 0,
        status: 'processing',
        error_report: [],
        file_name: fileName,
        file_size: fileBuffer.byteLength,
      })
      .select()
      .single()

    if (batchError || !batchData) {
      throw new Error(`Failed to create batch record: ${batchError?.message || 'Unknown error'}`)
    }

    const batchId = batchData.id

    // Insert valid cabinets in batches
    let insertedCount = 0

    try {
      for (let i = 0; i < validatedCabinets.length; i += BATCH_SIZE) {
        const batch = validatedCabinets.slice(i, i + BATCH_SIZE)
        
        const cabinetsWithBatch = batch.map(cabinet => ({
          ...cabinet,
          batch_id: batchId,
        }))

        const { error: insertError } = await supabase
          .from('project_cabinets')
          .insert(cabinetsWithBatch)

        if (insertError) {
          // If batch insert fails, try individual inserts
          console.error(`Batch insert failed at offset ${i}:`, insertError)
          
          for (const cabinet of batch) {
            const { error: singleError } = await supabase
              .from('project_cabinets')
              .insert({ ...cabinet, batch_id: batchId })

            if (singleError) {
              const originalRowIndex = validatedCabinets.indexOf(cabinet)
              const excelRowNumber = originalRowIndex + 2
              
              rowErrors.push({
                row: excelRowNumber,
                errors: [`Database insert failed: ${singleError.message}`],
              })
            } else {
              insertedCount++
            }
          }
        } else {
          insertedCount += batch.length
        }
      }

      // Update batch record
      const finalStatus = rowErrors.length === 0 
        ? 'completed' 
        : (insertedCount > 0 ? 'completed' : 'failed')
      
      await supabase
        .from('project_cabinet_batches')
        .update({
          success_rows: insertedCount,
          failed_rows: rowErrors.length,
          status: finalStatus,
          error_report: rowErrors,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchId)

      const response: UploadResponse = {
        batchId,
        totalRows: rows.length,
        successRows: insertedCount,
        failedRows: rowErrors.length,
        errors: rowErrors,
      }

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } catch (error) {
      // Update batch to failed status
      await supabase
        .from('project_cabinet_batches')
        .update({
          status: 'failed',
          error_report: rowErrors,
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchId)

      throw error
    }
  } catch (error: any) {
    console.error('Error processing upload:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      { 
        status: error.message?.includes('not found') || error.message?.includes('Missing') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
