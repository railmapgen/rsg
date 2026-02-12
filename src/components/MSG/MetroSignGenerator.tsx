// 导入拖拽上下文和定位算法（dnd-kit）
// 导入React核心依赖：useState(状态管理)、useRef(获取DOM/持久化变量)
import React, { useState, useRef, useCallback } from 'react';
// 导入国际化翻译钩子，支持多语言切换（react-i18next）
// 导入组件专属样式文件
import './MetroSignGenerator.css';
import {
    BlockData,
    BlockTheme,
    specialStyleConfigs,
    renderBlockSVG,
    registerDefaultBlockTypes,
    styleGroups,
    getStyleLabel,
    createBlock,
    hasSpecialStyleConfig,
    isThemeStyle,
} from './configs';
import { useTranslation } from 'react-i18next';
import Card, { DeleteZone } from './drag';

/**
 * 工具函数：根据导视块样式计算像素宽度
 * 地铁导视牌采用"标准格"设计：1标准格=128px，不同样式占用不同格数
 * @param style 导视块样式类型
 * @returns 该样式对应的像素宽度
 */
import { getBlockWidth } from './utils/utils';
import { JSX } from 'react/jsx-runtime';
import { Button, Input } from '@mantine/core';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { PaletteIframe, PaletteModalHelper, Theme } from '../utils/PaletteModalHelper';
import rmgRuntime from '@railmapgen/rmg-runtime';
export type MetroSignExportData = {
    version: 1;
    exportedAt: string;
    backgroundColor: string;
    blocks: BlockData[];
};

/**
 * 核心组件：地铁导视牌生成器
 * 功能说明：
 * 1. 可视化配置多个导视块（添加/删除/折叠/样式切换）
 * 2. 自定义导视块参数（对齐方式、线路号、文本内容、颜色等）
 * 3. 实时SVG预览导视牌效果
 * 4. 导出预览结果为PNG图片
 * 5. 支持多语言切换（基于react-i18n）
 */
export let cityGlobal: string = 'beijing';
export let lineGlobal: string = 'bj10';
export let themeGlobal: string = '#009bc0';
export let colorGlobal: string = '#fff';
export const normalizeTextColor = (value: unknown): 'black' | 'white' => (value === 'black' ? 'black' : 'white');
export let blockNum: number = 1;
/**
 * 从 localStorage 加载导视块数据
 * 如果没有数据或解析失败，则返回一个默认块
 */
export function loadLocalStorage(): BlockData[] {
    try {
        const content = localStorage.getItem('metro-sign-data');
        if (!content) {
            // localStorage没有数据，返回默认1个出口块
            return [createBlock(1)];
        }

        const raw: MetroSignExportData = JSON.parse(content);

        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new Error('JSON格式不正确，必须是对象格式。');
        }
        if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
            throw new Error('JSON格式不正确，缺少有效的 blocks 数组。');
        }

        const usedIds = new Set<number>();
        let fallbackId = 1;
        let dragIdCounter = 1;

        const normalizedBlocks: BlockData[] = raw.blocks.map((item: Partial<BlockData>) => {
            const parsedId = Number(item?.id);
            let id = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : fallbackId;
            while (usedIds.has(id)) id += 1;
            usedIds.add(id);
            blockNum = Math.max(blockNum, id);
            fallbackId = Math.max(fallbackId, id + 1);

            const style = typeof item?.style === 'string' && item.style ? item.style : 'Exit';
            const cutLine = Boolean(item?.cutLine);
            const themeFromItem = (item as { theme?: BlockTheme }).theme;

            // 解析特殊样式
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

            const normalizedTheme = isThemeStyle(style)
                ? {
                      city: typeof themeFromItem?.city === 'string' ? themeFromItem.city : DEFAULT_THEME.city,
                      line: typeof themeFromItem?.line === 'string' ? themeFromItem.line : DEFAULT_THEME.line,
                      color: typeof themeFromItem?.color === 'string' ? themeFromItem.color : DEFAULT_THEME.color,
                      textColor: normalizeTextColor(themeFromItem?.textColor),
                  }
                : undefined;

            if (normalizedTheme) {
                normalizedSpecialStyles[`${id}-1`] = normalizedTheme.color;
            }

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

        // 更新全局主题变量
        const firstThemeBlock = normalizedBlocks.find(block => block.theme)?.theme || DEFAULT_THEME;
        cityGlobal = firstThemeBlock.city;
        lineGlobal = firstThemeBlock.line;
        themeGlobal = firstThemeBlock.color;
        colorGlobal = firstThemeBlock.textColor === 'white' ? '#fff' : '#000';

        return normalizedBlocks;
    } catch (error) {
        console.error('Failed to load from localStorage：', error);
        alert(`Failed to load from localStorage：${(error as Error).message}`);
        // 返回默认块，保证不报错
        return [createBlock(1)];
    }
}

