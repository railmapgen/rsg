import React from 'react';
import { getStringWidth } from './utils/utils';

interface BlockTheme {
    city: string;
    line: string;
    color: string;
    textColor: '#000' | '#fff';
}

type ColorDefaultValue = string | Partial<BlockTheme>;
type LinePaletteMetadata = {
    lineNumber?: string;
    lineNameZh?: string;
    lineNameEn?: string;
};

interface BlockData {
    id: number;
    style: string;
    cutLine: boolean;
    specialStyles: Record<string, string>;
    theme?: BlockTheme;
    collapsed: boolean;
    dragId: number;
}

interface SpecialStyleConfig {
    key?: string;
    type: 'number' | 'text' | 'radio' | 'color';
    label: string;
    defaultValue: string | ColorDefaultValue;
    options?: { value: string; label: string }[];
    maxLength?: number;
}

type StyleGroup = {
    titleKey: string;
    styles: string[];
};

type StyleSystemId = 'beijing-subway-new' | 'beijing-subway-old';
type StyleSystemOption = {
    id: StyleSystemId;
    labelKey: string;
};

type BlockTypeConfig = {
    style: string;
    width: number | ((block: BlockData) => number);
    config: SpecialStyleConfig[];
    supportsTheme: boolean;
    styleSystems: StyleSystemId[];
    labelKey?: string;
    groupTitleKey?: string;
    syncSpecialStylesWithTheme?: (params: {
        blockId: number;
        theme: BlockTheme;
        previousSpecialStyles: Record<string, string>;
    }) => Record<string, string>;
    render: (block: BlockData, xPos: number, blockWidth: number) => React.ReactNode[];
};

type RegisterBlockInput = {
    style: string;
    width: number | ((block: BlockData) => number);
    config?: SpecialStyleConfig[];
    labelKey?: string;
    groupTitleKey?: StyleGroup['titleKey'];
    supportsTheme?: boolean;
    styleSystems?: StyleSystemId[];
    supportsManualWidth?: boolean;
    supportsBlockCenter?: boolean;
    syncSpecialStylesWithTheme?: (params: {
        blockId: number;
        theme: BlockTheme;
        previousSpecialStyles: Record<string, string>;
    }) => Record<string, string>;
    render: (block: BlockData, xPos: number, blockWidth: number) => React.ReactNode[];
};

const DEFAULT_BLOCK_STYLE = 'Exit';
const DEFAULT_THEME_COLOR = '#009bc0';
const DEFAULT_THEME: BlockTheme = {
    city: 'beijing',
    line: 'bj10',
    color: DEFAULT_THEME_COLOR,
    textColor: '#fff',
};
const GROUP_SINGLE = 'blocks.styles.basic_elements';
const GROUP_ARROW = 'blocks.styles.arrow_elements';
const GROUP_TWO = 'blocks.styles.line_elements';
const GROUP_THREE = 'blocks.styles.text_elements';
const STYLE_SYSTEM_NEW: StyleSystemId = 'beijing-subway-new';
const STYLE_SYSTEM_OLD: StyleSystemId = 'beijing-subway-old';
const TEXT_MIN_WIDTH = 128;
const TO_BLOCK_MIN_WIDTH = 384;
const MANUAL_WIDTH_CONFIG_KEY = 'manual_width';
const BLOCK_ALIGN_CONFIG_KEY = 'block_align';
const linePaletteRegistry: Record<string, LinePaletteMetadata> = {};
const styleSystemRegistry: Record<string, StyleSystemId[]> = {};
const styleSystemOptions: StyleSystemOption[] = [
    { id: STYLE_SYSTEM_NEW, labelKey: 'blocks.styles.systems.beijing_subway_new' },
    { id: STYLE_SYSTEM_OLD, labelKey: 'blocks.styles.systems.beijing_subway_old' },
];
const MANUAL_WIDTH_CONFIG: SpecialStyleConfig = {
    key: MANUAL_WIDTH_CONFIG_KEY,
    type: 'number',
    label: 'blocks.styles.specials.manual_width',
    defaultValue: '',
};
const BLOCK_ALIGN_CONFIG: SpecialStyleConfig = {
    key: BLOCK_ALIGN_CONFIG_KEY,
    type: 'radio',
    label: 'blocks.styles.specials.block_align',
    defaultValue: 'false',
};

const roundBlockWidth = (value: number, minWidth: number) => Math.max(minWidth, Math.ceil(value));
const getLinePaletteKey = (city: string, line: string) => `${city}::${line}`;

function registerLinePaletteMetadata(city: string, line: string, metadata: LinePaletteMetadata) {
    if (!city || !line) {
        return;
    }

    linePaletteRegistry[getLinePaletteKey(city, line)] = metadata;
}

