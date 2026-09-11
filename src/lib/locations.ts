export interface LSPLocation {
  id: string
  name_vi: string
  name_en: string
  area_vi: string
  area_en: string
}

export const LSP_LOCATIONS: LSPLocation[] = [
  { id: 'loc-1',  name_vi: 'LSP - Production Line 1', name_en: 'LSP - Production Line 1', area_vi: 'Tòa nhà chính - Dây chuyền 1', area_en: 'Main Building - Line 1' },
  { id: 'loc-2',  name_vi: 'LSP - Production Line 2', name_en: 'LSP - Production Line 2', area_vi: 'Tòa nhà chính - Dây chuyền 2', area_en: 'Main Building - Line 2' },
  { id: 'loc-3',  name_vi: 'LSP - Production Line 3', name_en: 'LSP - Production Line 3', area_vi: 'Khu C - Khu vực lắp ráp', area_en: 'Block C - Assembly Area' },
  { id: 'loc-4',  name_vi: 'LSP - Warehouse', name_en: 'LSP - Warehouse', area_vi: 'Khu kho vận logistics', area_en: 'Warehouse Area' },
  { id: 'loc-5',  name_vi: 'LSP - QC Department', name_en: 'LSP - QC Department', area_vi: 'Phòng kiểm định chất lượng', area_en: 'Quality Control Lab' },
  { id: 'loc-6',  name_vi: 'LSP - Office', name_en: 'LSP - Office', area_vi: 'Tòa nhà văn phòng trung tâm', area_en: 'Office Building' },
  { id: 'loc-7',  name_vi: 'LSP - Canteen', name_en: 'LSP - Canteen', area_vi: 'Nhà ăn nhân viên', area_en: 'Canteen Area' },
  { id: 'loc-8',  name_vi: 'LSP - Central Control Room (CCR)', name_en: 'LSP - Central Control Room (CCR)', area_vi: 'Phòng điều khiển trung tâm Olefins', area_en: 'Olefins Plant CCR' },
  { id: 'loc-9',  name_vi: 'LSP - Polypropylene (PP) Plant', name_en: 'LSP - Polypropylene (PP) Plant', area_vi: 'Xưởng sản xuất Polypropylene', area_en: 'PP Plant Control Room' },
  { id: 'loc-10', name_vi: 'LSP - HDPE Plant', name_en: 'LSP - HDPE Plant', area_vi: 'Xưởng Polyethylene mật độ cao', area_en: 'High-Density PE Unit' },
  { id: 'loc-11', name_vi: 'LSP - LLDPE Plant', name_en: 'LSP - LLDPE Plant', area_vi: 'Xưởng Polyethylene mạch thẳng', area_en: 'Linear Low-Density PE Unit' },
  { id: 'loc-12', name_vi: 'LSP - Utilities & Offsites (U&O)', name_en: 'LSP - Utilities & Offsites (U&O)', area_vi: 'Khu vực phụ trợ điện & nước', area_en: 'Utilities & Power Center' },
  { id: 'loc-13', name_vi: 'LSP - Tank Farm & Jetty', name_en: 'LSP - Tank Farm & Jetty', area_vi: 'Khu bồn bể & Cảng chuyên dụng', area_en: 'Tank Farm & Harbor Jetty' },
  { id: 'loc-14', name_vi: 'LSP - Maintenance Workshop', name_en: 'LSP - Maintenance Workshop', area_vi: 'Xưởng cơ điện bảo trì trung tâm', area_en: 'Central Workshop' },
  { id: 'loc-15', name_vi: 'LSP - HSE Training Center', name_en: 'LSP - HSE Training Center', area_vi: 'Trung tâm đào tạo An toàn Môi trường', area_en: 'Safety & Health Center' },
  { id: 'loc-16', name_vi: 'LSP - Fire & Emergency Station', name_en: 'LSP - Fire & Emergency Station', area_vi: 'Trạm PCCC & Ứng phó khẩn cấp', area_en: 'Emergency Response Post' },
  { id: 'loc-17', name_vi: 'LSP - Gate 1 Security Post', name_en: 'LSP - Gate 1 Security Post', area_vi: 'Chốt bảo vệ Cổng 1 - Cổng chính', area_en: 'Main Gate 1 Post' },
  { id: 'loc-18', name_vi: 'LSP - Gate 2 Logistics Gate', name_en: 'LSP - Gate 2 Logistics Gate', area_vi: 'Chốt bảo vệ Cổng 2 - Xuất nhập hàng', area_en: 'Logistics Gate 2' },
  { id: 'loc-19', name_vi: 'LSP - Contractor Village Block A', name_en: 'LSP - Contractor Village Block A', area_vi: 'Khu văn phòng nhà thầu Block A', area_en: 'Contractor Area Block A' },
  { id: 'loc-20', name_vi: 'LSP - Medical Health Clinic', name_en: 'LSP - Medical Health Clinic', area_vi: 'Trạm y tế nhà máy', area_en: 'Factory First Aid Station' },
  { id: 'loc-21', name_vi: 'LSP - One Coffee Kiosk', name_en: 'LSP - One Coffee Kiosk', area_vi: 'Quầy One Coffee (Nhận tại quầy)', area_en: 'Pick up at Counter' },
]

export const DEFAULT_LOCATION = LSP_LOCATIONS[0]
