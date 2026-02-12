import React from 'react';
interface BlockTheme {
    city: string;
    line: string;
    color: string;
    textColor: 'black' | 'white';
}
interface BlockData {
    id: number;
    style: string;
    cutLine: boolean;
    specialStyles: Record<string, string>;
    theme?: BlockTheme;
    collapsed: boolean;
    dragId: number;
}
/**
 * 注册导视块类型及其配置
 */
/**
注册一个有theme支持的导视块类型示例：
registerBlock('MyThemeBlock', 256, [
  { type: 'text', label: '...', defaultValue: '...' },
  { type: 'color', label: '...', defaultValue: '#009bc0' },
], (block, xPos) => {
  const color = block.theme?.color ?? '#009bc0';
  return [<rect key={`${block.id}-rect`} x={xPos} y={0} width={256} height={128} fill={color} />];
});

 */
type BlockTypeConfig = {
    style: string;
    width: number;
    config: SpecialStyleConfig[];
    supportsTheme: boolean;
    render: (block: BlockData, xPos: number, blockWidth: number) => React.ReactNode[];
    // 可扩展：渲染方法、SVG生成、默认参数等
};

const blockTypeRegistry: Record<string, BlockTypeConfig> = {};

/**
 * 注册新的导视块类型
 * @param style 样式类型名
 * @param config 特殊样式配置项数组
 */
function registerBlock(
    style: string,
    width: number,
    config: SpecialStyleConfig[],
    render: (block: BlockData, xPos: number, blockWidth: number) => React.ReactNode[]
) {
    const supportsTheme = config.some(item => item.type === 'color');
    blockTypeRegistry[style] = { style, width, config, supportsTheme, render };
    specialStyleConfigs[style] = config;
}

function registerBlockType(style: string, config: SpecialStyleConfig[]) {
    specialStyleConfigs[style] = config;
}