function getLinePaletteMetadata(theme: BlockTheme): LinePaletteMetadata | undefined {
    return linePaletteRegistry[getLinePaletteKey(theme.city, theme.line)];
}

function getLineSpaceWidth(block: BlockData): number {
    const lineNum = block.specialStyles[`${block.id}-0`] || '10';
    const lineNumberWidth = getStringWidth(lineNum, 'Arial', 90, 'letter-spacing: -10px;');
    const lineEnglishWidth = getStringWidth(`Line ${lineNum}`, 'Arial', 25);
    const lineChineseWidth = getStringWidth('号线', 'Noto Sans SC Medium', 45);
    const rightLabelWidth = Math.max(lineEnglishWidth, lineChineseWidth);
    return roundBlockWidth(20 + lineNumberWidth + 3 + rightLabelWidth + 20, 0);
}

function getLineTextWidth(block: BlockData): number {
    const lineZh = block.specialStyles[`${block.id}-0`] || '西郊线';
    const lineEn = block.specialStyles[`${block.id}-1`] || 'Xijiao Line';
    const lineEnWidth = getStringWidth(lineEn, 'Arial', 25);
    const lineChWidth = getStringWidth(lineZh, 'Noto Sans SC Medium', 45);
    const rightLabelWidth = Math.max(lineEnWidth, lineChWidth);
    return roundBlockWidth(20 + rightLabelWidth + 20, 0);
}

function getTextWidth(block: BlockData): number {
    const textChinese = block.specialStyles[`${block.id}-0`] || '北京西站';
    const textEnglish = block.specialStyles[`${block.id}-1`] || 'Beijing West Railway Station';
    const contentWidth = Math.max(
        getStringWidth(textChinese, 'Noto Sans SC', 50),
        getStringWidth(textEnglish, 'Arial', 30)
    );
    return roundBlockWidth(contentWidth + 20, TEXT_MIN_WIDTH);
}

function getToBlockWidth(block: BlockData): number {
    const toChinese = block.specialStyles[`${block.id}-0`] || '';
    const toEnglish = block.specialStyles[`${block.id}-1`] || '';
    const lineType = block.specialStyles[`${block.id}-3`] || 'NM';

    let prefixChinese = '开往 ';
    let prefixEnglish = 'To';
    if (lineType === 'LOOP') {
        prefixChinese = '下一站 ';
        prefixEnglish = 'Next Station ';
    } else if (lineType === 'T') {
        prefixChinese = '终点站';
        prefixEnglish = 'Terminus';
    }

    const chineseText = lineType === 'T' ? prefixChinese : `${prefixChinese}${toChinese}`.trim();
    const englishText = lineType === 'T' ? prefixEnglish : `${prefixEnglish} ${toEnglish}`.trim();
    const contentWidth = Math.max(
        getStringWidth(chineseText, 'Noto Sans SC', 45),
        getStringWidth(englishText, 'Arial', 30)
    );
    return roundBlockWidth(contentWidth + 20, TO_BLOCK_MIN_WIDTH);
}

const blockTypeRegistry: Record<string, BlockTypeConfig> = {};
const specialStyleConfigs: Record<string, SpecialStyleConfig[]> = {};
const styleLabelRegistry: Record<string, string> = {};
const styleGroups: StyleGroup[] = [
    { titleKey: GROUP_SINGLE, styles: [] },
    { titleKey: GROUP_ARROW, styles: [] },
    { titleKey: GROUP_TWO, styles: [] },
    { titleKey: GROUP_THREE, styles: [] },
];

function resetBlockRegistries() {
    Object.keys(blockTypeRegistry).forEach(key => delete blockTypeRegistry[key]);
    Object.keys(specialStyleConfigs).forEach(key => delete specialStyleConfigs[key]);
    Object.keys(styleLabelRegistry).forEach(key => delete styleLabelRegistry[key]);
    Object.keys(linePaletteRegistry).forEach(key => delete linePaletteRegistry[key]);
    Object.keys(styleSystemRegistry).forEach(key => delete styleSystemRegistry[key]);
    styleGroups.forEach(group => {
        group.styles.splice(0, group.styles.length);
    });
}

