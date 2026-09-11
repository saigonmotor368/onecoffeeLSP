'use client'

import { useState, useMemo } from 'react'
import { LSP_LOCATIONS, type LSPLocation } from '@/lib/locations'
import { useLang } from '@/lib/providers'

interface DeliveryLocationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLocation: string
  onSelect: (locationName: string) => void
}

export default function DeliveryLocationModal({
  isOpen,
  onClose,
  selectedLocation,
  onSelect,
}: DeliveryLocationModalProps) {
  const { lang } = useLang()
  const [search, setSearch] = useState('')
  const [tempSelected, setTempSelected] = useState(selectedLocation)

  const filtered = useMemo(() => {
    if (!search.trim()) return LSP_LOCATIONS
    const q = search.toLowerCase()
    return LSP_LOCATIONS.filter(loc =>
      loc.name_en.toLowerCase().includes(q) ||
      loc.name_vi.toLowerCase().includes(q) ||
      loc.area_en.toLowerCase().includes(q) ||
      loc.area_vi.toLowerCase().includes(q)
    )
  }, [search])

  if (!isOpen) return null

  const handleConfirm = () => {
    onSelect(tempSelected)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white',
        width: '100%',
        maxWidth: '430px',
        maxHeight: '88vh',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Header matching Screen 6 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px', borderBottom: '1px solid #EDF2F7',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: '20px',
              color: '#1A202C', cursor: 'pointer', padding: '4px 8px',
            }}
            aria-label="Close"
          >
            ‹
          </button>
          <h2 style={{
            fontSize: '16px', fontWeight: 700, color: '#1A202C',
            flex: 1, textAlign: 'center', marginRight: '28px',
          }}>
            {lang === 'vi' ? 'Chọn điểm giao hàng (21 vị trí)' : 'Select Delivery Location (21 locations)'}
          </h2>
        </div>

        {/* Search bar */}
        <div style={{ padding: '14px 20px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', background: '#F8F9FA',
            border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 14px',
          }}>
            <span style={{ fontSize: '15px', marginRight: '8px', color: '#A0AEC0' }}>🔍</span>
            <input
              type="text"
              placeholder={lang === 'vi' ? 'Tìm xưởng, vị trí giao nhận...' : 'Search location...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                width: '100%', fontSize: '14px', color: '#2D3748',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: '#A0AEC0', cursor: 'pointer', fontSize: '13px' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Location List */}
        <div style={{
          overflowY: 'auto', flex: 1, padding: '8px 20px',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {filtered.map(loc => {
            const locName = loc.name_en
            const isSelected = tempSelected === locName || tempSelected.includes(loc.id) || tempSelected.startsWith(loc.name_vi)
            const area = lang === 'vi' ? loc.area_vi : loc.area_en

            return (
              <div
                key={loc.id}
                onClick={() => setTempSelected(locName)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: '14px', cursor: 'pointer',
                  border: isSelected ? '1.5px solid #1E4D3B' : '1px solid #EDF2F7',
                  background: isSelected ? '#F4F9F6' : '#FFFFFF',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '18px', color: '#1E4D3B', marginTop: '2px' }}>📍</span>
                  <div>
                    <div style={{
                      fontWeight: 700, fontSize: '14px',
                      color: isSelected ? '#1E4D3B' : '#1A202C',
                    }}>
                      {loc.name_en}
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
                      {area}
                    </div>
                  </div>
                </div>

                {/* Custom radio button matching Screen 6 */}
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  border: isSelected ? '6px solid #1E4D3B' : '2px solid #CBD5E0',
                  background: 'white', flexShrink: 0, marginLeft: '12px',
                  transition: 'all 0.15s ease',
                }} />
              </div>
            )
          })}
        </div>

        {/* Bottom Confirm Button */}
        <div style={{ padding: '16px 20px 24px', borderTop: '1px solid #EDF2F7', background: 'white' }}>
          <button
            onClick={handleConfirm}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: '14px',
              background: '#1E4D3B', color: 'white', border: 'none',
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(30, 77, 59, 0.3)',
            }}
          >
            {lang === 'vi' ? 'Xác nhận điểm giao' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
