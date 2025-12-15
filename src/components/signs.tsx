/* eslint-disable no-case-declarations */
// 导入React核心依赖：useState(状态管理)、useRef(获取DOM/持久化变量)
import React, { useState, useRef } from 'react';
// 导入国际化翻译钩子，支持多语言切换（react-i18next）
import { useTranslation } from 'react-i18next';
// 导入组件专属样式文件
import './MetroSignGenerator.css';

/**
 * 导视块数据结构接口
 * 每个导视块对应地铁导视牌上的一个独立功能模块（如出口、线路、终点站、箭头等）
 */
interface BlockData {
    id: number; // 导视块唯一标识ID（自增）
    style: string; // 导视块样式类型（如Exit/Line/To/箭头等）
    cutLine: boolean; // 是否显示黄色分割竖线
    specialStyles: Record<string, string>; // 该块的特殊样式参数（键值对存储自定义配置）
    collapsed: boolean; // 配置面板折叠状态（true=展开，false=折叠）
}

/**
 * 特殊样式配置项接口
 * 定义不同导视块样式对应的可配置参数规则
 */
interface SpecialStyleConfig {
    type: 'number' | 'text' | 'radio'; // 输入控件类型：数字/文本/单选框
    label: string; // 配置项标签（国际化文本）
    defaultValue: string; // 默认值
    options?: { value: string; label: string }[]; // 单选框选项（仅radio类型需要）
    maxLength?: number; // 文本输入框最大长度（仅text类型可选）
}

/**
 * 工具函数：根据导视块样式计算像素宽度
 * 地铁导视牌采用"标准格"设计：1标准格=128px，不同样式占用不同格数
 * @param style 导视块样式类型
 * @returns 该样式对应的像素宽度
 */