function registerBlock({
    style,
    width,
    config = [],
    labelKey,
    groupTitleKey,
    supportsTheme,
    styleSystems = [STYLE_SYSTEM_NEW],
    supportsManualWidth = false,
    supportsBlockCenter = true,
    syncSpecialStylesWithTheme,
    render,
}: RegisterBlockInput) {
    const resolvedConfig = [...config];
    if (supportsManualWidth) {
        resolvedConfig.push({ ...MANUAL_WIDTH_CONFIG });
    }
    if (supportsBlockCenter) {
        resolvedConfig.push({ ...BLOCK_ALIGN_CONFIG });
    }

    const resolvedSupportsTheme = supportsTheme ?? resolvedConfig.some(item => item.type === 'color');

    blockTypeRegistry[style] = {
        style,
        width,
        config: resolvedConfig,
        supportsTheme: resolvedSupportsTheme,
        styleSystems,
        labelKey,
        groupTitleKey,
        syncSpecialStylesWithTheme,
        render,
    };

    specialStyleConfigs[style] = resolvedConfig;
    styleSystemRegistry[style] = styleSystems;

    if (labelKey) {
        styleLabelRegistry[style] = labelKey;
    }

    if (groupTitleKey) {
        const group = styleGroups.find(item => item.titleKey === groupTitleKey);
        if (group && !group.styles.includes(style)) {
            group.styles.push(style);
        }
    }
}

function registerBlockType(style: string, config: SpecialStyleConfig[]) {
    specialStyleConfigs[style] = config;
}

function normalizeThemeDefaultValue(
    defaultValue: string | ColorDefaultValue,
    fallbackTheme: BlockTheme = DEFAULT_THEME
): BlockTheme {
    if (typeof defaultValue === 'string') {
        return {
            ...fallbackTheme,
            color: defaultValue || fallbackTheme.color,
        };
    }

    return {
        city: typeof defaultValue.city === 'string' ? defaultValue.city : fallbackTheme.city,
        line: typeof defaultValue.line === 'string' ? defaultValue.line : fallbackTheme.line,
        color: typeof defaultValue.color === 'string' ? defaultValue.color : fallbackTheme.color,
        textColor:
            defaultValue.textColor === '#000'
                ? '#000'
                : defaultValue.textColor === '#fff'
                  ? '#fff'
                  : fallbackTheme.textColor,
    };
}

function getSpecialStyleDefaultValue(config: SpecialStyleConfig): string {
    if (typeof config.defaultValue === 'string') {
        return config.defaultValue;
    }

    if (config.type === 'color') {
        return typeof config.defaultValue.color === 'string' ? config.defaultValue.color : DEFAULT_THEME.color;
    }

    return '';
}

function getSpecialStyleIndexByKey(style: string, key: string): number {
    return (specialStyleConfigs[style] || []).findIndex(config => config.key === key);
}

function hasSpecialStyleKey(style: string, key: string): boolean {
    return getSpecialStyleIndexByKey(style, key) >= 0;
}

function getBlockSpecialStyleStorageKey(block: BlockData, key: string): string | null {
    const index = getSpecialStyleIndexByKey(block.style, key);
    if (index < 0) {
        return null;
    }

    return `${block.id}-${index}`;
}

function getSpecialStyleValueByKey(block: BlockData, key: string, fallback = ''): string {
    const index = getSpecialStyleIndexByKey(block.style, key);
    if (index < 0) {
        return fallback;
    }

    const currentKey = `${block.id}-${index}`;
    const legacyKey = `${block.dragId}-${index}`;
    if (Object.prototype.hasOwnProperty.call(block.specialStyles, currentKey)) {
        return block.specialStyles[currentKey];
    }
    if (Object.prototype.hasOwnProperty.call(block.specialStyles, legacyKey)) {
        return block.specialStyles[legacyKey];
    }
    return fallback;
}

function getThemeConfig(style: string) {
    const configs = specialStyleConfigs[style] || [];
    const index = configs.findIndex(config => config.type === 'color');
    if (index < 0) {
        return null;
    }

    return {
        index,
        config: configs[index],
    };
}

function getDefaultBlockTheme(style: string, fallbackTheme: BlockTheme = DEFAULT_THEME): BlockTheme | undefined {
    if (!isThemeStyle(style)) {
        return undefined;
    }

    const themeConfig = getThemeConfig(style);
    if (!themeConfig) {
        return fallbackTheme;
    }

    return normalizeThemeDefaultValue(themeConfig.config.defaultValue, fallbackTheme);
}

function getBlockThemeColor(block: BlockData): string {
    return block.theme?.color || getDefaultBlockTheme(block.style)?.color || DEFAULT_THEME_COLOR;
}

function getStyleSystemsForStyle(style: string): StyleSystemId[] {
    return styleSystemRegistry[style] || [STYLE_SYSTEM_NEW];
}

function isStyleAvailableInSystem(style: string, styleSystem: StyleSystemId): boolean {
    return getStyleSystemsForStyle(style).includes(styleSystem);
}

