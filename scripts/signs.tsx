import React, { useState, useRef } from 'react';
// 在 signs.tsx 顶部添加
import './MetroSignGenerator.css';

interface BlockData {
    id: number;
    style: string;
    cutLine: boolean;
    specialStyles: Record<string, string>;
    collapsed: boolean; // 添加折叠状态
}

interface SpecialStyleConfig {
    type: 'number' | 'text' | 'radio';
    label: string;
    defaultValue: string;
    options?: { value: string; label: string }[];
    maxLength?: number;
}
// 在组件内添加此函数
const getBlockWidth = (style: string): number => {
    switch (style) {
      case "ExitText":
        return 512; // 4个标准格
      case "Line":
      case "Line-space":
        return 256;
      case "To":
        return 256+128; // 2个标准格
      case "blank2":
        return 256;
      default:
        return 128; // 1个标准格
    }
  };

const MetroSignGenerator: React.FC = () => {
    const [blocks, setBlocks] = useState<BlockData[]>([
        { id: 1, style: "Exit", cutLine: false, specialStyles: {}, collapsed: false }
    ]);
    const [nextId, setNextId] = useState(2);
    const svgRef = useRef<SVGSVGElement>(null);
    const [backgroundColor, setBackgroundColor] = useState("#041c31");

    const specialStyleConfigs: Record<string, SpecialStyleConfig[]> = {
        "Exit": [
            {
                type: 'radio',
                label: "对齐方式",
                defaultValue: "C",
                options: [
                    { value: 'R', label: '靠右对齐' },
                    { value: 'L', label: '靠左对齐' },
                    { value: 'C', label: '居中对齐' }
                ]
            }
        ],
        "Line": [
            { type: 'number', label: '线路编号', defaultValue: '10' },
            { type: 'text', label: '线路颜色', defaultValue: '#00a3c2' }
        ],
        "Line-space": [
            { type: 'number', label: '线路编号', defaultValue: '10' },
            { type: 'text', label: '线路颜色', defaultValue: '#00a3c2' }
        ],
        "ExitText": [
            { type: 'text', label: '出口编号', defaultValue: 'A', maxLength: 1 },
            { type: 'text', label: '出口下角标', defaultValue: '', maxLength: 1 },
            { type: 'text', label: '出口中文', defaultValue: '蓝靛厂南路' },
            { type: 'text', label: '出口英文', defaultValue: 'Landianchang South Rd.' }
        ],
        "To": [
            { type: 'text', label: '终点站中文', defaultValue: '宛平城' },
            { type: 'text', label: '终点站英文', defaultValue: 'Wanpingcheng' },
            {
                type: 'radio',
                label: '对齐方式',
                defaultValue: 'R',
                options: [
                    { value: 'R', label: '靠右对齐' },
                    { value: 'L', label: '靠左对齐' },
                    { value: 'C', label: '居中对齐' } // 添加居中对齐选项
                ]
            },
            {
                type: 'radio',
                label: '线路类型',
                defaultValue: 'NM',
                options: [
                    { value: 'NM', label: '普通线' },
                    { value: 'LOOP', label: '环线' },
                    { value: 'T', label: '终点站' }
                ]
            }
        ]
    };

    const addBlock = () => {
        const newBlock: BlockData = {
            id: nextId,
            style: "Exit",
            cutLine: false,
            specialStyles: {},
            collapsed: false // 添加折叠状态
        };

        setBlocks([...blocks, newBlock]);
        setNextId(nextId + 1);
    };

    const removeBlock = (id: number) => {
        if (blocks.length <= 1) return;
        setBlocks(blocks.filter(block => block.id !== id));
    };

    const toggleCollapse = (id: number) => {
        setBlocks(blocks.map(block =>
            block.id === id ? { ...block, collapsed: !block.collapsed } : block
        ));
    };

    const updateBlockStyle = (id: number, style: string) => {
        setBlocks(blocks.map(block =>
            block.id === id
                ? { ...block, style, specialStyles: style in specialStyleConfigs ? {} : block.specialStyles }
                : block
        ));
    };

    const updateBlockCutLine = (id: number, cutLine: boolean) => {
        setBlocks(blocks.map(block =>
            block.id === id ? { ...block, cutLine } : block
        ));
    };

    const updateSpecialStyle = (id: number, key: string, value: string) => {
        setBlocks(blocks.map(block =>
            block.id === id
                ? { ...block, specialStyles: { ...block.specialStyles, [key]: value } }
                : block
        ));
    };

    const renderSpecialInputs = (block: BlockData) => {
        const configs = specialStyleConfigs[block.style] || [];

        return configs.map((config, index) => {
            const key = `${block.id}-${index}`;
            const value = block.specialStyles[key] || "";

            if (config.type === 'text') {
                return (
                    <div key={key} className="special-input">
                        <label>{config.label}:</label>
                        <input
                            type="text"
                            value={value}
                            placeholder={config.defaultValue} // 添加placeholder提示
                            maxLength={config.maxLength}
                            onChange={(e) => updateSpecialStyle(block.id, key, e.target.value)}
                        />
                    </div>
                );
            }

            if (config.type === 'number') {
                return (
                    <div key={key} className="special-input">
                        <label>{config.label}:</label>
                        <input
                            type="number"
                            value={value}
                            placeholder={config.defaultValue} // 添加placeholder提示
                            onChange={(e) => updateSpecialStyle(block.id, key, e.target.value)}
                        />
                    </div>
                );
            }

            if (config.type === 'radio' && config.options) {
                return (
                    <div key={key} className="special-input">
                        <label>{config.label}:</label>
                        <div className="radio-group">
                            {config.options.map(option => (
                                <label key={option.value}>
                                    <input
                                        type="radio"
                                        name={`${key}-radio`}
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

    const renderBlock = (block: BlockData) => {
        return (
            <div key={block.id} className="block-config">
                <div className="block-header">
                    <h3>
                        <button
                            onClick={() => toggleCollapse(block.id)}
                            className="collapse-btn"
                        >
                            {block.collapsed ? "▶" : "▼"}
                        </button>
                        块 {block.id}
                    </h3>
                    <button onClick={() => removeBlock(block.id)} className="remove-btn">
                        ×
                    </button>
                </div>

                {!block.collapsed && (
                    <>
                        <div className="section">
                            <label>分割线（右）</label>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        name={`cutLine-${block.id}`}
                                        checked={!block.cutLine}
                                        onChange={() => updateBlockCutLine(block.id, false)}
                                    />
                                    否
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name={`cutLine-${block.id}`}
                                        checked={block.cutLine}
                                        onChange={() => updateBlockCutLine(block.id, true)}
                                    />
                                    是
                                </label>
                            </div>
                        </div>

                        <div className="section">
                            <label>样式</label>
                            <div className="style-group">
                                <h4>单格：</h4>
                                <div className="radio-grid">
                                    {["Exit", "↗", "↙", "↖", "↘", "→", "←", "↑", "↓", "toilet", "blank1"].map(style => (
                                        <label key={style} className="style-option">
                                            <input
                                                type="radio"
                                                name={`style-${block.id}`}
                                                value={style}
                                                checked={block.style === style}
                                                onChange={() => updateBlockStyle(block.id, style)}
                                            />
                                            {style === "Exit" ? "出口图标" :
                                                style === "toilet" ? "洗手间" :
                                                    style === "blank1" ? "空" :
                                                        style}
                                        </label>
                                    ))}
                                </div>

                                <h4>两格：</h4>
                                <div className="radio-grid">
                                    {["Line", "Line-space", "blank2"].map(style => (
                                        <label key={style} className="style-option">
                                            <input
                                                type="radio"
                                                name={`style-${block.id}`}
                                                value={style}
                                                checked={block.style === style}
                                                onChange={() => updateBlockStyle(block.id, style)}
                                            />
                                            {style === "Line" ? "线路" :
                                                style === "Line-space" ? "线路+空格" :
                                                    style === "blank2" ? "空":
                                                        "终点站(开往)"}
                                        </label>
                                    ))}
                                </div>
                                <h4>三格：</h4>
                                <div className="radio-grid">
                                    {["To", "ExitText"].map(style => (
                                        <label key={style} className="style-option">
                                            <input
                                                type="radio"
                                                name={`style-${block.id}`}
                                                value={style}
                                                checked={block.style === style}
                                                onChange={() => updateBlockStyle(block.id, style)}
                                            />
                                            {style === "To"?"终点文字":
                                                style === "ExitText" ? "出口文字" :
                                                    style}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {block.style in specialStyleConfigs && (
                            <div className="section special-styles">
                                <label>独特属性</label>
                                {renderSpecialInputs(block)}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    const SvgPreview = () => {
        const blockPositions = blocks.reduce((positions, block, index) => {
            const prevPosition = positions[index - 1] || 0;
            const blockWidth = getBlockWidth(block.style);
            return [...positions, prevPosition + blockWidth];
          }, [] as number[]);
        
          // 计算总宽度
          const svgWidth = blockPositions[blockPositions.length - 1] || 0;
        // 创建位置累加器
        let currentX = 0;

        const svgElements = blocks.flatMap((block, index) => {
            const blockElements = [];
            const blockWidth = getBlockWidth(block.style);

            // 记录当前块的起始位置
            const xPos = currentX;

            // 更新累加器
            currentX += blockWidth;

            switch (block.style) {  
                case "Exit":
                    const exit_align = block.specialStyles[`${block.id}-0`] || "";
                    if (exit_align=="L")
                        {blockElements.push(
                            <rect key={`${block.id}-rect`} x={xPos} y={0} width={98} height={128} fill="#00aa52" />,
                            <text key={`${block.id}-text1`} x={xPos + 10} y={120} fontFamily="Noto Sans SC" fontSize={35} fill="white" fontWeight={500}>EXIT</text>,
                            <text key={`${block.id}-text2`} x={xPos + 10} y={80} fontFamily="Noto Sans SC" fontSize={80} fill="white" fontWeight={500}>出</text>
                        );
                    }if (exit_align=="C")
                        {blockElements.push(
                            <rect key={`${block.id}-rect`} x={xPos + 15} y={0} width={98} height={128} fill="#00aa52" />,
                            <text key={`${block.id}-text1`} x={xPos + 25} y={120} fontFamily="Noto Sans SC" fontSize={35} fill="white" fontWeight={500}>EXIT</text>,
                            <text key={`${block.id}-text2`} x={xPos + 25} y={80} fontFamily="Noto Sans SC" fontSize={80} fill="white" fontWeight={500}>出</text>
                        );
                    }
                    if (exit_align=="R")
                        {blockElements.push(
                            <rect key={`${block.id}-rect`} x={xPos + 30} y={0} width={98} height={128} fill="#00aa52" />,
                            <text key={`${block.id}-text1`} x={xPos + 40} y={120} fontFamily="Noto Sans SC" fontSize={35} fill="white" fontWeight={500}>EXIT</text>,
                            <text key={`${block.id}-text2`} x={xPos + 40} y={80} fontFamily="Noto Sans SC" fontSize={80} fill="white" fontWeight={500}>出</text>
                        );
                    }
                    break;

                case "toilet":
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

                
                case "blank1":
                    break;

                case "Line":
                    const lineNum = block.specialStyles[`${block.id}-0`] || "10";
                    const lineColor = block.specialStyles[`${block.id}-1`] || "#00a3c2";

                    blockElements.push(
                        <rect key={`${block.id}-rect`} x={xPos} y={90} width={256} height={38} fill={lineColor} />,
                        <text key={`${block.id}-text1`} x={xPos} y={85} fontFamily="Noto Sans SC" fontSize={90} fill="white" fontWeight={500}>{lineNum}</text>,
                        <text key={`${block.id}-text2`} x={xPos + 256} y={85} fontFamily="Noto Sans SC" fontSize={25} fill="white" fontWeight={500} textAnchor="end">
                            {parseInt(lineNum) >= 10 ? `Line ${lineNum}` : `Line　${lineNum}`}
                        </text>,
                        <text key={`${block.id}-text3`} x={xPos + 256} y={55} fontFamily="Noto Sans SC" fontSize={45} fill="white" fontWeight={500} textAnchor="end">号线</text>
                    );
                    break;

                case "Line-space":
                    const lineNum2 = block.specialStyles[`${block.id}-0`] || "10";
                    const lineColor2 = block.specialStyles[`${block.id}-1`] || "#00a3c2";

                    blockElements.push(
                        <rect key={`${block.id}-rect`} x={xPos + 20} y={90} width={216} height={38} fill={lineColor2} />,
                        <text key={`${block.id}-text1`} x={xPos + 20} y={85} fontFamily="Noto Sans SC" fontSize={90} fill="white" fontWeight={500}>{lineNum2}</text>,
                        <text key={`${block.id}-text2`} x={xPos + 236} y={85} fontFamily="Noto Sans SC" fontSize={25} fill="white" fontWeight={500} textAnchor="end">
                            {parseInt(lineNum2) >= 10 ? `Line ${lineNum2}` : `Line　${lineNum2}`}
                        </text>,
                        <text key={`${block.id}-text3`} x={xPos + 236} y={55} fontFamily="Noto Sans SC" fontSize={45} fill="white" fontWeight={500} textAnchor="end">号线</text>
                    );
                    break;

                case "ExitText":
                    const exitLetter = block.specialStyles[`${block.id}-0`] || "A";
                    const exitSubscript = block.specialStyles[`${block.id}-1`] || "";
                    const exitChinese = block.specialStyles[`${block.id}-2`] || "蓝靛厂南路";
                    const exitEnglish = block.specialStyles[`${block.id}-3`] || "Landianchang South Rd.";

                    blockElements.push(
                        //<rect key={`${block.id}-rect`} x={xPos + 15} y={15} width={98} height={98} rx={10} ry={10} strokeWidth={4} stroke="white" fill="#041c31" />,
                        <text
                            key={`${block.id}-text1`}
                            x={exitSubscript ? xPos + 20 : xPos + 32}
                            y={105}
                            fontFamily="Noto Sans SC"
                            fontSize={120}
                            fill="white"
                        >
                            {exitLetter}
                        </text>,
                        <text key={`${block.id}-text2`} x={xPos + 98} y={107} fontFamily="Noto Sans SC" fontSize={40} fill="white">
                            {exitSubscript}
                        </text>,
                        <text key={`${block.id}-text3`} x={xPos + 130} y={60} fontFamily="Noto Sans SC" fontSize={50} fill="white">
                            {exitChinese}
                        </text>,
                        <text key={`${block.id}-text4`} x={xPos + 130} y={103} fontFamily="Noto Sans SC" fontSize={30} fill="white"> {/* 字体改为 Noto Sans SC */}
                            {exitEnglish}
                        </text>
                        // 删除多余的 <text> 元素
                    );
                    break;
                case "To":
                    const toChinese = block.specialStyles[`${block.id}-0`] || ""; // 终点站中文
                    const toEnglish = block.specialStyles[`${block.id}-1`] || ""; // 终点站英文
                    const align = block.specialStyles[`${block.id}-2`] || "R";   // 对齐方式
                    const lineType = block.specialStyles[`${block.id}-3`] || "NM"; // 线路类型

                    // 确定前缀文本
                    let prefixChinese = "";
                    let prefixEnglish = "To";
                    if (lineType === "LOOP") {
                        prefixChinese = "下一站";
                    } else if (lineType === "T") {
                        prefixChinese = "终点站";
                        prefixEnglish = "Terminus";
                    } else {
                        prefixChinese = "开往";
                    }

                    // 计算文本位置
                    const centerX = xPos + blockWidth / 2;
                    const rightX = xPos + blockWidth - 10;
                    const leftX = xPos + 10;

                    // 中文文本
                    if (prefixChinese || toChinese) {
                        if (lineType === "T") blockElements.push(
                            <text
                                key={`${block.id}-text1`}
                                x={align === "R" ? rightX : (align === "C" ? centerX : leftX)}
                                y={63}
                                fontFamily="Noto Sans SC"
                                fontSize={45}
                                fill="white"
                                textAnchor={align === "R" ? "end" : (align === "C" ? "middle" : "start")}
                            >
                                {prefixChinese}
                            </text>
                        );
                        else blockElements.push(
                            <text
                                key={`${block.id}-text1`}
                                x={align === "R" ? rightX : (align === "C" ? centerX : leftX)}
                                y={63}
                                fontFamily="Noto Sans SC"
                                fontSize={45}
                                fill="white"
                                textAnchor={align === "R" ? "end" : (align === "C" ? "middle" : "start")}
                            >
                                {prefixChinese}
                                <tspan fontWeight={600}> {toChinese}</tspan> {/* 修复语法 */}
                            </text>
                        );
                    }

                    // 英文文本
                    if (prefixEnglish || toEnglish) {
                        if (lineType === "T") blockElements.push(
                            <text
                                key={`${block.id}-text2`}
                                x={align === "R" ? rightX : (align === "C" ? centerX : leftX)}
                                y={103}
                                fontFamily="Noto Sans SC"  // 字体改为 Noto Sans SC
                                fontSize={30}
                                fill="white"
                                textAnchor={align === "R" ? "end" : (align === "C" ? "middle" : "start")}
                            >
                                {prefixEnglish}
                            </text>
                        );
                        else blockElements.push(
                            <text
                                key={`${block.id}-text2`}
                                x={align === "R" ? rightX : (align === "C" ? centerX : leftX)}
                                y={103}
                                fontFamily="Noto Sans SC"  // 字体改为 Noto Sans SC
                                fontSize={30}
                                fill="white"
                                textAnchor={align === "R" ? "end" : (align === "C" ? "middle" : "start")}
                            >
                                {prefixEnglish}
                                <tspan fontWeight={560}> {toEnglish}</tspan> {/* 修复语法 */}
                            </text>
                        );
                    }
                    break;
                case "blank2":
                    break;

                default:
                    const arrowMap: Record<string, { href: string; rotation: number }> = {
                        "↗": { href: "logos/arrow-45.svg", rotation: 270 },
                        "↙": { href: "logos/arrow-45.svg", rotation: 90 },
                        "↖": { href: "logos/arrow-45.svg", rotation: 180 },
                        "↘": { href: "logos/arrow-45.svg", rotation: 0 },
                        "→": { href: "logos/arrow.svg", rotation: 0 },
                        "←": { href: "logos/arrow.svg", rotation: 180 },
                        "↑": { href: "logos/arrow.svg", rotation: 270 },
                        "↓": { href: "logos/arrow.svg", rotation: 90 }
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

            // 修改分割线位置计算
            if (block.cutLine) {
                blockElements.push(
                    <rect
                        key={`${block.id}-cutline`}
                        x={xPos + blockWidth - 2.5}  // 使用当前块的实际宽度
                        y={10}
                        width={5}
                        height={108}
                        fill="#fff017"
                    />
                );
            }

            return blockElements;
        });

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

    const downloadPNG = async () => {
        if (!svgRef.current) return;
      
        const svg = svgRef.current;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
      
        if (!ctx) return;
      
        // 使用 SVG 的实际宽度和高度
        canvas.width = svg.width.baseVal.value;
        canvas.height = svg.height.baseVal.value;
      
        // 填充背景色
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      
        // 创建 SVG 图像
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        
        // 等待图像加载
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // 即使出错也继续
        });
      
        // 绘制 SVG
        ctx.drawImage(img, 0, 0);
      
        // 处理旋转的图像
        const images = svg.querySelectorAll('image');
        let imagesToLoad = images.length;
        
        if (imagesToLoad === 0) {
          // 没有额外图像，直接下载
          downloadCanvas(canvas);
          return;
        }
      
        // 加载所有图像并绘制
        for (const imgElement of images) {
          const imgSrc = imgElement.getAttribute('href') || '';
          const imgTag = new Image();
          imgTag.crossOrigin = 'Anonymous'; // 处理跨域问题
          
          await new Promise((resolve) => {
            imgTag.onload = resolve;
            imgTag.onerror = resolve; // 即使出错也继续
            imgTag.src = imgSrc;
          });
      
          // 安全获取属性值并转换为数字
          const getNum = (attr: string | null, def = 0): number => {
            return attr ? parseFloat(attr) : def;
          };
      
          const x = getNum(imgElement.getAttribute('x'));
          const y = getNum(imgElement.getAttribute('y'));
          const width = getNum(imgElement.getAttribute('width'));
          const height = getNum(imgElement.getAttribute('height'));
          
          // 处理旋转
          const transform = imgElement.getAttribute('transform');
          if (transform && transform.includes('rotate')) {
            const rotateMatch = transform.match(/rotate\(([^,]+),([^,]+),([^)]+)\)/);
            if (rotateMatch) {
              const rotationAngle = parseFloat(rotateMatch[1]);
              const centerX = parseFloat(rotateMatch[2]);
              const centerY = parseFloat(rotateMatch[3]);
              
              ctx.save();
              ctx.translate(centerX, centerY);
              ctx.rotate(rotationAngle * Math.PI / 180);
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
          if (imagesToLoad === 0) {
            downloadCanvas(canvas);
          }
        }
      
        // 下载 Canvas 内容
        function downloadCanvas(canvas: HTMLCanvasElement) {
          const link = document.createElement('a');
          link.download = 'metro-sign.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      };

    return (
        <div className="metro-sign-generator">
            <b>Notice: This tool don't support English.</b>
            <h2>标志预览</h2>
            <div className="preview-container">
                <SvgPreview />
            </div>
            <div className="container">
                <div className="controls">
                    <div className="actions">
                        <button onClick={addBlock} className="add-btn">
                            + 添加新块
                        </button>
                        <button onClick={downloadPNG} className="download-btn">
                            下载PNG
                        </button>
                        <div className="bg-color">
                            <label>背景颜色：</label>
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="blocks-container">
                        {blocks.map(block => renderBlock(block))}
                    </div>
                </div>

                {/* <div className="preview">
                    
                </div> */}
            </div>
            <footer>
                <h6 style={{ "color": "gray" }}>部分素材来自<a style={{ "color": "gray" }} href="https://centralgo.site/vitool/">https://centralgo.site/vitool/</a>，如有侵权请联系删除</h6>
            </footer>
        </div>

    );
};

export default MetroSignGenerator;