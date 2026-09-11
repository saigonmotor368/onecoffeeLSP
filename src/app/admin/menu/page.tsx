'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/providers'
import { formatPrice } from '@/lib/utils'
import { categories as defaultCategories, menuProducts as defaultMenuProducts } from '@/lib/menu-data'
import AdminSidebar from '@/components/AdminSidebar'

interface ProductItem {
  id: string
  name_vi: string
  name_en: string
  category_id?: string
  category_slug?: string
  description_vi?: string | null
  description_en?: string | null
  price_m: number | null
  price_l: number | null
  image_url?: string | null
  is_available: boolean
  is_featured?: boolean
  is_new?: boolean
  is_recommended?: boolean
  sort_order?: number
}

export default function AdminMenuPage() {
  const { showToast } = useToast()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name_vi: '',
    name_en: '',
    category_slug: 'coffee',
    price_m: '',
    price_l: '',
    description_vi: '',
    description_en: '',
    image_url: '',
    is_available: true,
    is_featured: false,
    is_new: false,
  })

  const loadMenu = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) {
      // Fallback to local menu data if DB is empty or during development
      const fallbackList: ProductItem[] = defaultMenuProducts.map(p => ({
        ...p,
        is_available: true,
      }))
      setProducts(fallbackList)
    } else {
      setProducts(data as ProductItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  // Quick toggle availability (còn món / hết món)
  const toggleAvailability = async (id: string, current: boolean) => {
    const supabase = createClient()
    const updated = !current
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_available: updated } : p))

    const { error } = await supabase
      .from('products')
      .update({ is_available: updated })
      .eq('id', id)

    if (error) {
      // If error (e.g. offline/mock), show notification but keep state
      showToast(updated ? 'Đã bật: Còn món' : 'Đã tắt: Hết món', 'info')
    } else {
      showToast(updated ? 'Đã chuyển thành Còn món' : 'Đã chuyển thành Hết món', 'success')
    }
  }

  // Open modal for Create or Edit
  const openCreateModal = () => {
    setEditingProduct(null)
    setForm({
      name_vi: '',
      name_en: '',
      category_slug: 'coffee',
      price_m: '',
      price_l: '',
      description_vi: '',
      description_en: '',
      image_url: '',
      is_available: true,
      is_featured: false,
      is_new: false,
    })
    setShowModal(true)
  }

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p)
    setForm({
      name_vi: p.name_vi,
      name_en: p.name_en,
      category_slug: p.category_slug || 'coffee',
      price_m: p.price_m ? (p.price_m > 1000 ? (p.price_m / 1000).toString() : p.price_m.toString()) : '',
      price_l: p.price_l ? (p.price_l > 1000 ? (p.price_l / 1000).toString() : p.price_l.toString()) : '',
      description_vi: p.description_vi || '',
      description_en: p.description_en || '',
      image_url: p.image_url || '',
      is_available: p.is_available ?? true,
      is_featured: p.is_featured ?? false,
      is_new: p.is_new ?? false,
    })
    setShowModal(true)
  }

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()

    const priceMVal = form.price_m ? parseFloat(form.price_m) : null
    const priceLVal = form.price_l ? parseFloat(form.price_l) : null

    if (editingProduct) {
      // Update
      const { error } = await supabase
        .from('products')
        .update({
          name_vi: form.name_vi,
          name_en: form.name_en,
          price_m: priceMVal,
          price_l: priceLVal,
          description_vi: form.description_vi || null,
          description_en: form.description_en || null,
          image_url: form.image_url || null,
          is_available: form.is_available,
          is_featured: form.is_featured,
          is_new: form.is_new,
        })
        .eq('id', editingProduct.id)

      // Update locally
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        name_vi: form.name_vi,
        name_en: form.name_en,
        category_slug: form.category_slug,
        price_m: priceMVal,
        price_l: priceLVal,
        description_vi: form.description_vi,
        description_en: form.description_en,
        image_url: form.image_url,
        is_available: form.is_available,
        is_featured: form.is_featured,
        is_new: form.is_new,
      } : p))

      showToast('Cập nhật món thành công!', 'success')
    } else {
      // Insert
      const newId = 'prod-' + Date.now()
      const newProduct: ProductItem = {
        id: newId,
        name_vi: form.name_vi,
        name_en: form.name_en,
        category_slug: form.category_slug,
        price_m: priceMVal,
        price_l: priceLVal,
        description_vi: form.description_vi,
        description_en: form.description_en,
        image_url: form.image_url,
        is_available: form.is_available,
        is_featured: form.is_featured,
        is_new: form.is_new,
      }

      await supabase.from('products').insert({
        id: newId,
        category_id: 'cat-1', // Default category uuid or reference
        name_vi: form.name_vi,
        name_en: form.name_en,
        price_m: priceMVal,
        price_l: priceLVal,
        description_vi: form.description_vi,
        description_en: form.description_en,
        image_url: form.image_url,
        is_available: form.is_available,
        is_featured: form.is_featured,
        is_new: form.is_new,
      })

      setProducts(prev => [newProduct, ...prev])
      showToast('Thêm món mới thành công!', 'success')
    }

    setSaving(false)
    setShowModal(false)
  }

  // Delete product
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa món "${name}" không?`)) return
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    showToast(`Đã xóa món ${name}`, 'success')
  }

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'all' || p.category_slug === activeCategory
      const matchSearch = !searchQuery.trim() ||
        p.name_vi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name_en.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchSearch
    })
  }, [products, activeCategory, searchQuery])

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        <div className="admin-page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="admin-page-title">Quản lý Menu đồ uống</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              Tổng cộng {products.length} món trong thực đơn One Coffee
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Thêm món mới
          </button>
        </div>

        {/* Filter bar: Search & Category tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <input
                className="input"
                placeholder="🔍 Tìm tên món (Tiếng Việt hoặc English)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 16 }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={loadMenu} title="Tải lại">
              🔄 Tải lại
            </button>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => setActiveCategory('all')}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${activeCategory === 'all' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: activeCategory === 'all' ? 'var(--color-primary)' : 'white',
                color: activeCategory === 'all' ? 'white' : 'var(--color-text)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🌟 Tất cả ({products.length})
            </button>
            {defaultCategories.map(cat => {
              const count = products.filter(p => p.category_slug === cat.slug).length
              return (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: `1.5px solid ${activeCategory === cat.slug ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: activeCategory === cat.slug ? 'var(--color-primary)' : 'white',
                    color: activeCategory === cat.slug ? 'white' : 'var(--color-text)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.icon} {cat.name_vi} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Products Table */}
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              Hiển thị {filteredProducts.length} món
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <span className="spinner" />
              <p style={{ marginTop: 12, color: 'var(--color-text-secondary)' }}>Đang tải menu...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Không tìm thấy món nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên món</th>
                    <th>Danh mục</th>
                    <th>Giá Size M</th>
                    <th>Giá Size L</th>
                    <th>Trạng thái</th>
                    <th>Đặc điểm</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => {
                    const catObj = defaultCategories.find(c => c.slug === p.category_slug)
                    const displayM = p.price_m != null ? (p.price_m < 1000 ? p.price_m * 1000 : p.price_m) : null
                    const displayL = p.price_l != null ? (p.price_l < 1000 ? p.price_l * 1000 : p.price_l) : null

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                            {p.name_vi}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {p.name_en}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {catObj ? `${catObj.icon} ${catObj.name_vi}` : (p.category_slug ?? '—')}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {displayM != null ? formatPrice(displayM) : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {displayL != null ? formatPrice(displayL) : '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => toggleAvailability(p.id, p.is_available ?? true)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '12px',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                              background: p.is_available !== false ? 'rgba(76, 175, 80, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: p.is_available !== false ? '#2E7D32' : '#C62828',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: p.is_available !== false ? '#4CAF50' : '#EF4444'
                            }} />
                            {p.is_available !== false ? 'Còn món' : 'Hết món'}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {p.is_featured && (
                              <span style={{ fontSize: '11px', background: '#FFF3CD', color: '#856404', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                Hot
                              </span>
                            )}
                            {p.is_new && (
                              <span style={{ fontSize: '11px', background: '#D1E7DD', color: '#0F5132', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                Mới
                              </span>
                            )}
                            {p.is_recommended && (
                              <span style={{ fontSize: '11px', background: '#E2D9F3', color: '#59359A', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                Best
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditModal(p)}
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDelete(p.id, p.name_vi)}
                              style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--color-error)' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Create / Edit */}
        {showModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}>
            <div style={{
              background: 'white', borderRadius: 'var(--radius-xl)',
              maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)', padding: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                  {editingProduct ? 'Chỉnh sửa món đồ uống' : 'Thêm món đồ uống mới'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Tên tiếng Việt *</label>
                    <input
                      className="input"
                      placeholder="VD: Cà phê muối"
                      value={form.name_vi}
                      onChange={e => setForm(f => ({ ...f, name_vi: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Tên tiếng Anh</label>
                    <input
                      className="input"
                      placeholder="VD: Salted Cream Coffee"
                      value={form.name_en}
                      onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Danh mục</label>
                  <select
                    className="input"
                    value={form.category_slug}
                    onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))}
                  >
                    {defaultCategories.map(cat => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.icon} {cat.name_vi} ({cat.name_en})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Giá Size M (đơn vị: 1.000đ)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="VD: 36 (tức 36.000đ)"
                      value={form.price_m}
                      onChange={e => setForm(f => ({ ...f, price_m: e.target.value }))}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Giá Size L (đơn vị: 1.000đ)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="VD: 42 (tức 42.000đ)"
                      value={form.price_l}
                      onChange={e => setForm(f => ({ ...f, price_l: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Mô tả món (tùy chọn)</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Mô tả hương vị hoặc thành phần..."
                    value={form.description_vi}
                    onChange={e => setForm(f => ({ ...f, description_vi: e.target.value }))}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Link ảnh món (URL)</label>
                  <input
                    className="input"
                    placeholder="https://..."
                    value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '12px 0', borderTop: '1px solid var(--color-border-light)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={form.is_available}
                      onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))}
                    />
                    Còn món (Available)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                    />
                    Món nổi bật (Hot)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={form.is_new}
                      onChange={e => setForm(f => ({ ...f, is_new: e.target.checked }))}
                    />
                    Món mới (New)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu món'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