function getThemeSyncedSpecialStyles(
    style: string,
    blockId: number,
    theme: BlockTheme,
    previousSpecialStyles: Record<string, string>
): Record<string, string> {
    const syncHandler = blockTypeRegistry[style]?.syncSpecialStylesWithTheme;
    if (!syncHandler) {
        return previousSpecialStyles;
    }

    return {
        ...previousSpecialStyles,
        ...syncHandler({
            blockId,
            theme,
            previousSpecialStyles,
        }),
    };
}

function getBaseBlockWidth(blockOrStyle: BlockData | string): number {
    const style = typeof blockOrStyle === 'string' ? blockOrStyle : blockOrStyle.style;
    const config = blockTypeRegistry[style];
    if (!config) return 128;
    return typeof config.width === 'function'
        ? config.width(typeof blockOrStyle === 'string' ? createBlock(0, style) : blockOrStyle)
        : config.width;
}

function isBlockCentered(block: BlockData): boolean {
    const blockAlign = getSpecialStyleValueByKey(block, BLOCK_ALIGN_CONFIG_KEY, 'false');
    return blockAlign === 'true' || blockAlign === 'center';
}

function getBlockRenderX(block: BlockData, xPos: number, blockWidth: number, svgWidth: number): number {
    if (!isBlockCentered(block)) {
        return xPos;
    }

    return Math.max(0, (svgWidth - blockWidth) / 2);
}

function createBlock(
    id: number,
    style: string = DEFAULT_BLOCK_STYLE,
    fallbackTheme: BlockTheme = DEFAULT_THEME
): BlockData {
    const config = specialStyleConfigs[style] || [];
    const specialStyles = config.reduce<Record<string, string>>((acc, item, index) => {
        if (item.type !== 'color') {
            acc[`${id}-${index}`] = getSpecialStyleDefaultValue(item);
        }
        return acc;
    }, {});

    return {
        id,
        style,
        cutLine: false,
        specialStyles,
        theme: getDefaultBlockTheme(style, fallbackTheme),
        collapsed: false,
        dragId: id,
    };
}

function hasSpecialStyleConfig(style: string): boolean {
    return Boolean(specialStyleConfigs[style]?.length);
}

function isThemeStyle(style: string): boolean {
    return Boolean(blockTypeRegistry[style]?.supportsTheme);
}

function getBlockWidth(blockOrStyle: BlockData | string): number {
    const baseWidth = getBaseBlockWidth(blockOrStyle);
    if (typeof blockOrStyle === 'string') {
        return baseWidth;
    }

    const manualWidthValue = Number(getSpecialStyleValueByKey(blockOrStyle, MANUAL_WIDTH_CONFIG_KEY, ''));
    if (!Number.isFinite(manualWidthValue) || manualWidthValue <= 0) {
        return baseWidth;
    }

    return Math.max(baseWidth, manualWidthValue);
}

function getStyleLabel(style: string, t: (key: string) => string): string {
    const labelKey = styleLabelRegistry[style];
    return labelKey ? t(labelKey) : style;
}

type ArrowDirection = '↗' | '↘' | '↙' | '↖' | '→' | '←' | '↑' | '↓';
type ArrowGraphic = {
    href: string;
    rotation: number;
};

const DEFAULT_ARROW_DIRECTION: ArrowDirection = '→';
const ARROW_DIRECTION_OPTIONS: { value: ArrowDirection; label: string }[] = [
    { value: '↗', label: 'blocks.styles.specials.arrow_up_right' },
    { value: '→', label: 'blocks.styles.specials.arrow_right' },
    { value: '↘', label: 'blocks.styles.specials.arrow_down_right' },
    { value: '↓', label: 'blocks.styles.specials.arrow_down' },
    { value: '↙', label: 'blocks.styles.specials.arrow_down_left' },
    { value: '←', label: 'blocks.styles.specials.arrow_left' },
    { value: '↖', label: 'blocks.styles.specials.arrow_up_left' },
    { value: '↑', label: 'blocks.styles.specials.arrow_up' },
];
const DEFAULT_ARROW_GRAPHICS: Record<ArrowDirection, ArrowGraphic> = {
    '↗': { href: 'logos/arrow-45.svg', rotation: 270 },
    '↘': { href: 'logos/arrow-45.svg', rotation: 0 },
    '↙': { href: 'logos/arrow-45.svg', rotation: 90 },
    '↖': { href: 'logos/arrow-45.svg', rotation: 180 },
    '→': { href: 'logos/arrow.svg', rotation: 0 },
    '←': { href: 'logos/arrow.svg', rotation: 180 },
    '↑': { href: 'logos/arrow.svg', rotation: 270 },
    '↓': { href: 'logos/arrow.svg', rotation: 90 },
};

