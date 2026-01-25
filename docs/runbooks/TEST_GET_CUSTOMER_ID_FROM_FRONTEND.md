# Test get_current_customer_id() from Frontend

The SQL Editor might not have user context. Test from the application instead.

## Option 1: Test via Browser Console

1. Open your app in the browser
2. Log in as a **customer** user
3. Open browser DevTools (F12)
4. Go to Console tab
5. Paste this code:

```javascript
// Get Supabase client
const { createClient } = require('@supabase/supabase-js')
// Or if using Next.js:
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// Test the function
async function testCustomerId() {
  // First, check current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('Current user:', user?.email, user?.id)
  
  // Test the function via RPC
  const { data, error } = await supabase.rpc('get_current_customer_id')
  console.log('Customer ID result:', data)
  console.log('Error:', error)
  
  // Also check if customer record exists
  if (user?.email) {
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id, email, full_name')
      .eq('email', user.email)
      .limit(1)
    
    console.log('Customer record:', customers)
    console.log('Customer error:', custError)
  }
}

testCustomerId()
```

## Option 2: Create a Test Page

Create a test page at `/test-customer-id` to verify the function works.

## Option 3: Check in SQL Editor with Proper Auth

In Supabase SQL Editor:
1. Make sure you're logged into Supabase Dashboard
2. The SQL Editor runs queries as the **service role** by default (no user context)
3. To test with user context, you need to use the REST API or test from the app

## Common Issues

1. **auth.uid() is null**: SQL Editor doesn't have user context
2. **Customer record doesn't exist**: User needs to accept an invite first
3. **Email mismatch**: Customer email doesn't match auth.users email
