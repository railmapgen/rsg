// SvgPreview.tsx
import React from 'react';
import { BlockData } from './types';
import { getBlockWidth } from './utils/utils';
import { arrowMap } from './configs';

interface SvgPreviewProps {
    blocks: BlockData[];
    backgroundColor: string;
    svgRef: React.RefObject<SVGSVGElement>;
}

/**
 * SVG预览子组件
 * 核心逻辑：
 * 1. 计算每个导视块的X坐标（累加宽度）
 * 2. 根据样式渲染对应的SVG元素（矩形、文本、图片、箭头等）
 * 3. 渲染分割线（若开启）
 */
export const SvgPreview: React.FC<SvgPreviewProps> = ({ blocks, backgroundColor, svgRef }) => {
    const blockPositions = blocks.reduce((positions, block, index) => {
        const prevPosition = positions[index - 1] || 0;
        const blockWidth = getBlockWidth(block.style);
        return [...positions, prevPosition + blockWidth];
    }, [] as number[]);

    // SVG总宽度（所有块宽度之和）
    const svgWidth = blockPositions[blockPositions.length - 1] || 0;
    let currentX = 0;

    const svgElements = blocks.flatMap(block => {
        const blockElements = [];
        const blockWidth = getBlockWidth(block.style);
        const xPos = currentX;
        currentX += blockWidth;

        const exit_align = block.specialStyles[`${block.id}-0`] || 'C';
        const lineNum = block.specialStyles[`${block.id}-0`] || '10';
        const lineColor = block.specialStyles[`${block.id}-1`] || '#00a3c2';
        const exitLetter = block.specialStyles[`${block.id}-0`] || 'A';
        const exitSubscript = block.specialStyles[`${block.id}-1`] || '';
        const exitChinese = block.specialStyles[`${block.id}-2`] || '蓝靛靛厂南路';
        const exitEnglish = block.specialStyles[`${block.id}-3`] || 'Landianchang South Rd.';
        const toChinese = block.specialStyles[`${block.id}-0`] || '';
        const toEnglish = block.specialStyles[`${block.id}-1`] || '';
        const align = block.specialStyles[`${block.id}-2`] || 'R';
        const lineType = block.specialStyles[`${block.id}-3`] || 'NM';
        let prefixChinese = '';
        let prefixEnglish = 'To';
        const centerX = xPos + blockWidth / 2;
        const rightX = xPos + blockWidth - 10;
        const leftX = xPos + 10;
        switch (block.style) {
            case 'Exit':
                if (exit_align === 'L') {
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
                if (exit_align === 'C') {
                    blockElements.push(
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
                    blockElements.push(
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
                break;

            case 'toilet':
                blockElements.push(
                    <image key={`${block.id}-image`} href="logos/toilet.svg" x={xPos} y={0} width={128} height={128} />
                );
                break;

            case 'blank1':
                break;

            case 'Line':
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

            case 'Line-space':
                blockElements.push(
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
                        {lineNum}
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
                        {parseInt(lineNum) >= 10 ? `Line ${lineNum}` : `Line ${lineNum}`}
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

            case 'ExitText':
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
                    <text key={`${block.id}-text2`} x={xPos + 98} y={107} fontFamily="Arial" fontSize={40} fill="white">
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

            case 'To':
                if (lineType === 'LOOP') {
                    prefixChinese = '下一站';
                } else if (lineType === 'T') {
                    prefixChinese = '终点站';
                    prefixEnglish = 'Terminus';
                } else {
                    prefixChinese = '开往';
                }
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

            case 'blank2':
                break;

            default:
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

        if (block.cutLine) {
            blockElements.push(
                <rect
                    key={`${block.id}-cutline`}
                    x={xPos + blockWidth - 2.5}
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
