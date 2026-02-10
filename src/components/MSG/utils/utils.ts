// utils.ts
import { getBlockWidth as getBlockWidthFromConfigs } from '../configs';

export const getBlockWidth = (style: string): number => getBlockWidthFromConfigs(style);
