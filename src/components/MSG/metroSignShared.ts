import { BlockData, BlockTheme, createBlock, getDefaultBlockTheme, isThemeStyle } from './configs';

export type MetroSignExportData = {
    version: 1;
    exportedAt: string;
    backgroundColor: string;
    blocks: BlockData[];
};

export const DEFAULT_THEME: BlockTheme = {
    city: 'beijing',
    line: 'bj10',
    color: '#009bc0',
    textColor: '#fff',
};

const STORAGE_KEY = 'metro-sign-data';

const themeGlobals = {
    city: DEFAULT_THEME.city,
    line: DEFAULT_THEME.line,
    color: DEFAULT_THEME.color,
    textColorHex: '#fff' as '#fff' | '#000',
};

let blockCounter = 1;

const LEGACY_STYLE_ALIASES: Record<string, string> = {
    Line: 'Line-space',
    '↗': 'Arrow',
    '↘': 'Arrow',
    '↙': 'Arrow',
    '↖': 'Arrow',
    '→': 'Arrow',
    '←': 'Arrow',
    '↑': 'Arrow',
    '↓': 'Arrow',
};
const LEGACY_ARROW_STYLES = new Set(['↗', '↘', '↙', '↖', '→', '←', '↑', '↓']);

export const normalizeTextColor = (value: unknown): 'black' | 'white' => (value === 'black' ? 'black' : 'white');

export function normalizeLegacyBlockStyle(style: unknown): string {
    if (typeof style !== 'string' || !style) {
        return 'Exit';
    }

    return LEGACY_STYLE_ALIASES[style] || style;
}

export const getThemeFromGlobals = (): BlockTheme => ({
    city: themeGlobals.city || DEFAULT_THEME.city,
    line: themeGlobals.line || DEFAULT_THEME.line,
    color: themeGlobals.color || DEFAULT_THEME.color,
    textColor: themeGlobals.textColorHex === '#000' ? '#000' : '#fff',
});

export const syncThemeGlobals = (theme: BlockTheme) => {
    themeGlobals.city = theme.city;
    themeGlobals.line = theme.line;
    themeGlobals.color = theme.color;
    themeGlobals.textColorHex = theme.textColor === '#fff' ? '#fff' : '#000';
};

export const getNextBlockId = (nextId: number) => {
    const id = Math.max(nextId, ++blockCounter);
    blockCounter = Math.max(blockCounter, id);
    return id;
};

export const getInitialNextId = (blocks: BlockData[]) =>
    Math.max(2, ...blocks.map(block => block.id + 1), blockCounter + 1);

type NormalizeBlocksResult = {
    blocks: BlockData[];
    firstTheme: BlockTheme;
    maxId: number;
};