function getArrowGraphic(direction: string): ArrowGraphic {
    return (
        DEFAULT_ARROW_GRAPHICS[(direction as ArrowDirection) || DEFAULT_ARROW_DIRECTION] ||
        DEFAULT_ARROW_GRAPHICS[DEFAULT_ARROW_DIRECTION]
    );
}

export function registerDefaultBlockTypes() {
    resetBlockRegistries();
    registerLinePaletteMetadata('beijing', 'bj10', {
        lineNumber: '10',
        lineNameZh: '10号线',
        lineNameEn: 'Line 10',
    });
    registerLinePaletteMetadata('beijing', 'xijiao', {
        lineNameZh: '西郊线',
        lineNameEn: 'Xijiao Line',
    });

    registerBlock({
        style: 'Exit',
        width: 128,
        groupTitleKey: GROUP_SINGLE,
        labelKey: 'blocks.styles.exit_logo',
        config: [
            {
                type: 'radio',
                label: 'blocks.styles.specials.text_align',
                defaultValue: 'C',
                options: [
                    { value: 'R', label: 'blocks.styles.specials.align_right' },
                    { value: 'L', label: 'blocks.styles.specials.align_left' },
                    { value: 'C', label: 'blocks.styles.specials.align_center' },
                ],
            },
        ],
        render: (block, xPos, blockWidth) => {
            const elems: React.ReactNode[] = [];
            const exitAlign = block.specialStyles[`${block.id}-0`] || 'C';
            const rectX =
                exitAlign === 'L'
                    ? xPos
                    : exitAlign === 'C'
                      ? xPos + Math.max(0, (blockWidth - 98) / 2)
                      : xPos + Math.max(0, blockWidth - 98);
            const textX = rectX + 10;

            if (exitAlign === 'L') {
                elems.push(
                    <rect key={`${block.id}-rect`} x={rectX} y={0} width={98} height={128} fill="#00aa52" />,
                    <text
                        key={`${block.id}-text1`}
                        x={textX}
                        y={120}
                        fontFamily="Arial"
                        fontSize={35}
                        fill="white"
                        fontWeight={500}
                    >
                        EXIT
                    </text>,
                    <text
                        key={`${block.id}-text2`}
                        x={textX}
                        y={80}
                        fontFamily="Noto Sans SC"
                        fontSize={80}
                        fill="white"
                        fontWeight={500}
                    >
                        出
                    </text>
                );
            }

            if (exitAlign === 'C') {
                elems.push(
                    <rect key={`${block.id}-rect`} x={rectX} y={0} width={98} height={128} fill="#00aa52" />,
                    <text
                        key={`${block.id}-text1`}
                        x={textX}
                        y={120}
                        fontFamily="Arial"
                        fontSize={35}
                        fill="white"
                        fontWeight={500}
                    >
                        EXIT
                    </text>,
                    <text
                        key={`${block.id}-text2`}
                        x={textX}
                        y={80}
                        fontFamily="Noto Sans SC"
                        fontSize={80}
                        fill="white"
                        fontWeight={500}
                    >
                        出
                    </text>
                );
            }

            if (exitAlign === 'R') {
                elems.push(
                    <rect key={`${block.id}-rect`} x={rectX} y={0} width={98} height={128} fill="#00aa52" />,
                    <text
                        key={`${block.id}-text1`}
                        x={textX}
                        y={120}
                        fontFamily="Arial"
                        fontSize={35}
                        fill="white"
                        fontWeight={500}
                    >
                        EXIT
                    </text>,
                    <text
                        key={`${block.id}-text2`}
                        x={textX}
                        y={80}
                        fontFamily="Noto Sans SC"
                        fontSize={80}
                        fill="white"
                        fontWeight={500}
                    >
                        出
                    </text>
                );
            }

            return elems;
        },
    });

    registerBlock({
        style: 'Line-space',
        width: getLineSpaceWidth,
        groupTitleKey: GROUP_TWO,
        labelKey: 'blocks.styles.line_space',
        syncSpecialStylesWithTheme: ({ blockId, theme, previousSpecialStyles }) => {
            const lineMetadata = getLinePaletteMetadata(theme);
            if (!lineMetadata?.lineNumber) {
                return previousSpecialStyles;
            }

            return {
                ...previousSpecialStyles,
                [`${blockId}-0`]: lineMetadata.lineNumber,
            };
        },
        config: [
            { type: 'number', label: 'blocks.styles.specials.line_number', defaultValue: '10' },
            {
                type: 'color',
                label: 'blocks.styles.specials.line_color',
                defaultValue: {
                    city: 'beijing',
                    line: 'bj10',
                    color: '#00a3c2',
                    textColor: '#fff',
                },
            },
        ],
        render: (block, xPos, blockWidth) => {
            const lineNum = block.specialStyles[`${block.id}-0`] || '10';
            const lineColor = getBlockThemeColor(block);
            const rightEdge = xPos + blockWidth - 20;
            return [
                <rect
                    key={`${block.id}-rect`}
                    x={xPos + 20}
                    y={90}
                    width={blockWidth - 40}
                    height={38}
                    fill={lineColor}
                />,
                <text
                    key={`${block.id}-text1`}
                    x={xPos + 20}
                    y={85}
                    fontFamily="Arial"
                    fontSize={90}
                    fill="white"
                    fontWeight={500}
                    transform={`translate(${xPos + 20}, ${85}) scale(0.8, 1) translate(${-(xPos + 20)}, ${-85})`}
                    textAnchor="start"
                >
                    {lineNum}
                </text>,
                <text
                    key={`${block.id}-text2`}
                    x={rightEdge}
                    y={85}
                    fontFamily="Arial"
                    fontSize={25}
                    fill="white"
                    fontWeight={500}
                    textAnchor="end"
                >
                    {`Line ${lineNum}`}
                </text>,
                <text
                    key={`${block.id}-text3`}
                    x={rightEdge}
                    y={55}
                    fontFamily="Noto Sans SC Medium"
                    fontSize={45}
                    fill="white"
                    fontWeight={500}
                    textAnchor="end"
                >
                    号线
                </text>,
            ];
        },
    });

    registerBlock({
        style: 'Line-text',
        width: getLineTextWidth,
        groupTitleKey: GROUP_TWO,
        labelKey: 'blocks.styles.line_text',
        syncSpecialStylesWithTheme: ({ blockId, theme, previousSpecialStyles }) => {
            const lineMetadata = getLinePaletteMetadata(theme);
            if (!lineMetadata) {
                return previousSpecialStyles;
            }

            return {
                ...previousSpecialStyles,
                ...(lineMetadata.lineNameZh ? { [`${blockId}-0`]: lineMetadata.lineNameZh } : {}),
                ...(lineMetadata.lineNameEn ? { [`${blockId}-1`]: lineMetadata.lineNameEn } : {}),
            };
        },
        config: [
            { type: 'text', label: 'blocks.styles.specials.line_text_zh', defaultValue: '西郊线' },
            { type: 'text', label: 'blocks.styles.specials.line_text_en', defaultValue: 'Xijiao Line' },
            {
                type: 'color',
                label: 'blocks.styles.specials.line_color',
                defaultValue: {
                    city: 'beijing',
                    line: 'xijiao',
                    color: '#ba0f1e',
                    textColor: '#fff',
                },
            },
        ],
        render: (block, xPos) => {
            const lineNameZh = block.specialStyles[`${block.id}-0`] || '西郊线';
            const lineNameEn = block.specialStyles[`${block.id}-1`] || 'Xijiao Line';
            const lineColor = getBlockThemeColor(block);
            const lineTextWidth = Math.max(
                getStringWidth(lineNameZh, 'Noto Sans SC', '45px'),
                getStringWidth(lineNameEn, 'Arial', '25px')
            );
            return [
                <rect
                    key={`${block.id}-rect`}
                    x={xPos + 20}
                    y={90}
                    width={lineTextWidth}
                    height={38}
                    fill={lineColor}
                />,
                <text
                    key={`${block.id}-text2`}
                    x={lineTextWidth / 2.0 + xPos + 21}
                    y={83}
                    fontFamily="Arial"
                    fontSize={25}
                    fill="white"
                    fontWeight={500}
                    textAnchor="middle"
                >
                    {lineNameEn}
                </text>,
                <text
                    key={`${block.id}-text1`}
                    x={lineTextWidth / 2.0 + xPos + 22}
                    y={57}
                    fontFamily="Noto Sans SC Medium"
                    fontSize={45}
                    fill="white"
                    fontWeight={500}
                    textAnchor="middle"
                >
                    {lineNameZh}
                </text>,
            ];
        },
    });

    registerBlock({
        style: 'ExitText',
        width: 128,
        groupTitleKey: GROUP_THREE,
        labelKey: 'blocks.styles.exit_text',
        supportsManualWidth: true,
        config: [
            { type: 'text', label: 'blocks.styles.specials.exit_letter', defaultValue: 'A', maxLength: 1 },
            { type: 'text', label: 'blocks.styles.specials.exit_lower', defaultValue: '', maxLength: 1 },
        ],
        render: (block, xPos) => {
            const exitLetter = block.specialStyles[`${block.id}-0`] || 'A';
            const exitSubscript = block.specialStyles[`${block.id}-1`] || '';

            return [
                <text
                    key={`${block.id}-text1`}
                    x={exitSubscript ? xPos + 3 : xPos + 22}
                    y={105}
                    fontFamily="Arial"
                    fontSize={110}
                    fill="white"
                    style={{ fontWeight: 'bold' }}
                >
                    {exitLetter}
                </text>,
                <text
                    key={`${block.id}-text2`}
                    x={xPos + 80}
                    y={107}
                    fontFamily="Arial"
                    fontSize={80}
                    fill="white"
                    style={{ fontWeight: 'bold' }}
                >
                    {exitSubscript}
                </text>,
            ];
        },
    });

    registerBlock({
        style: 'To',
        width: getToBlockWidth,
        groupTitleKey: GROUP_THREE,
        labelKey: 'blocks.styles.terminal_text',
        styleSystems: [STYLE_SYSTEM_NEW, STYLE_SYSTEM_OLD],
        supportsManualWidth: true,
        config: [
            { type: 'text', label: 'blocks.styles.specials.terminal_zh', defaultValue: '宛平城' },
            { type: 'text', label: 'blocks.styles.specials.terminal_en', defaultValue: 'Wanpingcheng' },
            {
                type: 'radio',
                label: 'blocks.styles.specials.text_align',
                defaultValue: 'R',
                options: [
                    { value: 'R', label: 'blocks.styles.specials.align_right' },
                    { value: 'L', label: 'blocks.styles.specials.align_left' },
                    { value: 'C', label: 'blocks.styles.specials.align_center' },
                ],
            },
            {
                type: 'radio',
                label: 'blocks.styles.specials.line_type',
                defaultValue: 'NM',
                options: [
                    { value: 'NM', label: 'blocks.styles.specials.normal_line' },
                    { value: 'LOOP', label: 'blocks.styles.specials.loop_line' },
                    { value: 'T', label: 'blocks.styles.specials.terminal_station' },
                ],
            },
        ],
        render: (block, xPos, blockWidth) => {
            const toChinese = block.specialStyles[`${block.id}-0`] || '';
            const toEnglish = block.specialStyles[`${block.id}-1`] || '';
            const align = block.specialStyles[`${block.id}-2`] || 'R';
            const lineType = block.specialStyles[`${block.id}-3`] || 'NM';

            const centerX = xPos + blockWidth / 2;
            const rightX = xPos + blockWidth - 10;
            const leftX = xPos + 10;
            const textAnchor = align === 'R' ? 'end' : align === 'C' ? 'middle' : 'start';
            const x = align === 'R' ? rightX : align === 'C' ? centerX : leftX;

            let prefixChinese = '开往 ';
            let prefixEnglish = 'To';

            if (lineType === 'LOOP') {
                prefixChinese = '下一站 ';
                prefixEnglish = 'Next Station ';
            } else if (lineType === 'T') {
                prefixChinese = '终点站';
                prefixEnglish = 'Terminus';
            }

            const nodes: React.ReactNode[] = [];

            if (prefixChinese || toChinese) {
                nodes.push(
                    <text
                        key={`${block.id}-text1`}
                        x={x}
                        y={63}
                        fontFamily="Noto Sans SC"
                        fontSize={45}
                        fill="white"
                        textAnchor={textAnchor}
                    >
                        {lineType === 'T' ? (
                            prefixChinese
                        ) : (
                            <>
                                {prefixChinese}
                                <tspan fontWeight={600}> {toChinese}</tspan>
                            </>
                        )}
                    </text>
                );
            }

            if (prefixEnglish || toEnglish) {
                nodes.push(
                    <text
                        key={`${block.id}-text2`}
                        x={x}
                        y={103}
                        fontFamily="Arial"
                        fontSize={30}
                        fill="white"
                        textAnchor={textAnchor}
                    >
                        {lineType === 'T' ? (
                            prefixEnglish
                        ) : (
                            <>
                                {prefixEnglish}
                                <tspan fontWeight={560}> {toEnglish}</tspan>
                            </>
                        )}
                    </text>
                );
            }

            return nodes;
        },
    });

    registerBlock({
        style: 'toilet',
        width: 128,
        groupTitleKey: GROUP_SINGLE,
        labelKey: 'blocks.styles.toilet',
        render: (block, xPos) => [
            <image key={`${block.id}-toilet-icon`} href="logos/toilet.svg" x={xPos} y={0} width={128} height={128} />,
        ],
    });

    registerBlock({
        style: 'blank1',
        width: 128,
        groupTitleKey: GROUP_SINGLE,
        labelKey: 'blocks.styles.blank',
        render: () => [],
    });

    registerBlock({
        style: 'Arrow',
        width: 128,
        groupTitleKey: GROUP_ARROW,
        labelKey: 'blocks.styles.arrow',
        config: [
            {
                type: 'radio',
                label: 'blocks.styles.specials.arrow_direction',
                defaultValue: DEFAULT_ARROW_DIRECTION,
                options: ARROW_DIRECTION_OPTIONS,
            },
        ],
        render: (block, xPos) => {
            const direction = block.specialStyles[`${block.id}-0`] || DEFAULT_ARROW_DIRECTION;
            const { href, rotation } = getArrowGraphic(direction);
            return [
                <image
                    key={`${block.id}-image`}
                    href={href}
                    x={xPos + 15}
                    y={15}
                    width={100}
                    height={100}
                    transform={`rotate(${rotation} ${xPos + 64} 64)`}
                />,
            ];
        },
    });

    registerBlock({
        style: 'Split',
        width: 12,
        groupTitleKey: GROUP_ARROW,
        labelKey: 'blocks.styles.split',
        config: [],
        render: (block, xPos) => {
            return [
                <circle cx={xPos} cy="64" r="6" stroke="#fff" strokeWidth="2" fill="#fff" key={`${block.id}-split`} />,
            ];
        },
    });

    registerBlock({
        style: 'Text',
        width: getTextWidth,
        groupTitleKey: GROUP_THREE,
        labelKey: 'blocks.styles.text',
        styleSystems: [STYLE_SYSTEM_NEW, STYLE_SYSTEM_OLD],
        config: [
            { type: 'text', label: 'blocks.styles.specials.zh', defaultValue: '北京西站' },
            { type: 'text', label: 'blocks.styles.specials.en', defaultValue: 'Beijing West Railway Station' },
            {
                type: 'radio',
                label: 'blocks.styles.specials.text_align',
                defaultValue: 'R',
                options: [
                    { value: 'R', label: 'blocks.styles.specials.align_right' },
                    { value: 'L', label: 'blocks.styles.specials.align_left' },
                    { value: 'C', label: 'blocks.styles.specials.align_center' },
                ],
            },
            {
                type: 'radio',
                label: 'blocks.styles.specials.line_type',
                defaultValue: 'NM',
                options: [
                    { value: 'NM', label: 'blocks.styles.specials.normal_line' },
                    { value: 'LOOP', label: 'blocks.styles.specials.loop_line' },
                    { value: 'T', label: 'blocks.styles.specials.terminal_station' },
                ],
            },
        ],
        render: (block, xPos, blockWidth) => {
            const Chinese = block.specialStyles[`${block.id}-0`] || '北京西站';
            const English = block.specialStyles[`${block.id}-1`] || 'Beijing West Railway Station';
            const align = block.specialStyles[`${block.id}-2`] || 'R';
            const textAnchor = align === 'R' ? 'end' : align === 'C' ? 'middle' : 'start';
            const centerX = xPos + blockWidth / 2;
            const rightX = xPos + blockWidth - 10;
            const leftX = xPos + 10;
            const x = align === 'R' ? rightX : align === 'C' ? centerX : leftX;

            return [
                <text
                    key={`${block.id}-text3`}
                    x={x}
                    y={60}
                    fontFamily="Noto Sans SC"
                    fontSize={50}
                    fill="white"
                    textAnchor={textAnchor}
                >
                    {Chinese}
                </text>,
                <text
                    key={`${block.id}-text4`}
                    x={x}
                    y={103}
                    fontFamily="Arial"
                    fontSize={30}
                    fill="white"
                    textAnchor={textAnchor}
                >
                    {English}
                </text>,
            ];
        },
    });
}

