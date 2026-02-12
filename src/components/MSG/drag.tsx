import React, { useRef, useCallback, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { BlockData } from './configs';
import { getBlockWidth } from './utils/utils';
import { useTranslation } from 'react-i18next';

interface BlockProps {
    data: BlockData;
    index: number;
    moveCard: (fromIndex: number, toIndex: number) => void;
    children?: React.ReactNode;
}

const Card: React.FC<BlockProps> = ({ data, index, moveCard, children }) => {
    const processingTimer = useRef<NodeJS.Timeout | null>(null);
    const hoverRef = useRef<HTMLDivElement | null>(null);

    const [{ isDragging }, dragRef] = useDrag<
        { fromIndex: number; id: number; blockWidth: number },
        unknown,
        { isDragging: boolean }
    >({
        type: 'CARD',
        item: useCallback(
            () => ({
                fromIndex: index,
                id: data.id,
                blockWidth: data.style ? getBlockWidth(data.style) : 128,
            }),
            [index, data.id, data.style]
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

    const [, dropRef] = useDrop({
        accept: 'CARD',
        hover: (draggedItem: { fromIndex: number; id: number }, monitor) => {
            const dragIndex = draggedItem.fromIndex;
            const hoverIndex = index;

            if (dragIndex === hoverIndex || processingTimer.current) return;

            const clientOffset = monitor.getClientOffset();
            const hoverTarget = hoverRef.current;
            if (!clientOffset || !hoverTarget) return;

            const rect = hoverTarget.getBoundingClientRect();

            // 自动根据元素长宽判断横向或纵向列表
            const isHorizontal = rect.width > rect.height;

            // 使用水平判断或垂直判断
            const hoverMiddle = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
            const pointerPos = isHorizontal ? clientOffset.x : clientOffset.y;

            if (dragIndex < hoverIndex && pointerPos < hoverMiddle) return;
            if (dragIndex > hoverIndex && pointerPos > hoverMiddle) return;

            if (processingTimer.current) {
                clearTimeout(processingTimer.current);
            }

            processingTimer.current = setTimeout(() => {
                moveCard(dragIndex, hoverIndex);
                try {
                    // 更新拖拽对象索引，避免后续 hover 继续用旧索引触发重复交换
                    (draggedItem as { fromIndex: number }).fromIndex = hoverIndex;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {
                    // ignore
                }
                processingTimer.current = null;
            }, 20);
        },
    });

    const bindRef = useCallback(
        (el: HTMLDivElement | null) => {
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
        <div ref={bindRef} role="listitem" aria-grabbed={isDragging}>
            {children}
        </div>
    );
};

/**
 * 可拖入删除区组件
 * 使用：<DeleteZone onDrop={id => removeBlock(id)} />
 */
interface DeleteZoneProps {
    onDrop: (id: number) => void;
}

export const DeleteZone: React.FC<DeleteZoneProps> = ({ onDrop }) => {
    const { t } = useTranslation();
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: 'CARD',
        drop: (item: { id: number }) => {
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

export default Card;
export type { BlockProps };
