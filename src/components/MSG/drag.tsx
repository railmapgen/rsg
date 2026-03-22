import React, { useCallback, useEffect, useRef } from 'react';
import { useDrag, useDragLayer, useDrop } from 'react-dnd';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BlockData, getBlockWidth, renderBlockSVG } from './configs';

const DRAG_TYPE = 'CARD';

type DragCardItem = {
    id: number;
    fromIndex: number;
    block: BlockData;
};

interface DraggableSvgBlockProps {
    data: BlockData;
    index: number;
    moveCard: (fromIndex: number, toIndex: number) => void;
    onSelect: (id: number) => void;
    isSelected: boolean;
    children?: React.ReactNode;
}

export const DraggableSvgBlock: React.FC<DraggableSvgBlockProps> = ({
    data,
    index,
    moveCard,
    onSelect,
    isSelected,
    children,
}) => {
    const processingTimer = useRef<NodeJS.Timeout | null>(null);
    const hoverRef = useRef<SVGGElement | null>(null);

    const [{ isDragging }, dragRef] = useDrag<DragCardItem, unknown, { isDragging: boolean }>({
        type: DRAG_TYPE,
        item: useCallback(
            () => ({
                fromIndex: index,
                id: data.id,
                block: data,
            }),
            [data, index]
        ),
        collect: monitor => ({
            isDragging: monitor.isDragging(),
        }),
        end: () => {
            if (processingTimer.current) {
                clearTimeout(processingTimer.current);
                processingTimer.current = null;
            }
        },
    });

    const [, dropRef] = useDrop<DragCardItem>({
        accept: DRAG_TYPE,
        hover: (draggedItem, monitor) => {
            const dragIndex = draggedItem.fromIndex;
            const hoverIndex = index;

            if (dragIndex === hoverIndex || processingTimer.current) return;

            const clientOffset = monitor.getClientOffset();
            const hoverTarget = hoverRef.current;
            if (!clientOffset || !hoverTarget) return;

            const rect = hoverTarget.getBoundingClientRect();
            const hoverMiddleX = rect.left + rect.width / 2;
            const pointerX = clientOffset.x;

            if (dragIndex < hoverIndex && pointerX < hoverMiddleX) return;
            if (dragIndex > hoverIndex && pointerX > hoverMiddleX) return;

            if (processingTimer.current) {
                clearTimeout(processingTimer.current);
            }

            processingTimer.current = setTimeout(() => {
                moveCard(dragIndex, hoverIndex);
                draggedItem.fromIndex = hoverIndex;
                processingTimer.current = null;
            }, 20);
        },
    });

    const bindRef = useCallback(
        (el: SVGGElement | null) => {
            hoverRef.current = el;
            dragRef(el);
            dropRef(el);
        },
        [dragRef, dropRef]
    );

    useEffect(() => {
        return () => {
            if (processingTimer.current) {
                clearTimeout(processingTimer.current);
            }
        };
    }, []);

    return (
        <g
            ref={bindRef}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={event => {
                event.stopPropagation();
                onSelect(data.id);
            }}
            style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                opacity: isDragging ? 0.2 : 1,
                filter: isSelected
                    ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.7)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.45))'
                    : undefined,
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            {children}
        </g>
    );
};

export const SvgDragLayer: React.FC = () => {
    const { isDragging, item, currentOffset, initialClientOffset, initialSourceClientOffset } = useDragLayer(
        monitor => ({
            item: monitor.getItem() as DragCardItem | null,
            currentOffset: monitor.getClientOffset(),
            initialClientOffset: monitor.getInitialClientOffset(),
            initialSourceClientOffset: monitor.getInitialSourceClientOffset(),
            isDragging: monitor.isDragging(),
        })
    );

    if (!isDragging || !item || !currentOffset) {
        return null;
    }

    const blockWidth = getBlockWidth(item.block);
    const anchorX =
        initialClientOffset && initialSourceClientOffset
            ? initialClientOffset.x - initialSourceClientOffset.x
            : blockWidth / 2;
    const anchorY =
        initialClientOffset && initialSourceClientOffset ? initialClientOffset.y - initialSourceClientOffset.y : 64;
    const svgElements = renderBlockSVG(item.block, 0, blockWidth);

    if (item.block.cutLine) {
        svgElements.push(
            <rect
                key={`${item.block.id}-cutline-preview`}
                x={blockWidth - 2.5}
                y={10}
                width={5}
                height={108}
                fill="#fff017"
            />
        );
    }

    const preview = (
        <div
            style={{
                position: 'fixed',
                left: currentOffset.x - anchorX,
                top: currentOffset.y - anchorY,
                pointerEvents: 'none',
                zIndex: 1000001,
                opacity: 0.95,
            }}
        >
            <svg width={blockWidth} height={128} viewBox={`0 0 ${blockWidth} 128`} xmlns="http://www.w3.org/2000/svg">
                {svgElements}
            </svg>
        </div>
    );

    return createPortal(preview, document.body);
};

interface DeleteZoneProps {
    onDrop: (id: number) => void;
}

export const DeleteZone: React.FC<DeleteZoneProps> = ({ onDrop }) => {
    const { t } = useTranslation();
    const [{ isOver, canDrop }, drop] = useDrop<DragCardItem, unknown, { isOver: boolean; canDrop: boolean }>({
        accept: DRAG_TYPE,
        drop: item => {
            onDrop(item.id);
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    const zoneStyle: React.CSSProperties = {
        width: 140,
        borderRadius: 8,
        border: '2px dashed #ff4d4f',
        backgroundColor: isOver ? '#ffecec' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff4d4f',
        fontWeight: 600,
        userSelect: 'none',
    };

    return (
        <div ref={drop as unknown as React.RefCallback<HTMLDivElement>} style={zoneStyle} aria-hidden={!canDrop}>
            {isOver ? t('main_area.release_to_delete') : t('main_area.drag_here_to_delete')}
        </div>
    );
};
