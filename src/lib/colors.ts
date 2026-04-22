export const SLOT_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#059669', // Emerald
  '#dc2626', // Red
];

export const getSlotColor = (slotId: string, allSlotIds: string[]) => {
  const index = allSlotIds.indexOf(slotId);
  return SLOT_COLORS[index % SLOT_COLORS.length];
};