// 将内置类型注册迁移到一个可调用的方法，方便后续按需扩展/按配置加载
export function registerDefaultBlockTypes() {
    const defaultTypes: Array<{ style: string; config: SpecialStyleConfig[] }> = [
        {
            style: 'Exit',
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
        },
        {
            style: 'Line',
            config: [
                { type: 'number', label: 'blocks.styles.specials.line_number', defaultValue: '10' },
                { type: 'color', label: 'blocks.styles.specials.line_color', defaultValue: '#00a3c2' },
            ],
        },
        {
            style: 'Line-space',
            config: [
                { type: 'number', label: 'blocks.styles.specials.line_number', defaultValue: '10' },
                { type: 'color', label: 'blocks.styles.specials.line_color', defaultValue: '#00a3c2' },
            ],
        },
        {
            style: 'ExitText',
            config: [
                { type: 'text', label: 'blocks.styles.specials.exit_letter', defaultValue: 'A', maxLength: 1 },
                { type: 'text', label: 'blocks.styles.specials.exit_lower', defaultValue: '', maxLength: 1 },
                { type: 'text', label: 'blocks.styles.specials.exit_zh', defaultValue: '蓝靛厂南路' },
                { type: 'text', label: 'blocks.styles.specials.exit_en', defaultValue: 'Landianchang South Rd.' },
            ],
        },
        {
            style: 'To',
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
        },
    ];

    for (const def of defaultTypes) {
        registerBlockType(def.style, def.config);
    }

    registerBlock('Exit', 128, specialStyleConfigs.Exit, (block, xPos) => {
        const elems: React.ReactNode[] = [];
        const exit_align = block.specialStyles[`${block.id}-0`] || 'C';
        if (exit_align === 'L') {
            elems.push(
                <rect key={`${block.id}-rect`} x={xPos} y={0} width={98} height={128} fill="#00aa52" />,
                <text
                    key={`${block.id}-text1`}
                    x={xPos + 10}
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
                    x={xPos + 10}
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
        if (exit_align === 'C') {
            elems.push(
                <rect key={`${block.id}-rect`} x={xPos + 15} y={0} width={98} height={128} fill="#00aa52" />,
                <text
                    key={`${block.id}-text1`}
                    x={xPos + 25}
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
                    x={xPos + 25}
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
        if (exit_align === 'R') {
            elems.push(
                <rect key={`${block.id}-rect`} x={xPos + 30} y={0} width={98} height={128} fill="#00aa52" />,
                <text
                    key={`${block.id}-text1`}
                    x={xPos + 40}
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
                    x={xPos + 40}
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
    });

    registerBlock('Line', 256, specialStyleConfigs.Line, (block, xPos) => {
        const elems: React.ReactNode[] = [];
        const lineNum = block.specialStyles[`${block.id}-0`] || '10';
        const lineColor = getBlockThemeColor(block);
        elems.push(
            <rect key={`${block.id}-rect`} x={xPos} y={90} width={256} height={38} fill={lineColor} />,
            <text
                key={`${block.id}-text1`}
                x={xPos}
                y={85}
                fontFamily="Arial"
                fontSize={90}
                fill="white"
                fontWeight={500}
            >
                {lineNum}
            </text>,
            <text
                key={`${block.id}-text2`}
                x={xPos + 256}
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
                x={xPos + 256}
                y={55}
                fontFamily="Noto Sans SC"
                fontSize={45}
                fill="white"
                fontWeight={500}
                textAnchor="end"
            >
                号线
            </text>
        );
        return elems;
    });

    registerBlock('Line-space', 256, specialStyleConfigs['Line-space'], (block, xPos) => {
        const elems: React.ReactNode[] = [];
        const lineNum2 = block.specialStyles[`${block.id}-0`] || '10';
        const lineColor = getBlockThemeColor(block);
        elems.push(
            <rect key={`${block.id}-rect`} x={xPos + 20} y={90} width={216} height={38} fill={lineColor} />,
            <text
                key={`${block.id}-text1`}
                x={xPos + 20}
                y={85}
                fontFamily="Arial"
                fontSize={90}
                fill="white"
                fontWeight={500}
            >
                {lineNum2}
            </text>,
            <text
                key={`${block.id}-text2`}
                x={xPos + 236}
                y={85}
                fontFamily="Arial"
                fontSize={25}
                fill="white"
                fontWeight={500}
                textAnchor="end"
            >
                {`Line ${lineNum2}`}
            </text>,
            <text
                key={`${block.id}-text3`}
                x={xPos + 236}
                y={55}
                fontFamily="Noto Sans SC"
                fontSize={45}
                fill="white"
                fontWeight={500}
                textAnchor="end"
            >
                号线
            </text>
        );
        return elems;
    });

    registerBlock('ExitText', 256, specialStyleConfigs.ExitText, (block, xPos) => {
        const elems: React.ReactNode[] = [];
        const exitLetter = block.specialStyles[`${block.id}-0`] || 'A';
        const exitSubscript = block.specialStyles[`${block.id}-1`] || '';
        const exitChinese = block.specialStyles[`${block.id}-2`] || '蓝靛厂南路';
        const exitEnglish = block.specialStyles[`${block.id}-3`] || 'Landianchang South Rd.';
        elems.push(
            <text
                key={`${block.id}-text1`}
                x={exitSubscript ? xPos + 20 : xPos + 32}
                y={105}
                fontFamily="Arail"
                fontSize={120}
                fill="white"
            >
                {exitLetter}
            </text>,
            <text key={`${block.id}-text2`} x={xPos + 98} y={107} fontFamily="Arial" fontSize={40} fill="white">
                {exitSubscript}
            </text>,
            <text key={`${block.id}-text3`} x={xPos + 130} y={60} fontFamily="Noto Sans SC" fontSize={50} fill="white">
                {exitChinese}
            </text>,
            <text key={`${block.id}-text4`} x={xPos + 130} y={103} fontFamily="Arial" fontSize={30} fill="white">
                {exitEnglish}
            </text>
        );
        return elems;
    });

    registerBlock('To', 256 + 128, specialStyleConfigs.To, (block, xPos, blockWidth) => {
        const elems: React.ReactNode[] = [];
        const toChinese = block.specialStyles[`${block.id}-0`] || '';
        const toEnglish = block.specialStyles[`${block.id}-1`] || '';
        const align = block.specialStyles[`${block.id}-2`] || 'R';
        const lineType = block.specialStyles[`${block.id}-3`] || 'NM';
        let prefixChinese = '';
        let prefixEnglish = 'To';
        if (lineType === 'LOOP') {
            prefixChinese = '下一站';
        } else if (lineType === 'T') {
            prefixChinese = '终点站';
            prefixEnglish = 'Terminus';
        } else {
            prefixChinese = '开往 ';
        }
        const centerX = xPos + blockWidth / 2;
        const rightX = xPos + blockWidth - 10;
        const leftX = xPos + 10;

        if (prefixChinese || toChinese) {
            if (lineType === 'T') {
                elems.push(
                    <text
                        key={`${block.id}-text1`}
                        x={align === 'R' ? rightX : align === 'C' ? centerX : leftX}
                        y={63}
                        fontFamily="Noto Sans SC"
                        fontSize={45}
                        fill="white"
                        textAnchor={align === 'R' ? 'end' : align === 'C' ? 'middle' : 'start'}
                    >
                        {prefixChinese}
                    </text>
                );
            } else {
                elems.push(
                    <text
                        key={`${block.id}-text1`}
                        x={align === 'R' ? rightX : align === 'C' ? centerX : leftX}
                        y={63}
                        fontFamily="Noto Sans SC"
                        fontSize={45}
                        fill="white"
                        textAnchor={align === 'R' ? 'end' : align === 'C' ? 'middle' : 'start'}
                    >
                        {prefixChinese}
                        <tspan fontWeight={600}> {toChinese}</tspan>
                    </text>
                );
            }
        }

        if (prefixEnglish || toEnglish) {
            if (lineType === 'T') {
                elems.push(
                    <text
                        key={`${block.id}-text2`}
                        x={align === 'R' ? rightX : align === 'C' ? centerX : leftX}
                        y={103}
                        fontFamily="Arial"
                        fontSize={30}
                        fill="white"
                        textAnchor={align === 'R' ? 'end' : align === 'C' ? 'middle' : 'start'}
                    >
                        {prefixEnglish}
                    </text>
                );
            } else {
                elems.push(
                    <text
                        key={`${block.id}-text2`}
                        x={align === 'R' ? rightX : align === 'C' ? centerX : leftX}
                        y={103}
                        fontFamily="Arial"
                        fontSize={30}
                        fill="white"
                        textAnchor={align === 'R' ? 'end' : align === 'C' ? 'middle' : 'start'}
                    >
                        {prefixEnglish}
                        <tspan fontWeight={560}> {toEnglish}</tspan>
                    </text>
                );
            }
        }
        return elems;
    });

    registerBlock('toilet', 128, [], (block, xPos) => [
        <image key={`${block.id}-toilet-icon`} href="logos/toilet.svg" x={xPos} y={0} width={128} height={128} />,
    ]);

    registerBlock('blank1', 128, [], () => []);
    registerBlock('blank2', 256, [], () => []);

    for (const arrow of ['↗', '↙', '↖', '↘', '→', '←', '↑', '↓']) {
        registerBlock(arrow, 128, [], (block, xPos) => {
            const mapping = arrowMap[block.style];
            if (!mapping) return [];
            const { href, rotation } = mapping;
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
        });
    }
}

// （保留原有注册接口）
export { registerBlock, registerBlockType, blockTypeRegistry };

/**
 * 特殊样式配置项接口
 */
interface SpecialStyleConfig {
    type: 'number' | 'text' | 'radio' | 'color';
    label: string;
    defaultValue: string;
    options?: { value: string; label: string }[];
    maxLength?: number;
}

const DEFAULT_BLOCK_STYLE = 'Exit';
const DEFAULT_THEME_COLOR = '#009bc0';

function getBlockThemeColor(block: BlockData): string {
    const themeColor = block.theme?.color;
    if (themeColor) return themeColor;
    return block.specialStyles[`${block.id}-1`] || DEFAULT_THEME_COLOR;
}

function createBlock(id: number, style: string = DEFAULT_BLOCK_STYLE): BlockData {
    return {
        id,
        style,
        cutLine: false,
        specialStyles: {},
        collapsed: false,
        dragId: id,
    };
}

function hasSpecialStyleConfig(style: string): boolean {
    return Boolean(specialStyleConfigs[style]);
}

function isThemeStyle(style: string): boolean {
    return Boolean(blockTypeRegistry[style]?.supportsTheme);
}

function getBlockWidth(style: string): number {
    return blockTypeRegistry[style]?.width ?? 128;
}

type StyleGroup = {
    titleKey: string;
    styles: string[];
};

const styleGroups: StyleGroup[] = [
    {
        titleKey: 'blocks.styles.single_block',
        styles: ['Exit', '↗', '↙', '↖', '↘', '→', '←', '↑', '↓', 'toilet', 'blank1'],
    },
    {
        titleKey: 'blocks.styles.two_block',
        styles: ['Line', 'Line-space', 'blank2'],
    },
    {
        titleKey: 'blocks.styles.three_blocks',
        styles: ['To', 'ExitText'],
    },
];

function getStyleLabel(style: string, t: (key: string) => string): string {
    switch (style) {
        case 'Exit':
            return t('blocks.styles.exit_logo');
        case 'toilet':
            return t('blocks.styles.toilet');
        case 'blank1':
        case 'blank2':
            return t('blocks.styles.blank');
        case 'Line':
            return t('blocks.styles.line');
        case 'Line-space':
            return t('blocks.styles.line_space');
        case 'To':
            return t('blocks.styles.terminal_text');
        case 'ExitText':
            return t('blocks.styles.exit_text');
        default:
            return style;
    }
}

/**
 * 特殊样式配置映射表（保留原有数据）
 */
const specialStyleConfigs: Record<string, SpecialStyleConfig[]> = {
    // 出口Logo块（EXIT/出）配置
    Exit: [
        {
            type: 'radio',
            label: 'blocks.styles.specials.text_align', // 文本对齐方式
            defaultValue: 'C',
            options: [
                { value: 'R', label: 'blocks.styles.specials.align_right' }, // 右对齐
                { value: 'L', label: 'blocks.styles.specials.align_left' }, // 左对齐
                { value: 'C', label: 'blocks.styles.specials.align_center' }, // 居中对齐
            ],
        },
    ],
    // 线路块配置
    Line: [
        { type: 'number', label: 'blocks.styles.specials.line_number', defaultValue: '10' }, // 线路号
        { type: 'color', label: 'blocks.styles.specials.line_color', defaultValue: '#00a3c2' }, // 线路颜色
    ],
    // 带间距线路块配置（布局不同，参数同Line）
    'Line-space': [
        { type: 'number', label: 'blocks.styles.specials.line_number', defaultValue: '10' },
        { type: 'color', label: 'blocks.styles.specials.line_color', defaultValue: '#00a3c2' },
    ],
    // 出口文本块（如：A口 蓝靛厂南路）配置
    ExitText: [
        { type: 'text', label: 'blocks.styles.specials.exit_letter', defaultValue: 'A', maxLength: 1 }, // 出口字母（A/B/C）
        { type: 'text', label: 'blocks.styles.specials.exit_lower', defaultValue: '', maxLength: 1 }, // 出口下标（如A1的1）
        { type: 'text', label: 'blocks.styles.specials.exit_zh', defaultValue: '蓝靛厂南路' }, // 出口中文名称
        { type: 'text', label: 'blocks.styles.specials.exit_en', defaultValue: 'Landianchang South Rd.' }, // 出口英文名称
    ],
    // 终点站文本块（开往/终点站 宛平城）配置
    To: [
        { type: 'text', label: 'blocks.styles.specials.terminal_zh', defaultValue: '宛平城' }, // 终点站中文
        { type: 'text', label: 'blocks.styles.specials.terminal_en', defaultValue: 'Wanpingcheng' }, // 终点站英文
        {
            type: 'radio',
            label: 'blocks.styles.specials.text_align', // 文本对齐方式
            defaultValue: 'R',
            options: [
                { value: 'R', label: 'blocks.styles.specials.align_right' },
                { value: 'L', label: 'blocks.styles.specials.align_left' },
                { value: 'C', label: 'blocks.styles.specials.align_center' }, // 居中对齐
            ],
        },
        {
            type: 'radio',
            label: 'blocks.styles.specials.line_type', // 线路类型
            defaultValue: 'NM',
            options: [
                { value: 'NM', label: 'blocks.styles.specials.normal_line' }, // 普通线路（开往）
                { value: 'LOOP', label: 'blocks.styles.specials.loop_line' }, // 环线（下一站）
                { value: 'T', label: 'blocks.styles.specials.terminal_station' }, // 终点站
            ],
        },
    ],
};

const arrowMap: Record<string, { href: string; rotation: number }> = {
    '↗': { href: 'logos/arrow-45.svg', rotation: 270 },
    '↙': { href: 'logos/arrow-45.svg', rotation: 90 },
    '↖': { href: 'logos/arrow-45.svg', rotation: 180 },
    '↘': { href: 'logos/arrow-45.svg', rotation: 0 },
    '→': { href: 'logos/arrow.svg', rotation: 0 },
    '←': { href: 'logos/arrow.svg', rotation: 180 },
    '↑': { href: 'logos/arrow.svg', rotation: 270 },
    '↓': { href: 'logos/arrow.svg', rotation: 90 },
};

/**
 * 将单块的 SVG 渲染逻辑集中到这里
 * @param block 单个块数据
 * @param xPos 块起始 x 坐标
 * @param blockWidth 块宽度（像素）
 * @returns React.ReactNode[]：该块对应的 SVG 元素列表
 */
export function renderBlockSVG(block: BlockData, xPos: number, blockWidth: number): React.ReactNode[] {
    // 在每次渲染块时保存当前状态到本地存储，确保数据持久化
    const config = blockTypeRegistry[block.style];

    if (!config) {
        console.warn(`[Block] 未注册的 block 类型: ${block.style}`);
        return [];
    }

    return config.render(block, xPos, blockWidth);
}

export type { BlockData, SpecialStyleConfig, BlockTheme };
export {
    specialStyleConfigs,
    arrowMap,
    styleGroups,
    getStyleLabel,
    DEFAULT_BLOCK_STYLE,
    createBlock,
    hasSpecialStyleConfig,
    isThemeStyle,
    getBlockWidth,
};