export function renderBlockSVG(block: BlockData, xPos: number, blockWidth: number): React.ReactNode[] {
    const config = blockTypeRegistry[block.style];

    if (!config) {
        console.warn(`[Block] Unregistered block style: ${block.style}`);
        return [];
    }

    return config.render(block, xPos, blockWidth);
}

export type { BlockData, SpecialStyleConfig, BlockTheme };
export { registerBlock, registerBlockType, blockTypeRegistry };
export {
    specialStyleConfigs,
    styleGroups,
    getStyleLabel,
    getSpecialStyleDefaultValue,
    getDefaultBlockTheme,
    getThemeSyncedSpecialStyles,
    registerLinePaletteMetadata,
    getSpecialStyleIndexByKey,
    hasSpecialStyleKey,
    getBlockSpecialStyleStorageKey,
    getSpecialStyleValueByKey,
    getBaseBlockWidth,
    getBlockRenderX,
    isBlockCentered,
    MANUAL_WIDTH_CONFIG_KEY,
    BLOCK_ALIGN_CONFIG_KEY,
    DEFAULT_BLOCK_STYLE,
    styleSystemOptions,
    getStyleSystemsForStyle,
    isStyleAvailableInSystem,
    createBlock,
    hasSpecialStyleConfig,
    isThemeStyle,
    getBlockWidth,
};
