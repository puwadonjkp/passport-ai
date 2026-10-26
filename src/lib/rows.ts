type Row = { id: string }

/** รวมแถวเข้า list โดยไม่ซ้ำ (ใช้ทั้งตอน insert เองและตอนรับ realtime ซึ่งอาจมาก่อนหรือหลังกันก็ได้) */
export function upsertRow<T extends Row>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id)
  if (i === -1) return [...list, row]
  const copy = [...list]
  copy[i] = row
  return copy
}

export function upsertRows<T extends Row>(list: T[], rows: T[]): T[] {
  return rows.reduce(upsertRow, list)
}