export function normalizeBlocks(rawBlocks: Partial<BlockData>[]): NormalizeBlocksResult {
    const usedIds = new Set<number>();
    let fallbackId = 1;
    let dragIdCounter = 1;

    const blocks = rawBlocks.map(item => {
        const parsedId = Number(item?.id);
        let id = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : fallbackId;
        while (usedIds.has(id)) id += 1;
        usedIds.add(id);
        blockCounter = Math.max(blockCounter, id);
        fallbackId = Math.max(fallbackId, id + 1);

        const rawStyle = typeof item?.style === 'string' ? item.style : '';
        const style = normalizeLegacyBlockStyle(item?.style);
        const cutLine = Boolean(item?.cutLine);
        const themeFromItem = (item as { theme?: BlockTheme }).theme;

        const normalizedSpecialStyles: Record<string, string> = {};
        const rawSpecialStyles = item?.specialStyles;
        if (rawSpecialStyles && typeof rawSpecialStyles === 'object') {
            Object.entries(rawSpecialStyles).forEach(([rawKey, rawValue]) => {
                const match = rawKey.match(/-(\d+)$/);
                if (!match) return;
                const index = match[1];
                normalizedSpecialStyles[`${id}-${index}`] = String(rawValue ?? '');
            });
        }

        if (LEGACY_ARROW_STYLES.has(rawStyle) && !normalizedSpecialStyles[`${id}-0`]) {
            normalizedSpecialStyles[`${id}-0`] = rawStyle;
        }

        const normalizedTheme = isThemeStyle(style)
            ? (() => {
                  const defaultTheme = getDefaultBlockTheme(style, DEFAULT_THEME) || DEFAULT_THEME;
                  return {
                      city: typeof themeFromItem?.city === 'string' ? themeFromItem.city : defaultTheme.city,
                      line: typeof themeFromItem?.line === 'string' ? themeFromItem.line : defaultTheme.line,
                      color: typeof themeFromItem?.color === 'string' ? themeFromItem.color : defaultTheme.color,
                      textColor:
                          themeFromItem?.textColor === '#000' || themeFromItem?.textColor === '#fff'
                              ? themeFromItem.textColor
                              : defaultTheme.textColor,
                  };
              })()
            : undefined;

        return {
            id,
            style,
            cutLine,
            specialStyles: normalizedSpecialStyles,
            theme: normalizedTheme,
            collapsed: false,
            dragId: dragIdCounter++,
        };
    });

    const firstTheme = blocks.find(block => block.theme)?.theme || DEFAULT_THEME;
    syncThemeGlobals(firstTheme);

    return {
        blocks,
        firstTheme,
        maxId: Math.max(1, ...blocks.map(block => block.id)),
    };
}

export function loadLocalStorage(): BlockData[] {
    try {
        const content = localStorage.getItem(STORAGE_KEY);
        if (!content) {
            return [createBlock(1)];
        }

        const raw: MetroSignExportData = JSON.parse(content);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new Error('JSON格式不正确，必须是对象格式。');
        }
        if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
            throw new Error('JSON格式不正确，缺少有效的 blocks 数组。');
        }

        return normalizeBlocks(raw.blocks).blocks;
    } catch (error) {
        console.error('Failed to load from localStorage：', error);
        alert(`Failed to load from localStorage：${(error as Error).message}`);
        return [createBlock(1)];
    }
}

export function serializeMetroSignData(
    blocks: BlockData[],
    backgroundColor: string,
    fallbackTheme: BlockTheme
): MetroSignExportData {
    const normalizedBlocks = blocks.map(block => {
        const normalizedSpecialStyles: Record<string, string> = {};
        Object.entries(block.specialStyles || {}).forEach(([rawKey, rawValue]) => {
            const match = rawKey.match(/-(\d+)$/);
            if (!match) return;
            const index = match[1];
            normalizedSpecialStyles[`${block.id}-${index}`] = String(rawValue ?? '');
        });

        const normalizedTheme = isThemeStyle(block.style)
            ? (() => {
                  const defaultTheme = getDefaultBlockTheme(block.style, fallbackTheme) || fallbackTheme;
                  return {
                      city: block.theme?.city || defaultTheme.city,
                      line: block.theme?.line || defaultTheme.line,
                      color: block.theme?.color || defaultTheme.color,
                      textColor: block.theme?.textColor || defaultTheme.textColor,
                  };
              })()
            : undefined;

        return {
            ...block,
            dragId: block.id,
            specialStyles: normalizedSpecialStyles,
            theme: normalizedTheme,
        };
    });

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        backgroundColor,
        blocks: normalizedBlocks,
    };
}

export function saveLocalStorage(payload: MetroSignExportData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload, null, 4));
}

export function parseMetroSignImport(content: string) {
    const raw: MetroSignExportData = JSON.parse(content);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('JSON格式不正确，必须是对象格式。');
    }
    if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
        throw new Error('JSON格式不正确，缺少有效的 blocks 数组。');
    }

    return {
        normalized: normalizeBlocks(raw.blocks),
        backgroundColor: typeof raw.backgroundColor === 'string' ? raw.backgroundColor : undefined,
    };
}

export function registerLegacyStyleAlias(fromStyle: string, toStyle: string) {
    if (!fromStyle || !toStyle) return;
    LEGACY_STYLE_ALIASES[fromStyle] = toStyle;
}