export const DEFAULT_THEME: BlockTheme = {
    city: 'beijing',
    line: 'bj10',
    color: '#009bc0',
    textColor: 'white',
};
const MetroSignGenerator: React.FC = () => {
    // 1. 控制弹窗显示/隐藏x
    const [isOpen, setIsOpen] = useState(false);
    const [activeThemeBlockId, setActiveThemeBlockId] = useState<number | null>(null);
    // 2. 存储最终确认的颜色（内部确定按钮触发）
    const [, setConfirmedColor] = useState<Theme | null>([
        DEFAULT_THEME.city,
        DEFAULT_THEME.line,
        DEFAULT_THEME.color,
        DEFAULT_THEME.textColor,
    ]);
    // 3. 通信助手实例（useRef 保证唯一，支持多次复用）
    const paletteHelper = useRef(new PaletteModalHelper());

    const getThemeFromGlobals = (): BlockTheme => ({
        city: cityGlobal || DEFAULT_THEME.city,
        line: lineGlobal || DEFAULT_THEME.line,
        color: themeGlobal || DEFAULT_THEME.color,
        textColor: colorGlobal === '#000' ? 'black' : 'white',
    });

    const toThemeTuple = (theme: BlockTheme): Theme => [theme.city, theme.line, theme.color, theme.textColor];
    const updateBlockTheme = (id: number, theme: BlockTheme) => {
        setBlocks(prevBlocks =>
            prevBlocks.map(block => {
                if (block.id !== id) return block;
                return {
                    ...block,
                    theme,
                    specialStyles: {
                        ...block.specialStyles,
                        [`${id}-1`]: theme.color,
                    },
                };
            })
        );
    };

    // 打开弹窗：初始化通信 + 发送默认颜色
    const handleOpen = (blockId: number, initialTheme: BlockTheme) => {
        setActiveThemeBlockId(blockId);
        setConfirmedColor(toThemeTuple(initialTheme));
        setIsOpen(true);

        // 初始化通信，监听调色板内部事件
        paletteHelper.current.init({
            onSelect: paletteTheme => {
                const nextTheme: BlockTheme = {
                    city: String(paletteTheme[0]),
                    line: String(paletteTheme[1]),
                    color: String(paletteTheme[2]),
                    textColor: paletteTheme[3] === 'black' ? 'black' : 'white',
                };
                setConfirmedColor(toThemeTuple(nextTheme));
                updateBlockTheme(blockId, nextTheme);
                cityGlobal = nextTheme.city;
                lineGlobal = nextTheme.line;
                themeGlobal = nextTheme.color;
                colorGlobal = nextTheme.textColor === 'white' ? '#fff' : '#000';
                setIsOpen(false);
                setActiveThemeBlockId(null);
                paletteHelper.current.destroy();
            },
            onClose: () => {
                // 调色板内点击确定/叉叉：关闭弹窗 + 销毁通信
                setIsOpen(false);
                setActiveThemeBlockId(null);
                paletteHelper.current.destroy();
            },
        });
        paletteHelper.current.sendDefaultTheme(toThemeTuple(initialTheme));
        // 发送默认颜色到调色板（每次打开都触发）
    };

    const { t } = useTranslation();
    // 国际化翻译钩子，t函数用于获取对应语言的文本
    // ===== 核心状态管理 =====
    // 导视块列表（初始默认1个出口logo块）
    const [blocks, setBlocks] = useState<BlockData[]>(loadLocalStorage());
    // 下一个新增导视块的ID（自增，避免重复）
    const [nextId, setNextId] = useState(2);
    // SVG预览区域的DOM引用（用于导出PNG时获取SVG内容）
    const svgRef = useRef<SVGSVGElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // 导视牌背景色（默认深蓝色：#041c31，地铁导视常用配色）
    const [backgroundColor, setBackgroundColor] = useState('#041c31');

    // ❗ 潜在问题：普通变量而非React状态，赋值后不会触发组件重渲染
    // 意图：存储当前选中导视块的特殊配置内容，但此写法无效
    let specials_contect = (
        <>
            <p></p>
        </>
    );

    /**
     * 添加新的导视块
     * 新块默认样式为Exit，初始状态为折叠，ID自增
     */
    const addBlock = () => {
        // 不可变更新数组（React状态更新规范）
        setBlocks([...blocks, createBlock(Math.max(nextId, ++blockNum))]);
        setNextId(nextId + 1);
    };

    /**
     * 删除指定ID的导视块
     * 限制：至少保留1个导视块，防止空列表
     * @param id 要删除的导视块ID
     */
    const removeBlock = (id: number) => {
        if (blocks.length <= 1) return;
        setBlocks(blocks.filter(block => block.id !== id));
    };
    const moveCard = useCallback(
        (fromIndex: number, toIndex: number) => {
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length || toIndex >= blocks.length) {
                return;
            }
            setBlocks(prevBlocks => {
                const newBlockList = [...prevBlocks];
                const [movedBlock] = newBlockList.splice(fromIndex, 1);
                newBlockList.splice(toIndex, 0, movedBlock);
                return newBlockList;
            });
        },
        [blocks.length]
    ); // 仅依赖长度，减少重渲染

    /**
     * 切换指定导视块的折叠/展开状态
     * @param id 导视块ID
     */
    const toggleCollapse = (id: number) => {
        setBlocks(
            blocks.map(block => {
                if (block.id === id) {
                    // 目标ID：切换折叠状态（取反）
                    return { ...block, collapsed: !block.collapsed };
                } else {
                    // 非目标ID：强制设为false（折叠）
                    return { ...block, collapsed: false };
                }
            })
        );
    };

    /**
     * 更新导视块的样式类型
     * 切换样式时重置特殊样式配置（避免参数不匹配）
     * @param id 导视块ID
     * @param style 新的样式类型
     */
    const updateBlockStyle = (id: number, style: string) => {
        setBlocks(
            blocks.map(block =>
                block.id === id
                    ? {
                          ...block,
                          style,
                          // 若新样式有特殊配置则清空原有配置，否则保留
                          specialStyles: hasSpecialStyleConfig(style) ? {} : block.specialStyles,
                          theme: isThemeStyle(style) ? block.theme || getThemeFromGlobals() : undefined,
                      }
                    : block
            )
        );
    };

    /**
     * 更新导视块是否显示黄色分割线
     * @param id 导视块ID
     * @param cutLine 是否显示分割线
     */
    const updateBlockCutLine = (id: number, cutLine: boolean) => {
        setBlocks(blocks.map(block => (block.id === id ? { ...block, cutLine } : block)));
    };

    /**
     * 更新导视块的特殊样式参数
     * @param id 导视块ID
     * @param key 参数唯一标识（格式：${block.id}-${index}）
     * @param value 参数值
     */
    const updateSpecialStyle = (id: number, key: string, value: string) => {
        setBlocks(
            blocks.map(block =>
                block.id === id ? { ...block, specialStyles: { ...block.specialStyles, [key]: value } } : block
            )
        );
    };

    /**
     * 渲染指定导视块的特殊样式输入控件
     * 根据specialStyleConfigs动态生成文本/数字/单选框
     * @param block 导视块数据
     * @returns 配置项输入控件列表
     */
    const renderSpecialInputs = (block: BlockData) => {
        // 获取当前样式对应的配置项，无则返回空数组
        const configs = specialStyleConfigs[block.style] || [];

        return configs.map((config, index) => {
            // 生成参数唯一key（避免React列表渲染警告）
            const key = `${block.id}-${index}`;
            const legacyKey = `${block.dragId}-${index}`;
            // 获取当前参数值，无则为空
            const value = block.specialStyles[key] || block.specialStyles[legacyKey] || '';

            // 文本输入框
            if (config.type === 'text') {
                return (
                    <div key={key} className="special-input">
                        <label>{t(config.label)}:</label>
                        <Input
                            type="text"
                            value={value}
                            placeholder={config.defaultValue} // 默认值提示
                            maxLength={config.maxLength}
                            onChange={e => updateSpecialStyle(block.id, key, e.target.value)}
                        />
                    </div>
                );
            }

            // 数字输入框
            if (config.type === 'number') {
                return (
                    <div key={key} className="special-input">
                        <label>{t(config.label)}:</label>
                        <Input
                            type="number"
                            value={value}
                            placeholder={config.defaultValue}
                            onChange={e => updateSpecialStyle(block.id, key, e.target.value)}
                        />
                    </div>
                );
            }

            // 单选框组
            if (config.type === 'radio' && config.options) {
                return (
                    <div key={key} className="special-input">
                        <label>{t(config.label)}:</label>
                        <div className="radio-group">
                            {config.options.map(option => (
                                <label key={option.value}>
                                    <input
                                        type="radio"
                                        name={`${key}-radio`} // 单选框组名（保证同组互斥）
                                        value={option.value}
                                        checked={value === option.value}
                                        onChange={() => updateSpecialStyle(block.id, key, option.value)}
                                    />
                                    {t(option.label)}
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }

            if (config.type === 'color') {
                const blockTheme = block.theme || getThemeFromGlobals();
                return (
                    <React.Fragment key={key}>
                        <Button
                            onClick={() => handleOpen(block.id, blockTheme)}
                            style={{
                                backgroundColor: blockTheme.color,
                                color: blockTheme.textColor,
                                border: 'none',
                            }}
                        >
                            ●
                        </Button>
                    </React.Fragment>
                );
            }

            return null;
        });
    };

    /**
     * 渲染单个导视块的配置面板
     * 包含：折叠按钮、删除按钮、样式切换、分割线开关、特殊样式配置
     * 问题：specials_contect是普通变量，赋值后不会触发组件重渲染，导致配置内容不更新
     * @param block 导视块数据
     * @returns 单个导视块的配置面板JSX
     */
    const renderBlock = (block: BlockData, index: number) => {
        // 若块处于展开状态，赋值特殊配置内容（此逻辑无效，因变量非状态）
        if (block.collapsed) {
            specials_contect = (
                <>
                    {/* 分割线开关配置区 */}
                    <div className="section">
                        <label>{t('blocks.cutline')}</label>
                        <div className="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    name={`cutLine-${block.id}`}
                                    checked={!block.cutLine}
                                    onChange={() => updateBlockCutLine(block.id, false)}
                                />
                                {t('useful.no')}
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name={`cutLine-${block.id}`}
                                    checked={block.cutLine}
                                    onChange={() => updateBlockCutLine(block.id, true)}
                                />
                                {t('useful.yes')}
                            </label>
                        </div>
                    </div>

                    {/* 样式选择区：按格数分类（1格/2格/3格） */}
                    <div className="section">
                        <label>{t('blocks.styles.style')}</label>
                        <div className="style-group">
                            {styleGroups.map(group => (
                                <React.Fragment key={group.titleKey}>
                                    <h4>{t(group.titleKey)}：</h4>
                                    <div className="radio-grid">
                                        {group.styles.map(style => (
                                            <label key={style} className="style-option">
                                                <input
                                                    type="radio"
                                                    name={`style-${block.id}`}
                                                    value={style}
                                                    checked={block.style === style}
                                                    onChange={() => updateBlockStyle(block.id, style)}
                                                />
                                                {getStyleLabel(style, t)}
                                            </label>
                                        ))}
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* 渲染特殊样式配置（仅当前样式有配置项时显示） */}
                    {hasSpecialStyleConfig(block.style) && (
                        <div className="section special-styles">
                            <label>{t('blocks.styles.special')}</label>
                            {renderSpecialInputs(block)}
                        </div>
                    )}
                </>
            );
        }

        let divcolor = '#d3d3d3';
        if (block.collapsed) {
            divcolor = '#009bc0';
        }

        // 导视块配置面板主结构
        return (
            <Card key={block.dragId} data={block} index={index} moveCard={moveCard}>
                <Button
                    className="block-config"
                    style={{
                        backgroundColor: divcolor,
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#333',
                    }}
                    onClick={() => toggleCollapse(block.id)}
                >
                    {t('styleToText.' + block.style)}
                </Button>
            </Card>
        );
    };

    /**
     * SVG预览子组件
     * 核心逻辑：
     * 1. 计算每个导视块的X坐标（累加宽度）
     * 2. 根据样式渲染对应的SVG元素（矩形、文本、图片、箭头等）
     * 3. 渲染分割线（若开启）
     */
    const SvgPreview = () => {
        saveLocalStorage();
        // 计算所有导视块的累计宽度（用于确定SVG总宽度）
        const blockPositions = blocks.reduce((positions, block, index) => {
            const prevPosition = positions[index - 1] || 0;
            const blockWidth = getBlockWidth(block.style);
            return [...positions, prevPosition + blockWidth];
        }, [] as number[]);

        // SVG总宽度（所有块宽度之和）
        const svgWidth = blockPositions[blockPositions.length - 1] || 0;
        // 位置累加器：记录当前块的起始X坐标
        let currentX = 0;

        // 遍历所有导视块，生成对应的SVG元素
        const svgElements = blocks.flatMap(block => {
            const blockElements: JSX.Element[] = [];
            const blockWidth = getBlockWidth(block.style);
            const xPos = currentX;
            currentX += blockWidth;

            // 使用 configs 中的渲染器
            const elems = renderBlockSVG(block, xPos, blockWidth);
            blockElements.push(...(elems as JSX.Element[]));

            // 渲染黄色分割线（若开启）
            if (block.cutLine) {
                blockElements.push(
                    <rect
                        key={`${block.id}-cutline`}
                        x={xPos + blockWidth - 2.5} // 分割线位置：块的最右侧
                        y={10}
                        width={5}
                        height={108}
                        fill="#fff017"
                    />
                );
            }

            return blockElements;
        });

        // 返回SVG容器（实时预览导视牌）
        return (
            <svg
                ref={svgRef}
                width={svgWidth}
                height={128}
                viewBox={`0 0 ${svgWidth} 128`}
                xmlns="http://www.w3.org/2000/svg"
                style={{ backgroundColor }}
            >
                {svgElements}
            </svg>
        );
    };

    /**
     * 导出SVG预览为PNG图片
     * 核心流程：
     * 1. 将SVG序列化为XML字符串 → 转换为Base64编码
     * 2. 绘制到Canvas（处理背景色、外部图片、旋转）
     * 3. 下载Canvas内容为PNG文件
     */
    const downloadPNG = async () => {
        if (!svgRef.current) return; // 无SVG引用则退出

        const svg = svgRef.current;
        // 序列化SVG为XML字符串
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return; // 无Canvas上下文则退出

        // 设置Canvas尺寸为SVG实际尺寸
        canvas.width = svg.width.baseVal.value;
        canvas.height = svg.height.baseVal.value;

        // 填充背景色（解决SVG背景透明问题）
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 创建SVG图片对象
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

        // 等待SVG图片加载完成
        await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // 出错也继续，避免卡死
        });

        // 将SVG绘制到Canvas
        ctx.drawImage(img, 0, 0);

        // 处理SVG中的外部图片（如箭头、卫生间图标）
        const images = svg.querySelectorAll('image');
        let imagesToLoad = images.length;

        // 无外部图片，直接下载
        if (imagesToLoad === 0) {
            downloadCanvas(canvas);
            return;
        }

        // 加载并绘制所有外部图片（处理旋转）
        for (const imgElement of images) {
            const imgSrc = imgElement.getAttribute('href') || '';
            const imgTag = new Image();
            imgTag.crossOrigin = 'Anonymous'; // 解决跨域加载问题

            await new Promise(resolve => {
                imgTag.onload = resolve;
                imgTag.onerror = resolve;
                imgTag.src = imgSrc;
            });

            // 安全获取属性值（避免NaN）
            const getNum = (attr: string | null, def = 0): number => {
                return attr ? parseFloat(attr) : def;
            };

            const x = getNum(imgElement.getAttribute('x'));
            const y = getNum(imgElement.getAttribute('y'));
            const width = getNum(imgElement.getAttribute('width'));
            const height = getNum(imgElement.getAttribute('height'));

            // 处理图片旋转（箭头需要旋转）
            const transform = imgElement.getAttribute('transform');
            console.log(transform); // 调试用：打印旋转参数
            if (transform && transform.includes('rotate')) {
                const rotateMatch = transform.match(/rotate\(([^ ]+) ([^ ]+) ([^)]+)\)/);
                console.log(rotateMatch); // 调试用：打印匹配结果
                if (rotateMatch) {
                    const rotationAngle = parseFloat(rotateMatch[1]);
                    const centerX = parseFloat(rotateMatch[2]);
                    const centerY = parseFloat(rotateMatch[3]);

                    // 保存Canvas状态 → 旋转 → 绘制 → 恢复状态
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate((rotationAngle * Math.PI) / 180); // 角度转弧度
                    console.log((rotationAngle * Math.PI) / 180); // 调试用：打印弧度值
                    ctx.translate(-centerX, -centerY);
                    ctx.drawImage(imgTag, x, y, width, height);
                    ctx.restore();
                } else {
                    ctx.drawImage(imgTag, x, y, width, height);
                }
            } else {
                ctx.drawImage(imgTag, x, y, width, height);
            }

            imagesToLoad--;
            // 所有图片绘制完成后下载
            if (imagesToLoad === 0) {
                downloadCanvas(canvas);
            }
        }

        /**
         * 下载Canvas内容为PNG文件
         * @param canvas 绘制完成的Canvas对象
         */
        function downloadCanvas(canvas: HTMLCanvasElement) {
            const link = document.createElement('a');
            link.download = 'metro-sign.png'; // 下载文件名
            link.href = canvas.toDataURL('image/png'); // 转换为PNG格式URL
            link.click(); // 触发浏览器下载
        }
    };

    function getStringJson() {
        const fallbackTheme = getThemeFromGlobals();
        // 导出时统一特殊属性键为 `${id}-${index}`，避免导入后因id变化导致丢失
        const normalizedBlocks = blocks.map(block => {
            const normalizedSpecialStyles: Record<string, string> = {};
            Object.entries(block.specialStyles || {}).forEach(([rawKey, rawValue]) => {
                const match = rawKey.match(/-(\d+)$/);
                if (!match) return;
                const index = match[1];
                normalizedSpecialStyles[`${block.id}-${index}`] = String(rawValue ?? '');
            });

            const normalizedTheme = isThemeStyle(block.style)
                ? {
                      city: block.theme?.city || fallbackTheme.city,
                      line: block.theme?.line || fallbackTheme.line,
                      color: block.theme?.color || normalizedSpecialStyles[`${block.id}-1`] || fallbackTheme.color,
                      textColor: block.theme?.textColor || fallbackTheme.textColor,
                  }
                : undefined;

            if (normalizedTheme) {
                normalizedSpecialStyles[`${block.id}-1`] = normalizedTheme.color;
            }

            return {
                ...block,
                dragId: block.id,
                specialStyles: normalizedSpecialStyles,
                theme: normalizedTheme,
            };
        });

        const payload: MetroSignExportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            backgroundColor,
            blocks: normalizedBlocks,
        };
        const jsonString = JSON.stringify(payload, null, 4);
        return jsonString;
    }

    function saveLocalStorage() {
        const jsonString = getStringJson();
        localStorage.setItem('metro-sign-data', jsonString);
    }

    const downloadJSON = () => {
        try {
            const jsonString = getStringJson();
            // 2. 创建Blob对象（二进制大对象），指定JSON MIME类型
            const blob = new Blob([jsonString], { type: 'application/json' });

            // 3. 创建临时下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            // 4. 设置下载属性：文件名自定义（比如blocks-data.json）
            a.href = url;
            a.download = 'blocks-data.json'; // 下载后的文件名

            // 5. 模拟点击下载，然后清理临时资源
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // 释放URL对象，避免内存泄漏
        } catch (error) {
            // 异常处理：序列化失败/下载失败时提示
            console.error('Error：', error);
            alert(`Error：${(error as Error).message}`);
        }
    };

    // 定义下载SVG的函数
    const downloadSVG = async () => {
        // 改为async函数（核心：处理异步资源下载）
        // 1. 获取SVG DOM元素，做非空校验
        const svgElement = svgRef.current;
        if (!svgElement) {
            console.error('未找到SVG元素，请确认svgRef已正确绑定');
            alert('Error');
            return;
        }

        // ========== 新增：内部辅助函数 - 远程资源转Base64 ==========
        const convertToBase64 = async (url: string, mimeType: string): Promise<string> => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`资源下载失败：${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                return `data:${mimeType};base64,${base64}`;
            } catch (error) {
                console.warn(`资源(${url})转Base64失败，保留原链接：`, error);
                return url; // 降级：保留原URL，不影响整体导出
            }
        };

        try {
            // 2. 克隆SVG元素（避免修改原DOM），补充SVG必需的XML命名空间
            const clonedSvg = svgElement.cloneNode(true) as SVGElement;
            // 确保SVG根节点有正确的xmlns命名空间
            if (!clonedSvg.hasAttribute('xmlns')) {
                clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }

            // ========== 新增：处理1 - 内联远程图片（<image>标签） ==========
            const imageNodes = clonedSvg.querySelectorAll('image');
            for (const img of imageNodes) {
                const imgUrl = img.getAttribute('xlink:href') || img.getAttribute('href');
                if (!imgUrl || imgUrl.startsWith('data:')) continue; // 跳过已内联的图片

                // 自动识别图片MIME类型
                const mimeType = imgUrl.endsWith('png')
                    ? 'image/png'
                    : imgUrl.endsWith('jpg') || imgUrl.endsWith('jpeg')
                      ? 'image/jpeg'
                      : imgUrl.endsWith('svg')
                        ? 'image/svg+xml'
                        : 'image/png';

                const base64Url = await convertToBase64(imgUrl, mimeType);
                img.setAttribute('href', base64Url);
                img.removeAttribute('xlink:href'); // 移除旧属性
            }

            // ========== 新增：处理2 - 内联远程字体（@font-face） ==========
            const styleNodes = clonedSvg.querySelectorAll('style');
            for (const style of styleNodes) {
                let cssText = style.textContent || '';
                // 匹配@font-face中的远程字体URL
                const fontUrlRegex = /@font-face\s*{[^}]*url\(['"]?([^'")]+)['"]?\)[^}]*}/g;
                const fontMatches = [...cssText.matchAll(fontUrlRegex)];

                for (const match of fontMatches) {
                    const fontUrl = match[1];
                    if (!fontUrl || fontUrl.startsWith('data:')) continue;

                    // 自动识别字体MIME类型
                    const mimeType = fontUrl.endsWith('woff2')
                        ? 'font/woff2'
                        : fontUrl.endsWith('woff')
                          ? 'font/woff'
                          : fontUrl.endsWith('ttf')
                            ? 'font/ttf'
                            : 'application/octet-stream';

                    const base64Font = await convertToBase64(fontUrl, mimeType);
                    cssText = cssText.replace(fontUrl, base64Font);
                }
                style.textContent = cssText;
            }

            // ========== 新增：处理3 - 内联外部CSS链接（<link>标签） ==========
            const linkNodes = clonedSvg.querySelectorAll('link[rel="stylesheet"]');
            for (const link of linkNodes) {
                const cssUrl = link.getAttribute('href');
                if (!cssUrl) {
                    link.remove();
                    continue;
                }

                try {
                    const response = await fetch(cssUrl);
                    if (response.ok) {
                        const cssText = await response.text();
                        // 创建内联style标签替换link
                        const inlineStyle = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                        inlineStyle.textContent = cssText;
                        link.parentNode?.replaceChild(inlineStyle, link);
                    } else {
                        link.remove();
                    }
                } catch (error) {
                    console.warn(`外部CSS(${cssUrl})加载失败，已移除：`, error);
                    link.remove();
                }
            }

            // 3. 序列化SVG为完整的字符串（包含XML声明，符合SVG文件标准）
            const svgString = `<?xml version="1.0" encoding="UTF-8"?>
${new XMLSerializer().serializeToString(clonedSvg)}`;

            // 4. 创建Blob对象（指定SVG的MIME类型）
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            // 5. 创建临时下载链接
            const downloadLink = document.createElement('a');
            // 生成下载URL
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            // 设置下载文件名（可自定义，比如"地铁导视.svg"）
            downloadLink.download = 'subway-sign.svg';
            // 触发点击下载
            document.body.appendChild(downloadLink);
            downloadLink.click();

            // 6. 清理临时资源（避免内存泄漏）
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('ERROR：', error);
            alert(`ERROR:${(error as Error).message}`);
        }
    };

    const importJSON = () => {
        fileInputRef.current?.click();
    };

    const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const content = String(reader.result || '');
                const raw: MetroSignExportData = JSON.parse(content);
                if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
                    throw new Error('JSON格式不正确，必须是对象格式。');
                }
                if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
                    throw new Error('JSON格式不正确，缺少有效的 blocks 数组。');
                }

                const usedIds = new Set<number>();
                let fallbackId = 1;
                const normalizedBlocks: BlockData[] = raw.blocks.map((item: Partial<BlockData>) => {
                    const parsedId = Number(item?.id);
                    let id = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : fallbackId;
                    while (usedIds.has(id)) id += 1;
                    usedIds.add(id);
                    fallbackId = Math.max(fallbackId, id + 1);

                    const style = typeof item?.style === 'string' && item.style ? item.style : 'Exit';
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

                    const normalizedTheme = isThemeStyle(style)
                        ? ({
                              city: typeof themeFromItem?.city === 'string' ? themeFromItem.city : DEFAULT_THEME.city,
                              line: typeof themeFromItem?.line === 'string' ? themeFromItem.line : DEFAULT_THEME.line,
                              color:
                                  typeof themeFromItem?.color === 'string' ? themeFromItem.color : DEFAULT_THEME.color,
                              textColor: normalizeTextColor(themeFromItem?.textColor),
                          } as BlockTheme)
                        : undefined;

                    if (normalizedTheme) {
                        normalizedSpecialStyles[`${id}-1`] = normalizedTheme.color;
                    }

                    return {
                        id,
                        style,
                        cutLine,
                        specialStyles: normalizedSpecialStyles,
                        theme: normalizedTheme,
                        collapsed: false,
                        dragId: id,
                    };
                });

                setBlocks(normalizedBlocks);
                setNextId(Math.max(...normalizedBlocks.map(block => block.id), blockNum++) + 1);

                if (typeof raw.backgroundColor === 'string') {
                    setBackgroundColor(raw.backgroundColor);
                }

                const firstThemeBlock = normalizedBlocks.find(block => block.theme)?.theme || DEFAULT_THEME;
                cityGlobal = firstThemeBlock.city;
                lineGlobal = firstThemeBlock.line;
                themeGlobal = firstThemeBlock.color;
                colorGlobal = firstThemeBlock.textColor === 'white' ? '#fff' : '#000';
                setConfirmedColor([
                    firstThemeBlock.city,
                    firstThemeBlock.line,
                    firstThemeBlock.color,
                    firstThemeBlock.textColor,
                ]);
            } catch (error) {
                console.error('Failed to import JSON：', error);
                alert(`Failed to import JSON：${(error as Error).message}`);
            } finally {
                // 允许重复导入同一文件
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const paletteFrameUrl = paletteHelper.current.getIframeUrl(rmgRuntime.getAppName());
    // ===== 组件主布局 =====
    return (
        <div className="metro-sign-generator">
            {/* 预览区标题 */}
            {/* <h2>{t('main_area.preview')}</h2> */}
            {/* SVG预览容器 */}
            <div className="preview-container">
                <SvgPreview />
            </div>

            {/* 操作区容器 */}
            <div className="placeholder"></div>
            <div className="container">
                <div className="controls">
                    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
                        {/* 功能按钮区：添加块、导出PNG、背景色设置 */}
                        <div className="actions">
                            <Button onClick={addBlock} className="add-btn">
                                {t('main_area.new_block')}
                            </Button>
                            <Button onClick={downloadPNG} className="download-btn">
                                {t('main_area.export_as_png')}
                            </Button>
                            <Button onClick={downloadJSON} className="download-btn">
                                {t('main_area.export_as_json')}
                            </Button>
                            <Button onClick={downloadSVG} className="download-btn">
                                {t('main_area.export_as_svg')}
                            </Button>
                            <Button
                                onClick={importJSON}
                                className="download-btn"
                                style={{ color: '#000', backgroundColor: 'yellow' }}
                            >
                                {t('main_area.import_json')}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/json,.json"
                                style={{ display: 'none' }}
                                onChange={handleImportJSON}
                            />
                            <DeleteZone onDrop={id => removeBlock(id)} />
                            <div className="bg-color">
                                <label>{t('main_area.background_color')}：</label>
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={e => setBackgroundColor(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 导视块配置区域 */}
                        <div className="blocks-container">
                            {/* 导视块名称列表 */}
                            <div className="blocks-box-name">
                                {blocks.map((block, index) => renderBlock(block, index))}
                            </div>
                            {/* 导视块特殊配置内容 */}
                            <div className="blocks-box-specials">{specials_contect}</div>
                        </div>
                    </DndProvider>
                </div>
            </div>
            <PaletteIframe url={paletteFrameUrl} visible={isOpen && activeThemeBlockId !== null} />

            {/* 页脚：版权信息 */}
            <footer>
                <h6 style={{ color: 'gray' }}>
                    {t('copy').split('https://centralgo.site/vitool/')[0]}
                    <a style={{ color: 'gray' }} href="https://centralgo.site/vitool/">
                        https://centralgo.site/vitool/
                    </a>
                    {t('copy').split('https://centralgo.site/vitool/')[1]}
                </h6>
            </footer>
        </div>
    );
};

// 导出组件供外部使用
export default MetroSignGenerator;
// 在模块加载时注册默认块类型（只需调用一次）
registerDefaultBlockTypes();
