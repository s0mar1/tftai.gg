// frontend/src/constants.ts
export const ItemTypes = {
  UNIT: 'unit',
  PLACED_UNIT: 'placed_unit',
  ITEM: 'item',
} as const;

export type ItemType = typeof ItemTypes[keyof typeof ItemTypes];
