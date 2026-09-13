/**
 * Add/update Vercel environment variables via Vercel REST API
 * Uses VERCEL_TOKEN from env or provided directly
 * Does NOT log secret values
 */

const fs = require('fs')
const path = require('path')

// Read .env.local safely
function readEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const content = fs.readFileSync(envPath, 'utf8')
  const vars = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    vars[key] = val
  }
  return vars
}

async function getProjectId(token) {
  // Try to find the Vercel project by name
  const res = await fetch('https://api.vercel.com/v9/projects?limit=20', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cannot list projects: ${res.status} ${err}`)
  }
  const data = await res.json()
  const project = data.projects?.find(p =>
    p.name === 'onecoffee-lsp' ||
    p.name === 'one-coffee-lsp' ||
    p.name === 'onecafe-lspvn' ||
    (p.targets?.production?.url || '').includes('onecafe.lspvn.com')
  )
  if (!project) {
    console.log('Available projects:', data.projects?.map(p => `${p.name} (${p.id})`))
    throw new Error('Project not found. Check the project name above.')
  }
  return { id: project.id, name: project.name }
}

async function upsertEnvVar(token, projectId, key, value, target = ['production', 'preview']) {
  // First check if it exists
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?decrypt=false`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )

  if (listRes.ok) {
    const listData = await listRes.json()
    const existing = listData.envs?.find(e => e.key === key)

    if (existing) {
      // Update existing
      const patchRes = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value, target, type: 'encrypted' })
        }
      )
      if (!patchRes.ok) {
        const err = await patchRes.text()
        console.error(`❌ Failed to update ${key}: ${err}`)
        return false
      }
      console.log(`✅ Updated ${key} (${value.length} chars) → ${target.join(',')}`)
      return true
    }
  }

  // Create new
  const createRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, target, type: 'encrypted' })
    }
  )

  if (!createRes.ok) {
    const err = await createRes.text()
    console.error(`❌ Failed to create ${key}: ${err}`)
    return false
  }

  console.log(`✅ Created ${key} (${value.length} chars) → ${target.join(',')}`)
  return true
}

async function triggerDeploy(token, projectId) {
  const res = await fetch(`https://api.vercel.com/v13/deployments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'onecoffee-lsp',
      gitSource: {
        type: 'github',
        ref: 'main',
      },
      target: 'production',
    })
  })

  if (!res.ok) {
    const err = await res.text()
    console.log(`⚠️  Trigger deploy response: ${res.status} — ${err.slice(0, 200)}`)
    return null
  }

  const data = await res.json()
  return data
}

async function main() {
  // Get token from env
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    console.error('❌ VERCEL_TOKEN env var not set. Run: $env:VERCEL_TOKEN="your_token"; node scripts/setup-vercel-env.js')
    console.log('\nTo get your token: https://vercel.com/account/tokens')
    process.exit(1)
  }

  // Read values from .env.local
  const localEnv = readEnvLocal()

  const VAPID_PUBLIC = localEnv['NEXT_PUBLIC_VAPID_PUBLIC_KEY']
  const VAPID_PRIVATE = localEnv['VAPID_PRIVATE_KEY']
  const VAPID_EMAIL_VAL = localEnv['VAPID_EMAIL']
  const SUPABASE_SERVICE_KEY = localEnv['SUPABASE_SERVICE_ROLE_KEY']

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error('❌ VAPID keys not found in .env.local')
    process.exit(1)
  }

  console.log('🔍 Finding Vercel project...')
  const project = await getProjectId(token)
  console.log(`✅ Project: ${project.name} (${project.id})\n`)

  console.log('📝 Setting environment variables...')

  const varsToSet = [
    ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', VAPID_PUBLIC],
    ['VAPID_PRIVATE_KEY', VAPID_PRIVATE],
    ['VAPID_EMAIL', VAPID_EMAIL_VAL || 'mailto:admin@onecoffee.lspvn.com'],
    ...(SUPABASE_SERVICE_KEY ? [['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_KEY]] : []),
  ]

  let allOk = true
  for (const [key, value] of varsToSet) {
    if (!value) { console.log(`⚠️  Skipping ${key} (empty)`); continue }
    const ok = await upsertEnvVar(token, project.id, key, value)
    if (!ok) allOk = false
  }

  if (!allOk) {
    console.error('\n❌ Some variables failed. Check errors above.')
    process.exit(1)
  }

  console.log('\n✅ All environment variables set successfully!')
  console.log('🚀 Deploy is triggered automatically via GitHub push.')
  console.log('   Monitor at: https://vercel.com/dashboard')
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
