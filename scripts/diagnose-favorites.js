/**
 * Diagnose favorites feature:
 * 1. Fetch products from Supabase to see their actual IDs
 * 2. Check if static menu-data IDs match Supabase IDs
 * 3. Simulate what happens when user clicks ❤️
 */

const SUPABASE_URL = 'https://hidebmafolacwfzgrrqn.supabase.co'
const ANON_KEY = 'sb_publishable_guOvaX17uY9puFkm8Al8fg_T1t2qRBm'

async function main() {
  console.log('🔍 Diagnosing favorites feature...\n')

  // 1. Fetch actual products from Supabase
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=id,name_vi,name_en,is_available&order=sort_order.asc&limit=10`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  )

  if (!res.ok) {
    console.log('❌ Cannot fetch products:', res.status)
    return
  }

  const products = await res.json()
  console.log(`✅ Found ${products.length} products in Supabase:\n`)

  products.forEach((p, i) => {
    const isUUID = /^[0-9a-f-]{36}$/i.test(p.id)
    console.log(`  ${i+1}. ID: ${p.id}`)
    console.log(`     Name: ${p.name_vi}`)
    console.log(`     UUID? ${isUUID ? '✅ YES' : '❌ NO — likely slug-based ID!'}`)
    console.log()
  })

  // 2. Check what ID format the products have
  const sampleId = products[0]?.id || ''
  const allUUIDs = products.every(p => /^[0-9a-f-]{36}$/i.test(p.id))

  console.log('━'.repeat(50))
  if (allUUIDs) {
    console.log('✅ All products have UUID format IDs')
    console.log('   → Favorites should work if stored as UUIDs')
    console.log('\n📋 SIMULATE: What happens when user taps ❤️ on first product:')
    console.log(`   toggleFavorite("${products[0].id}")`)
    console.log(`   → localStorage.setItem('oc_favorite_ids', '["${products[0].id}"]')`)
    console.log('\n📋 SIMULATE: Favorites filter:')
    console.log(`   favorites = ["${products[0].id}"]`)
    console.log(`   productsList.filter(p => favorites.includes(p.id))`)
    console.log(`   → Should return: [${products[0].name_vi}] ✅`)
  } else {
    console.log('❌ Products have NON-UUID IDs — this is the bug!')
    console.log(`   Sample ID: "${sampleId}"`)
  }

  // 3. Check if there are any profile records with favorite_ids
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (SERVICE_KEY) {
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,favorite_ids&not.favorite_ids.eq.%7B%7D&limit=5`,
      { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
    )
    if (profileRes.ok) {
      const profiles = await profileRes.json()
      console.log(`\n📋 Profiles with favorites: ${profiles.length}`)
      profiles.forEach(p => {
        console.log(`   User ${p.id.slice(0,8)}: favorites = ${JSON.stringify(p.favorite_ids)}`)
      })
    }
  }

  console.log('\n━'.repeat(50))
  console.log('✅ Diagnosis complete')
  console.log('\n💡 If products have UUIDs but favorites not showing:')
  console.log('   → User stored OLD slug IDs before UUID migration')
  console.log('   → Solution: User should bấm "🗑 Xóa & chọn lại" on favorites tab')
  console.log('   → OR clear localStorage manually:')
  console.log("   → In browser console: localStorage.removeItem('oc_favorite_ids')")
}

main().catch(console.error)