const getBlockWidth = (style: string): number => {
    switch (style) {
        case 'ExitText': // 出口文本块（4个标准格）
            return 512;
        case 'Line': // 线路块（2个标准格）
        case 'Line-space': // 带间距线路块（2个标准格）
        case 'blank2': // 2格空白块（2个标准格）
            return 256;
        case 'To': // 终点站文本块（2.5个标准格）
            return 256 + 128;
        default: // 基础块（1个标准格：出口logo/箭头/卫生间/1格空白）
            return 128;
    }
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
const RailSignGenerator: React.FC = () => {
    // 国际化翻译钩子，t函数用于获取对应语言的文本
    const { t } = useTranslation();

    // ===== 核心状态管理 =====
    // 导视块列表（初始默认1个出口logo块）
    const [blocks, setBlocks] = useState<BlockData[]>([
        { id: 1, style: 'Exit', cutLine: false, specialStyles: {}, collapsed: false },
    ]);
    // 下一个新增导视块的ID（自增，避免重复）
    const [nextId, setNextId] = useState(2);
    // SVG预览区域的DOM引用（用于导出PNG时获取SVG内容）
    const svgRef = useRef<SVGSVGElement>(null);
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
     * 特殊样式配置映射表
     * 键：导视块样式类型 | 值：该样式对应的可配置参数列表
     * 每个参数对应界面上的一个输入控件，动态生成
     */
    const specialStyleConfigs: Record<string, SpecialStyleConfig[]> = {
        // 出口Logo块（EXIT/出）配置
        Exit: [
            {
                type: 'radio',
                label: t('blocks.styles.specials.text_align'), // 文本对齐方式
                defaultValue: 'C',
                options: [
                    { value: 'R', label: t('blocks.styles.specials.align_right') }, // 右对齐
                    { value: 'L', label: t('blocks.styles.specials.align_left') }, // 左对齐
                    { value: 'C', label: t('blocks.styles.specials.align_center') }, // 居中对齐
                ],
            },
        ],
        // 线路块配置
        Line: [
            { type: 'number', label: t('blocks.styles.specials.line_number'), defaultValue: '10' }, // 线路号
            { type: 'text', label: t('blocks.styles.specials.line_color'), defaultValue: '#00a3c2' }, // 线路颜色
        ],
        // 带间距线路块配置（布局不同，参数同Line）
        'Line-space': [
            { type: 'number', label: t('blocks.styles.specials.line_number'), defaultValue: '10' },
            { type: 'text', label: t('blocks.styles.specials.line_color'), defaultValue: '#00a3c2' },
        ],
        // 出口文本块（如：A口 蓝靛厂南路）配置
        ExitText: [
            { type: 'text', label: t('blocks.styles.specials.exit_letter'), defaultValue: 'A', maxLength: 1 }, // 出口字母（A/B/C）
            { type: 'text', label: t('blocks.styles.specials.exit_lower'), defaultValue: '', maxLength: 1 }, // 出口下标（如A1的1）
            { type: 'text', label: t('blocks.styles.specials.exit_zh'), defaultValue: '蓝靛厂南路' }, // 出口中文名称
            { type: 'text', label: t('blocks.styles.specials.exit_en'), defaultValue: 'Landianchang South Rd.' }, // 出口英文名称
        ],
        // 终点站文本块（开往/终点站 宛平城）配置
        To: [
            { type: 'text', label: t('blocks.styles.specials.terminal_zh'), defaultValue: '宛平城' }, // 终点站中文
            { type: 'text', label: t('blocks.styles.specials.terminal_en'), defaultValue: 'Wanpingcheng' }, // 终点站英文
            {
                type: 'radio',
                label: t('blocks.styles.specials.text_align'), // 文本对齐方式
                defaultValue: 'R',
                options: [
                    { value: 'R', label: t('blocks.styles.specials.align_right') },
                    { value: 'L', label: t('blocks.styles.specials.align_left') },
                    { value: 'C', label: t('blocks.styles.specials.align_center') }, // 居中对齐
                ],
            },
            {
                type: 'radio',
                label: t('blocks.styles.specials.line_type'), // 线路类型
                defaultValue: 'NM',
                options: [
                    { value: 'NM', label: t('blocks.styles.specials.normal_line') }, // 普通线路（开往）
                    { value: 'LOOP', label: t('blocks.styles.specials.loop_line') }, // 环线（下一站）
                    { value: 'T', label: t('blocks.styles.specials.terminal_station') }, // 终点站
                ],
            },
        ],
    };

    /**
     * 添加新的导视块
     * 新块默认样式为Exit，初始状态为折叠，ID自增
     */
    const addBlock = () => {
        const newBlock: BlockData = {
            id: nextId,
            style: 'Exit',
            cutLine: false,
            specialStyles: {},
            collapsed: false, // 新增块默认折叠
        };

        // 不可变更新数组（React状态更新规范）
        setBlocks([...blocks, newBlock]);
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
                          specialStyles: style in specialStyleConfigs ? {} : block.specialStyles,
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
            // 获取当前参数值，无则为空
            const value = block.specialStyles[key] || '';

            // 文本输入框
            if (config.type === 'text') {
                return (
                    <div key={key} className="special-input">
                        <label>{config.label}:</label>
                        <input
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
                        <label>{config.label}:</label>
                        <input
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
                        <label>{config.label}:</label>
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
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }

            return null;
        });
    };

    /**
     * 渲染单个导视块的配置面板
     * 包含：折叠按钮、删除按钮、样式切换、分割线开关、特殊样式配置
     * ❗ 问题：specials_contect是普通变量，赋值后不会触发组件重渲染，导致配置内容不更新
     * @param block 导视块数据
     * @returns 单个导视块的配置面板JSX
     */
    const renderBlock = (block: BlockData) => {
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
                            <h4>{t('blocks.styles.single_block')}：</h4>
                            <div className="radio-grid">
                                {['Exit', '↗', '↙', '↖', '↘', '→', '←', '↑', '↓', 'toilet', 'blank1'].map(style => (
                                    <label key={style} className="style-option">
                                        <input
                                            type="radio"
                                            name={`style-${block.id}`}
                                            value={style}
                                            checked={block.style === style}
                                            onChange={() => updateBlockStyle(block.id, style)}
                                        />
                                        {/* 样式名称国际化映射 */}
                                        {style === 'Exit'
                                            ? t('blocks.styles.exit_logo')
                                            : style === 'toilet'
                                              ? t('blocks.styles.toilet')
                                              : style === 'blank1'
                                                ? t('blocks.styles.blank')
                                                : style}
                                    </label>
                                ))}
                            </div>

                            <h4>{t('blocks.styles.two_block')}：</h4>
                            <div className="radio-grid">
                                {['Line', 'Line-space', 'blank2'].map(style => (
                                    <label key={style} className="style-option">
                                        <input
                                            type="radio"
                                            name={`style-${block.id}`}
                                            value={style}
                                            checked={block.style === style}
                                            onChange={() => updateBlockStyle(block.id, style)}
                                        />
                                        {style === 'Line'
                                            ? t('blocks.styles.line')
                                            : style === 'Line-space'
                                              ? t('blocks.styles.line_space')
                                              : style === 'blank2'
                                                ? t('blocks.styles.blank')
                                                : t('blocks.styles.terminal_dest')}
                                    </label>
                                ))}
                            </div>

                            <h4>{t('blocks.styles.three_blocks')}：</h4>
                            <div className="radio-grid">
                                {['To', 'ExitText'].map(style => (
                                    <label key={style} className="style-option">
                                        <input
                                            type="radio"
                                            name={`style-${block.id}`}
                                            value={style}
                                            checked={block.style === style}
                                            onChange={() => updateBlockStyle(block.id, style)}
                                        />
                                        {style === 'To'
                                            ? t('blocks.styles.terminal_text')
                                            : style === 'ExitText'
                                              ? t('blocks.styles.exit_text')
                                              : style}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 渲染特殊样式配置（仅当前样式有配置项时显示） */}
                    {block.style in specialStyleConfigs && (
                        <div className="section special-styles">
                            <label>{t('blocks.styles.special')}</label>
                            {renderSpecialInputs(block)}
                        </div>
                    )}
                </>
            );
        }

        let divcolor = '#f8fbfd';
        if (block.collapsed) {
            divcolor = '#00a6c4';
        }

        // 导视块配置面板主结构
        return (
            <div key={block.id} className="block-config" style={{ backgroundColor: divcolor }}>
                <div className="block-header">
                    {/* 折叠/展开按钮 */}
                    <button onClick={() => toggleCollapse(block.id)} className="collapse-btn">
                        <h3>
                            {t('styleToText.' + block.style)} {/*finding1*/}
                        </h3>
                    </button>
                    {/* 删除按钮 */}
                    <button onClick={() => removeBlock(block.id)} className="remove-btn">
                        ×
                    </button>
                </div>
            </div>
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
            const blockElements = [];
            const blockWidth = getBlockWidth(block.style);
            // 当前块的起始X坐标
            const xPos = currentX;
            // 更新累加器，为下一个块计算位置
            currentX += blockWidth;

            // 根据不同样式渲染SVG内容
            switch (block.style) {
                // 出口Logo块（EXIT/出）
                case 'Exit':
                    const exit_align = block.specialStyles[`${block.id}-0`] || '';
                    // 左对齐
                    if (exit_align == 'L') {
                        blockElements.push(
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
                    // 居中对齐
                    if (exit_align == 'C') {
                        blockElements.push(
                            <rect
                                key={`${block.id}-rect`}
                                x={xPos + 15}
                                y={0}
                                width={98}
                                height={128}
                                fill="#00aa52"
                            />,
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
                    // 右对齐
                    if (exit_align == 'R') {
                        blockElements.push(
                            <rect
                                key={`${block.id}-rect`}
                                x={xPos + 30}
                                y={0}
                                width={98}
                                height={128}
                                fill="#00aa52"
                            />,
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
                    break;

                // 卫生间图标块
                case 'toilet':
                    blockElements.push(
                        <image
                            key={`${block.id}-image`}
                            href="logos/toilet.svg"
                            x={xPos}
                            y={0}
                            width={128}
                            height={128}
                        />
                    );
                    break;

                // 1格空白块（无内容）
                case 'blank1':
                    break;

                // 线路块（如：10号线 Line 10）
                case 'Line':
                    const lineNum = block.specialStyles[`${block.id}-0`] || '10';
                    const lineColor = block.specialStyles[`${block.id}-1`] || '#00a3c2';

                    blockElements.push(
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
                            {parseInt(lineNum) >= 10 ? `Line ${lineNum}` : `Line ${lineNum}`}
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
                    break;

                // 带间距线路块（线路号两侧留空）
                case 'Line-space':
                    const lineNum2 = block.specialStyles[`${block.id}-0`] || '10';
                    const lineColor2 = block.specialStyles[`${block.id}-1`] || '#00a3c2';

                    blockElements.push(
                        <rect
                            key={`${block.id}-rect`}
                            x={xPos + 20}
                            y={90}
                            width={216}
                            height={38}
                            fill={lineColor2}
                        />,
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
                            {parseInt(lineNum2) >= 10 ? `Line ${lineNum2}` : `Line ${lineNum2}`}
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
                    break;

                // 出口文本块（A口 蓝靛厂南路）
                case 'ExitText':
                    const exitLetter = block.specialStyles[`${block.id}-0`] || 'A';
                    const exitSubscript = block.specialStyles[`${block.id}-1`] || '';
                    const exitChinese = block.specialStyles[`${block.id}-2`] || '蓝靛厂南路';
                    const exitEnglish = block.specialStyles[`${block.id}-3`] || 'Landianchang South Rd.';

                    blockElements.push(
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
                        <text
                            key={`${block.id}-text2`}
                            x={xPos + 98}
                            y={107}
                            fontFamily="Arial"
                            fontSize={40}
                            fill="white"
                        >
                            {exitSubscript}
                        </text>,
                        <text
                            key={`${block.id}-text3`}
                            x={xPos + 130}
                            y={60}
                            fontFamily="Noto Sans SC"
                            fontSize={50}
                            fill="white"
                        >
                            {exitChinese}
                        </text>,
                        <text
                            key={`${block.id}-text4`}
                            x={xPos + 130}
                            y={103}
                            fontFamily="Arial"
                            fontSize={30}
                            fill="white"
                        >
                            {exitEnglish}
                        </text>
                    );
                    break;

                // 终点站文本块（开往/终点站 宛平城）
                case 'To':
                    const toChinese = block.specialStyles[`${block.id}-0`] || '';
                    const toEnglish = block.specialStyles[`${block.id}-1`] || '';
                    const align = block.specialStyles[`${block.id}-2`] || 'R';
                    const lineType = block.specialStyles[`${block.id}-3`] || 'NM';

                    // 根据线路类型确定前缀文本
                    let prefixChinese = '';
                    let prefixEnglish = 'To';
                    if (lineType === 'LOOP') {
                        prefixChinese = '下一站';
                    } else if (lineType === 'T') {
                        prefixChinese = '终点站';
                        prefixEnglish = 'Terminus';
                    } else {
                        prefixChinese = '开往';
                    }

                    // 计算文本对齐位置
                    const centerX = xPos + blockWidth / 2;
                    const rightX = xPos + blockWidth - 10;
                    const leftX = xPos + 10;

                    // 渲染中文文本
                    if (prefixChinese || toChinese) {
                        if (lineType === 'T')
                            blockElements.push(
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
                        else
                            blockElements.push(
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

                    // 渲染英文文本
                    if (prefixEnglish || toEnglish) {
                        if (lineType === 'T')
                            blockElements.push(
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
                        else
                            blockElements.push(
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
                    break;

                // 2格空白块（无内容）
                case 'blank2':
                    break;

                // 箭头样式块（↗/↙/↖/↘/→/←/↑/↓）
                default:
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

                    if (arrowMap[block.style]) {
                        const { href, rotation } = arrowMap[block.style];
                        blockElements.push(
                            <image
                                key={`${block.id}-image`}
                                href={href}
                                x={xPos + 15}
                                y={15}
                                width={100}
                                height={100}
                                transform={`rotate(${rotation} ${xPos + 64} 64)`}
                            />
                        );
                    }
            }

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

    // ===== 组件主布局 =====
    return (
        <div className="metro-sign-generator">
            {/* 预览区标题 */}
            <h2>{t('main_area.preview')}</h2>
            {/* SVG预览容器 */}
            <div className="preview-container">
                <SvgPreview />
            </div>

            {/* 操作区容器 */}
            <div className="container">
                <div className="controls">
                    {/* 功能按钮区：添加块、导出PNG、背景色设置 */}
                    <div className="actions">
                        <button onClick={addBlock} className="add-btn">
                            {t('main_area.new_block')}
                        </button>
                        <button onClick={downloadPNG} className="download-btn">
                            {t('main_area.export_as_png')}
                        </button>
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
                        <div className="blocks-box blocks-box-name">
                            <div>{blocks.map(block => renderBlock(block))}</div>
                        </div>
                        {/* 导视块特殊配置内容（❌ 此处不会更新，因specials_contect非状态） */}
                        <div className="blocks-box blocks-box-specials">{specials_contect}</div>
                    </div>
                </div>
            </div>

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
export default RailSignGenerator;
