'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/providers'
import { getBanners, DEFAULT_BANNERS, type BannerItem } from '@/lib/settings'

export default function AdminBannersPage() {
  const { showToast } = useToast()
  const [banners, setBanners] = useState<BannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [form, setForm] = useState({
    title_vi: '',
    title_en: '',
    subtitle_vi: '',
    subtitle_en: '',
    badge_vi: 'Món Mới',
    badge_en: 'New',
    image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=1000&q=80',
    link_url: '/menu',
    sort_order: 1,
    is_active: true,
  })

  const loadBannersData = useCallback(async () => {
    setLoading(true)
    const list = await getBanners()
    setBanners(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadBannersData()
  }, [loadBannersData])

  const openCreateModal = () => {
    setEditingBanner(null)
    setForm({
      title_vi: '',
      title_en: '',
      subtitle_vi: '',
      subtitle_en: '',
      badge_vi: 'Món Mới',
      badge_en: 'New',
      image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=1000&q=80',
      link_url: '/menu',
      sort_order: banners.length + 1,
      is_active: true,
    })
    setShowModal(true)
  }

  const openEditModal = (b: BannerItem) => {
    setEditingBanner(b)
    setForm({
      title_vi: b.title_vi,
      title_en: b.title_en,
      subtitle_vi: b.subtitle_vi || '',
      subtitle_en: b.subtitle_en || '',
      badge_vi: b.badge_vi || 'Món Mới',
      badge_en: b.badge_en || 'New',
      image_url: b.image_url,
      link_url: b.link_url || '/menu',
      sort_order: b.sort_order,
      is_active: b.is_active,
    })
    setShowModal(true)
  }

  const saveBannersLocally = (newList: BannerItem[]) => {
    setBanners(newList)
    localStorage.setItem('oc_banners', JSON.stringify(newList))
  }

  const handleToggleActive = async (b: BannerItem) => {
    const updated = !b.is_active
    const newList = banners.map(item => item.id === b.id ? { ...item, is_active: updated } : item)
    saveBannersLocally(newList)

    try {
      const supabase = createClient()
      await supabase.from('banners').update({ is_active: updated }).eq('id', b.id)
    } catch {
      // offline fallback
    }

    showToast(updated ? `Đã kích hoạt banner "${b.title_vi}"` : `Đã tạm ẩn banner "${b.title_vi}"`, 'info')
  }

  const handleDelete = async (b: BannerItem) => {
    if (!confirm(`Bạn có chắc muốn xóa banner "${b.title_vi}"?`)) return
    const newList = banners.filter(item => item.id !== b.id)
    saveBannersLocally(newList)

    try {
      const supabase = createClient()
      await supabase.from('banners').delete().eq('id', b.id)
    } catch {
      // ignore
    }

    showToast('Đã xóa banner thành công', 'success')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title_vi.trim()) {
      showToast('Vui lòng nhập tiêu đề tiếng Việt', 'warning')
      return
    }

    setSaving(true)
    const bannerPayload = {
      title_vi: form.title_vi.trim(),
      title_en: form.title_en.trim() || form.title_vi.trim(),
      subtitle_vi: form.subtitle_vi.trim() || null,
      subtitle_en: form.subtitle_en.trim() || null,
      badge_vi: form.badge_vi.trim() || null,
      badge_en: form.badge_en.trim() || null,
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim() || '/menu',
      sort_order: Number(form.sort_order) || 1,
      is_active: form.is_active,
    }

    try {
      const supabase = createClient()
      if (editingBanner) {
        // Update
        const { error } = await supabase
          .from('banners')
          .update(bannerPayload)
          .eq('id', editingBanner.id)

        const newList = banners.map(item =>
          item.id === editingBanner.id ? { ...item, ...bannerPayload } : item
        )
        saveBannersLocally(newList)
        showToast('Đã cập nhật banner thành công!', 'success')
      } else {
        // Insert
        const newId = 'banner-' + Date.now()
        const { data, error } = await supabase
          .from('banners')
          .insert({ id: newId, ...bannerPayload })
          .select()
          .single()

        const createdItem: BannerItem = {
          id: data?.id || newId,
          ...bannerPayload,
        }
        saveBannersLocally([...banners, createdItem])
        showToast('Đã thêm banner sự kiện mới thành công!', 'success')
      }
      setShowModal(false)
    } catch (err) {
      console.error(err)
      showToast('Đã lưu banner vào bộ nhớ hệ thống', 'success')
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Quản lý Banner sự kiện & khuyến mãi</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              Admin có thể tùy biến các banner nổi bật trên trang chủ theo từng sự kiện, mùa lễ hội hoặc chiến dịch giảm giá.
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Thêm Banner Mới
          </button>
        </div>

        {/* Banner List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px' }}><span className="spinner" /></div>
        ) : banners.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '48px' }}>🎨</span>
            <p style={{ fontWeight: 700, margin: '12px 0 4px' }}>Chưa có banner nào</p>
            <p style={{ color: '#718096', fontSize: '13px' }}>Bấm "+ Thêm Banner Mới" để tạo banner đầu tiên</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {banners.map(b => (
              <div
                key={b.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Image Banner Preview */}
                <div style={{ position: 'relative', height: '160px', background: '#2D5A3D' }}>
                  <img
                    src={b.image_url}
                    alt={b.title_vi}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(30, 77, 59, 0.9)',
                      color: 'white',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {b.badge_vi || 'Sự kiện'}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: b.is_active ? '#38A169' : '#A0AEC0',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {b.is_active ? 'Đang hiển thị' : 'Đã ẩn'}
                  </div>
                </div>

                {/* Details */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1A202C', margin: 0 }}>
                    {b.title_vi}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#718096', margin: '4px 0 8px' }}>
                    {b.title_en}
                  </p>
                  {b.subtitle_vi && (
                    <p style={{ fontSize: '12px', color: '#4A5568', background: '#F7FAFC', padding: '6px 10px', borderRadius: '8px', margin: '0 0 12px' }}>
                      {b.subtitle_vi}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #EDF2F7' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(b)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#E53E3E' }}
                        onClick={() => handleDelete(b)}
                      >
                        Xóa
                      </button>
                    </div>

                    <button
                      className="btn btn-sm"
                      style={{
                        background: b.is_active ? '#EBF8FF' : '#F0FFF4',
                        color: b.is_active ? '#2B6CB0' : '#2F855A',
                        border: '1px solid currentColor',
                        fontWeight: 700,
                      }}
                      onClick={() => handleToggleActive(b)}
                    >
                      {b.is_active ? 'Tạm ẩn' : 'Bật hiển thị'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Create / Edit */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingBanner ? 'Chỉnh sửa Banner' : 'Thêm Banner Sự Kiện Mới'}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Tiêu đề (Tiếng Việt) *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Cà Phê Kem Muối Long Sơn"
                      value={form.title_vi}
                      onChange={e => setForm({ ...form, title_vi: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Tiêu đề (English)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Long Son Salted Coffee"
                      value={form.title_en}
                      onChange={e => setForm({ ...form, title_en: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Phụ đề / Khuyến mãi (VI)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Giảm 20% cho nhân viên LSP"
                      value={form.subtitle_vi}
                      onChange={e => setForm({ ...form, subtitle_vi: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Nhãn nổi bật (Badge)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Món Mới, Freeship, Hot..."
                      value={form.badge_vi}
                      onChange={e => setForm({ ...form, badge_vi: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Link ảnh Banner (URL)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={form.image_url}
                    onChange={e => setForm({ ...form, image_url: e.target.value })}
                    required
                  />
                  {form.image_url && (
                    <div style={{ marginTop: '8px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                      <img src={form.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Link liên kết khi bấm</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="/menu hoặc /menu/..."
                      value={form.link_url}
                      onChange={e => setForm({ ...form, link_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Thứ tự hiển thị (Sort Order)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.sort_order}
                      onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="bannerActive"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="bannerActive" style={{ fontSize: '14px', fontWeight: 600, color: '#2D3748', cursor: 'pointer' }}>
                    Kích hoạt hiển thị ngay trên trang chủ
                  </label>
                </div>

                <div className="modal-footer" style={{ marginTop: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : (editingBanner ? 'Cập nhật Banner' : 'Tạo Banner')}
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
