import React from 'react';
import { JSX } from 'react/jsx-runtime';
import { BlockData, getBlockRenderX, getBlockWidth, renderBlockSVG } from './configs';
import { DraggableSvgBlock } from './drag';

type Props = {
    blocks: BlockData[];
    backgroundColor: string;
    svgRef: React.RefObject<SVGSVGElement | null>;
    selectedBlockId: number | null;
    moveCard: (fromIndex: number, toIndex: number) => void;
    onSelectBlock: (id: number) => void;
};

const MetroSignPreview: React.FC<Props> = ({
    blocks,
    backgroundColor,
    svgRef,
    selectedBlockId,
    moveCard,
    onSelectBlock,
}) => {
    const blockPositions = blocks.reduce((positions, block, index) => {
        const prevPosition = positions[index - 1] || 0;
        const blockWidth = getBlockWidth(block);
        return [...positions, prevPosition + blockWidth];
    }, [] as number[]);

    const svgWidth = blockPositions[blockPositions.length - 1] || 0;
    let currentX = 0;

    const svgElements = blocks.map((block, index) => {
        const blockElements: JSX.Element[] = [];
        const blockWidth = getBlockWidth(block);
        const xPos = currentX;
        currentX += blockWidth;
        const renderX = getBlockRenderX(block, xPos, blockWidth, svgWidth);

        const elems = renderBlockSVG(block, renderX, blockWidth);
        blockElements.push(...(elems as JSX.Element[]));

        if (block.cutLine) {
            blockElements.push(
                <rect
                    key={`${block.id}-cutline`}
                    x={renderX + blockWidth - 2.5}
                    y={10}
                    width={5}
                    height={108}
                    fill="#fff017"
                />
            );
        }

        return (
            <DraggableSvgBlock
                key={block.id}
                data={block}
                index={index}
                moveCard={moveCard}
                onSelect={onSelectBlock}
                isSelected={selectedBlockId === block.id}
            >
                <rect x={renderX} y={0} width={blockWidth} height={128} fill="transparent" />
                {blockElements}
            </DraggableSvgBlock>
        );
    });

    return (
        <svg
            ref={svgRef}
            width={svgWidth}
            height={128}
            viewBox={`0 0 ${svgWidth} 128`}
            xmlns="http://www.w3.org/2000/svg"
            style={{
                backgroundColor,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'pan-x pinch-zoom',
            }}
        >
            {svgElements}
        </svg>
    );
};

export default MetroSignPreview;
