/**
 * Design System Export
 * 
 * 디자인 시스템의 모든 요소를 중앙에서 관리하고 export
 */

// Design Tokens
export * from './tokens';
export { tokens, colorMappings, getTokenValue } from './tokens';

// Typography System
export * from './typography';
export { typography, createTextClass as createTypographyClass, textStyleMappings } from './typography';

// Re-export common styles for convenience
export { 
  commonStyles,
  cardStyles,
  buttonStyles,
  textStyles,
  inputStyles,
  layoutStyles,
  animationStyles,
  tableStyles,
  responsive,
  createCardClass,
  createButtonClass,
  createTextClass
} from '../utils/styles';