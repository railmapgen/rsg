import React, { useCallback, useEffect, useRef, useState } from 'react';
import './MetroSignGenerator.css';
import { ActionIcon, Button, Modal } from '@mantine/core';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useTranslation } from 'react-i18next';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { MdDeleteOutline } from 'react-icons/md';
import { PaletteIframe, PaletteModalHelper, Theme } from '../utils/PaletteModalHelper';
import {
    BlockData,
    BlockTheme,
    createBlock,
    getBlockWidth,
    getThemeSyncedSpecialStyles,
    hasSpecialStyleConfig,
    isThemeStyle,
    registerDefaultBlockTypes,
} from './configs';
import MetroSignBlockEditor from './MetroSignBlockEditor';
import MetroSignPreview from './MetroSignPreview';
import {
    DEFAULT_THEME,
    getInitialNextId,
    getNextBlockId,
    getThemeFromGlobals,
    loadLocalStorage,
    parseMetroSignImport,
    saveLocalStorage,
    serializeMetroSignData,
    syncThemeGlobals,
} from './metroSignShared';
import { DeleteZone, SvgDragLayer } from './drag';
import StylePickerModal from './StylePickerModal';
import {
    ADD_BLOCK_EVENT,
    DELETE_SELECTED_BLOCK_EVENT,
    EXPORT_ACTION_EVENT,
    ExportAction,
    MOVE_SELECTED_BLOCK_EVENT,
    MOVE_SELECTED_BLOCK_STATE_EVENT,
} from './windowEvents';

const MetroSignGenerator: React.FC = () => {
    const { t } = useTranslation();
    const initialBlocksRef = useRef<BlockData[] | null>(null);
    if (initialBlocksRef.current === null) {
        initialBlocksRef.current = loadLocalStorage();
    }
    const initialBlocks = initialBlocksRef.current;

    const [isOpen, setIsOpen] = useState(false);
    const [activeThemeBlockId, setActiveThemeBlockId] = useState<number | null>(null);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
    const [, setConfirmedColor] = useState<Theme | null>([
        DEFAULT_THEME.city,
        DEFAULT_THEME.line,
        DEFAULT_THEME.color,
        DEFAULT_THEME.textColor,
    ]);
    const [blocks, setBlocks] = useState<BlockData[]>(initialBlocks);
    const [nextId, setNextId] = useState(getInitialNextId(initialBlocks));
    const [backgroundColor, setBackgroundColor] = useState('#041c31');

    const paletteHelper = useRef(new PaletteModalHelper());
    const svgRef = useRef<SVGSVGElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const sliderTrackRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewOffset, setPreviewOffset] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isDraggingScroll, setIsDraggingScroll] = useState(false);

    const toThemeTuple = (theme: BlockTheme): Theme => [theme.city, theme.line, theme.color, theme.textColor];

    const totalSvgWidth = blocks.reduce((sum, block) => sum + getBlockWidth(block), 0);
    const maxPreviewOffset = Math.max(totalSvgWidth - containerWidth, 0);

    const updateContainerWidth = useCallback(() => {
        const width = previewContainerRef.current?.clientWidth ?? 0;
        setContainerWidth(width);
    }, []);

    useEffect(() => {
        updateContainerWidth();
        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => {
                updateContainerWidth();
            });
            if (previewContainerRef.current) {
                observer.observe(previewContainerRef.current);
            }
        }
        window.addEventListener('resize', updateContainerWidth);
        return () => {
            if (observer) {
                observer.disconnect();
            }
            window.removeEventListener('resize', updateContainerWidth);
        };
    }, [updateContainerWidth]);

    const handleScrollTrack = useCallback(
        (clientX: number) => {
            if (maxPreviewOffset <= 0) {
                setPreviewOffset(0);
                return;
            }

            const track = sliderTrackRef.current;
            if (!track) return;

            const { left, width } = track.getBoundingClientRect();
            if (width <= 0) return;

            const ratio = Math.min(Math.max((clientX - left) / width, 0), 1);
            setPreviewOffset(ratio * maxPreviewOffset);
        },
        [maxPreviewOffset]
    );

    const viewportPercent = totalSvgWidth > 0 ? Math.min(100, (containerWidth / totalSvgWidth) * 100) : 100;
    const thumbWidthPercent = Math.max(8, viewportPercent);
    const thumbRangePercent = Math.max(100 - thumbWidthPercent, 0);
    const thumbLeftPercent = maxPreviewOffset > 0 ? (previewOffset / maxPreviewOffset) * thumbRangePercent : 0;
    const showScrollbar = maxPreviewOffset > 0;

    useEffect(() => {
        if (previewOffset > maxPreviewOffset) {
            setPreviewOffset(maxPreviewOffset);
        }
    }, [maxPreviewOffset, previewOffset]);

    useEffect(() => {
        if (maxPreviewOffset === 0 && previewOffset !== 0) {
            setPreviewOffset(0);
        }
    }, [maxPreviewOffset, previewOffset]);

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            if (!isDraggingScroll) return;
            handleScrollTrack(event.clientX);
        };

        const handlePointerUp = () => {
            if (isDraggingScroll) {
                setIsDraggingScroll(false);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [handleScrollTrack, isDraggingScroll]);

    useEffect(() => {
        saveLocalStorage(serializeMetroSignData(blocks, backgroundColor, getThemeFromGlobals()));
    }, [blocks, backgroundColor]);

    useEffect(() => {
        const handleMoveSelectedBlock = (event: Event) => {
            const customEvent = event as CustomEvent<{ direction?: 'left' | 'right' }>;
            const direction = customEvent.detail?.direction;

            if (direction !== 'left' && direction !== 'right') {
                return;
            }

            setBlocks(prevBlocks => {
                const selectedIndex = prevBlocks.findIndex(block => block.collapsed);
                if (selectedIndex === -1) {
                    return prevBlocks;
                }

                const targetIndex = direction === 'left' ? selectedIndex - 1 : selectedIndex + 1;
                if (targetIndex < 0 || targetIndex >= prevBlocks.length) {
                    return prevBlocks;
                }

                const nextBlocks = [...prevBlocks];
                const [selectedBlock] = nextBlocks.splice(selectedIndex, 1);
                nextBlocks.splice(targetIndex, 0, selectedBlock);
                return nextBlocks;
            });
        };

        const handleDeleteSelectedBlock = () => {
            setBlocks(prevBlocks => {
                const selectedIndex = prevBlocks.findIndex(block => block.collapsed);
                if (selectedIndex < 0) {
                    return prevBlocks;
                }

                const nextBlocks = prevBlocks.filter((_, index) => index !== selectedIndex);
                if (nextBlocks.length === 0) {
                    return [];
                }

                if (nextBlocks.some(block => block.collapsed)) {
                    return nextBlocks;
                }

                return nextBlocks.map((block, index) => ({
                    ...block,
                    collapsed: index === Math.max(0, selectedIndex - 1),
                }));
            });
        };

        window.addEventListener(MOVE_SELECTED_BLOCK_EVENT, handleMoveSelectedBlock as EventListener);
        window.addEventListener(DELETE_SELECTED_BLOCK_EVENT, handleDeleteSelectedBlock as EventListener);
        return () => {
            window.removeEventListener(MOVE_SELECTED_BLOCK_EVENT, handleMoveSelectedBlock as EventListener);
            window.removeEventListener(DELETE_SELECTED_BLOCK_EVENT, handleDeleteSelectedBlock as EventListener);
        };
    }, []);

    useEffect(() => {
        const handleAddBlockRequest = () => {
            setIsAddBlockModalOpen(true);
        };

        const handleExportAction = (event: Event) => {
            const customEvent = event as CustomEvent<{ action?: ExportAction }>;

            switch (customEvent.detail?.action) {
                case 'png':
                    void downloadPNG();
                    break;
                case 'svg':
                    void downloadSVG();
                    break;
                case 'json':
                    downloadJSON();
                    break;
                case 'import-json':
                    importJSON();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener(ADD_BLOCK_EVENT, handleAddBlockRequest as EventListener);
        window.addEventListener(EXPORT_ACTION_EVENT, handleExportAction as EventListener);
        return () => {
            window.removeEventListener(ADD_BLOCK_EVENT, handleAddBlockRequest as EventListener);
            window.removeEventListener(EXPORT_ACTION_EVENT, handleExportAction as EventListener);
        };
    }, []);

    useEffect(() => {
        const selectedIndex = blocks.findIndex(block => block.collapsed);
        window.dispatchEvent(
            new CustomEvent(MOVE_SELECTED_BLOCK_STATE_EVENT, {
                detail: {
                    canMoveLeft: selectedIndex > 0,
                    canMoveRight: selectedIndex !== -1 && selectedIndex < blocks.length - 1,
                    canDeleteSelected: selectedIndex !== -1,
                },
            })
        );
    }, [blocks]);

    const updateBlockTheme = (id: number, theme: BlockTheme) => {
        setBlocks(prevBlocks =>
            prevBlocks.map(block =>
                block.id === id
                    ? {
                          ...block,
                          theme,
                          specialStyles: getThemeSyncedSpecialStyles(block.style, id, theme, block.specialStyles),
                      }
                    : block
            )
        );
    };

    const handleOpen = (blockId: number, initialTheme: BlockTheme) => {
        setActiveThemeBlockId(blockId);
        setConfirmedColor(toThemeTuple(initialTheme));
        setIsOpen(true);

        paletteHelper.current.init({
            onSelect: paletteTheme => {
                const nextTheme: BlockTheme = {
                    city: String(paletteTheme[0]),
                    line: String(paletteTheme[1]),
                    color: String(paletteTheme[2]),
                    textColor: paletteTheme[3] === '#000' ? '#000' : '#fff',
                };
                setConfirmedColor(toThemeTuple(nextTheme));
                updateBlockTheme(blockId, nextTheme);
                syncThemeGlobals(nextTheme);
                setIsOpen(false);
                setActiveThemeBlockId(null);
                paletteHelper.current.destroy();
            },
            onClose: () => {
                setIsOpen(false);
                setActiveThemeBlockId(null);
                paletteHelper.current.destroy();
            },
        });

        paletteHelper.current.sendDefaultTheme(toThemeTuple(initialTheme));
    };

    const addBlock = (style?: string) => {
        const id = getNextBlockId(nextId);
        setBlocks(prevBlocks => [
            ...prevBlocks.map(block => ({ ...block, collapsed: false })),
            { ...createBlock(id, style), collapsed: true },
        ]);
        setNextId(id + 1);
    };

    const clearBlocks = () => {
        setBlocks([]);
    };

    const selectBlock = (id: number) => {
        setBlocks(prevBlocks => {
            const isAlreadySelected = prevBlocks.some(block => block.id === id && block.collapsed);
            return prevBlocks.map(block => ({
                ...block,
                collapsed: isAlreadySelected ? false : block.id === id,
            }));
        });
    };

    const clearSelectedBlock = () => {
        setBlocks(prevBlocks => prevBlocks.map(block => ({ ...block, collapsed: false })));
    };

    const createExportSvgClone = (svgElement: SVGSVGElement) => {
        const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
        clonedSvg.querySelectorAll('[data-selected="true"]').forEach(node => {
            const element = node as SVGElement;
            element.style.filter = '';
            element.setAttribute('data-selected', 'false');
        });
        return clonedSvg;
    };

    const removeBlock = (id: number) => {
        setBlocks(prevBlocks => {
            const nextBlocks = prevBlocks.filter(block => block.id !== id);
            if (nextBlocks.length === 0) {
                return [];
            }

            if (nextBlocks.some(block => block.collapsed)) {
                return nextBlocks;
            }

            return nextBlocks.map((block, index) => ({ ...block, collapsed: index === 0 }));
        });
    };

    const moveCard = useCallback((fromIndex: number, toIndex: number) => {
        setBlocks(prevBlocks => {
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= prevBlocks.length || toIndex >= prevBlocks.length) {
                return prevBlocks;
            }

            const nextBlocks = [...prevBlocks];
            const [movedBlock] = nextBlocks.splice(fromIndex, 1);
            nextBlocks.splice(toIndex, 0, movedBlock);
            return nextBlocks;
        });
    }, []);

    const updateBlockStyle = (id: number, style: string) => {
        setBlocks(prevBlocks =>
            prevBlocks.map(block => {
                if (block.id !== id) {
                    return block;
                }

                const nextBlock = createBlock(id, style, getThemeFromGlobals());
                return {
                    ...block,
                    ...nextBlock,
                    cutLine: block.cutLine,
                    collapsed: block.collapsed,
                    dragId: block.dragId,
                    specialStyles: hasSpecialStyleConfig(style) ? nextBlock.specialStyles : {},
                    theme: isThemeStyle(style) ? nextBlock.theme : undefined,
                };
            })
        );
    };

    const updateBlockCutLine = (id: number, cutLine: boolean) => {
        setBlocks(prevBlocks => prevBlocks.map(block => (block.id === id ? { ...block, cutLine } : block)));
    };

    const updateSpecialStyle = (id: number, key: string, value: string) => {
        setBlocks(prevBlocks =>
            prevBlocks.map(block =>
                block.id === id ? { ...block, specialStyles: { ...block.specialStyles, [key]: value } } : block
            )
        );
    };

    const downloadJSON = () => {
        try {
            const payload = serializeMetroSignData(blocks, backgroundColor, getThemeFromGlobals());
            const blob = new Blob([JSON.stringify(payload, null, 4)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'blocks-data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error：', error);
            alert(`Error：${(error as Error).message}`);
        }
    };

    const downloadPNG = async () => {
        if (!svgRef.current) return;

        const svg = svgRef.current;
        const clonedSvg = createExportSvgClone(svg);
        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = svg.width.baseVal.value;
        canvas.height = svg.height.baseVal.value;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

        await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        ctx.drawImage(img, 0, 0);

        const images = clonedSvg.querySelectorAll('image');
        let imagesToLoad = images.length;
        if (imagesToLoad === 0) {
            downloadCanvas(canvas);
            return;
        }

        for (const imgElement of images) {
            const imgSrc = imgElement.getAttribute('href') || '';
            const imgTag = new Image();
            imgTag.crossOrigin = 'Anonymous';

            await new Promise(resolve => {
                imgTag.onload = resolve;
                imgTag.onerror = resolve;
                imgTag.src = imgSrc;
            });

            const getNum = (attr: string | null, def = 0): number => (attr ? parseFloat(attr) : def);
            const x = getNum(imgElement.getAttribute('x'));
            const y = getNum(imgElement.getAttribute('y'));
            const width = getNum(imgElement.getAttribute('width'));
            const height = getNum(imgElement.getAttribute('height'));

            const transform = imgElement.getAttribute('transform');
            if (transform && transform.includes('rotate')) {
                const rotateMatch = transform.match(/rotate\(([^ ]+) ([^ ]+) ([^)]+)\)/);
                if (rotateMatch) {
                    const rotationAngle = parseFloat(rotateMatch[1]);
                    const centerX = parseFloat(rotateMatch[2]);
                    const centerY = parseFloat(rotateMatch[3]);
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate((rotationAngle * Math.PI) / 180);
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

        function downloadCanvas(targetCanvas: HTMLCanvasElement) {
            const link = document.createElement('a');
            link.download = 'metro-sign.png';
            link.href = targetCanvas.toDataURL('image/png');
            link.click();
        }
    };

    const downloadSVG = async () => {
        const svgElement = svgRef.current;
        if (!svgElement) {
            console.error('未找到SVG元素，请确认svgRef已正确绑定');
            alert('Error');
            return;
        }

        const convertToBase64 = async (url: string, mimeType: string): Promise<string> => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`资源下载失败：${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                return `data:${mimeType};base64,${base64}`;
            } catch (error) {
                console.warn(`资源(${url})转Base64失败，保留原链接：`, error);
                return url;
            }
        };

        try {
            const clonedSvg = createExportSvgClone(svgElement);
            if (!clonedSvg.hasAttribute('xmlns')) {
                clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }

            const imageNodes = clonedSvg.querySelectorAll('image');
            for (const img of imageNodes) {
                const imgUrl = img.getAttribute('xlink:href') || img.getAttribute('href');
                if (!imgUrl || imgUrl.startsWith('data:')) continue;

                const mimeType = imgUrl.endsWith('png')
                    ? 'image/png'
                    : imgUrl.endsWith('jpg') || imgUrl.endsWith('jpeg')
                      ? 'image/jpeg'
                      : imgUrl.endsWith('svg')
                        ? 'image/svg+xml'
                        : 'image/png';

                const base64Url = await convertToBase64(imgUrl, mimeType);
                img.setAttribute('href', base64Url);
                img.removeAttribute('xlink:href');
            }

            const styleNodes = clonedSvg.querySelectorAll('style');
            for (const style of styleNodes) {
                let cssText = style.textContent || '';
                const fontUrlRegex = /@font-face\s*{[^}]*url\(['"]?([^'")]+)['"]?\)[^}]*}/g;
                const fontMatches = [...cssText.matchAll(fontUrlRegex)];

                for (const match of fontMatches) {
                    const fontUrl = match[1];
                    if (!fontUrl || fontUrl.startsWith('data:')) continue;

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

            const svgString = `<?xml version="1.0" encoding="UTF-8"?>
${new XMLSerializer().serializeToString(clonedSvg)}`;
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const downloadLink = document.createElement('a');
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = 'subway-sign.svg';
            document.body.appendChild(downloadLink);
            downloadLink.click();
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
                const { normalized, backgroundColor: importedBackgroundColor } = parseMetroSignImport(content);
                setBlocks(normalized.blocks);
                setNextId(normalized.maxId + 1);
                if (importedBackgroundColor) {
                    setBackgroundColor(importedBackgroundColor);
                }
                setConfirmedColor([
                    normalized.firstTheme.city,
                    normalized.firstTheme.line,
                    normalized.firstTheme.color,
                    normalized.firstTheme.textColor,
                ]);
            } catch (error) {
                console.error('Failed to import JSON：', error);
                alert(`Failed to import JSON：${(error as Error).message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const paletteFrameUrl = paletteHelper.current.getIframeUrl(rmgRuntime.getAppName());

    return (
        <div className="metro-sign-generator">
            <DndProvider
                backend={TouchBackend}
                options={{
                    enableMouseEvents: true,
                    ignoreContextMenu: true,
                }}
            >
                <SvgDragLayer />
                <div ref={previewContainerRef} className="preview-container" onClick={clearSelectedBlock}>
                    <div className="preview-viewport">
                        <div className="preview-track" style={{ transform: `translateX(${-previewOffset}px)` }}>
                            <MetroSignPreview
                                blocks={blocks}
                                backgroundColor={backgroundColor}
                                svgRef={svgRef}
                                selectedBlockId={blocks.find(block => block.collapsed)?.id ?? null}
                                moveCard={moveCard}
                                onSelectBlock={selectBlock}
                            />
                            <div className="preview-track-spacer" />
                        </div>
                    </div>
                    {showScrollbar && (
                        <div
                            ref={sliderTrackRef}
                            className="preview-scrollbar"
                            onPointerDown={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleScrollTrack(event.clientX);
                                setIsDraggingScroll(true);
                            }}
                        >
                            <div className="preview-scrollbar-track">
                                <div
                                    className="preview-scrollbar-thumb"
                                    style={{
                                        width: `${thumbWidthPercent}%`,
                                        left: `${thumbLeftPercent}%`,
                                    }}
                                    onPointerDown={event => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        setIsDraggingScroll(true);
                                        handleScrollTrack(event.clientX);
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="placeholder"></div>
                <div className="container">
                    <div className="controls">
                        <div className="actions">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/json,.json"
                                style={{ display: 'none' }}
                                onChange={handleImportJSON}
                            />
                            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                                <DeleteZone onDrop={removeBlock} />
                                <ActionIcon
                                    color="red"
                                    variant="light"
                                    size="lg"
                                    aria-label={t('main_area.delete_all')}
                                    onClick={() => setIsDeleteAllOpen(true)}
                                >
                                    <MdDeleteOutline size={18} />
                                </ActionIcon>
                            </div>
                            <div className="bg-color">
                                <label>{t('main_area.background_color')}：</label>
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={e => setBackgroundColor(e.target.value)}
                                />
                            </div>
                        </div>

                        <MetroSignBlockEditor
                            blocks={blocks}
                            onUpdateBlockStyle={updateBlockStyle}
                            onUpdateBlockCutLine={updateBlockCutLine}
                            onUpdateSpecialStyle={updateSpecialStyle}
                            onOpenTheme={handleOpen}
                            getThemeFromGlobals={getThemeFromGlobals}
                        />
                    </div>
                </div>
            </DndProvider>

            <PaletteIframe url={paletteFrameUrl} visible={isOpen && activeThemeBlockId !== null} />
            <StylePickerModal
                opened={isAddBlockModalOpen}
                onClose={() => setIsAddBlockModalOpen(false)}
                title={t('blocks.styles.select_new_style')}
                layout="preview-grid"
                onSelectStyle={style => {
                    addBlock(style);
                    setIsAddBlockModalOpen(false);
                }}
            />
            <Modal
                opened={isDeleteAllOpen}
                onClose={() => setIsDeleteAllOpen(false)}
                title={t('main_area.delete_all')}
                centered
            >
                <p style={{ marginTop: 0 }}>{t('main_area.confirm_delete_all')}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button variant="default" onClick={() => setIsDeleteAllOpen(false)}>
                        {t('useful.cancel')}
                    </Button>
                    <Button
                        color="red"
                        onClick={() => {
                            clearBlocks();
                            setIsDeleteAllOpen(false);
                        }}
                    >
                        {t('main_area.delete_all')}
                    </Button>
                </div>
            </Modal>

            <footer>
                <h6 style={{ color: 'gray' }}>
                    {t('copy').split('https://centralgo.site/vitool/')[0]}
                    <a style={{ color: 'gray' }}>https://centralgo.site/vitool/</a>
                    {t('copy').split('https://centralgo.site/vitool/')[1]}
                </h6>
            </footer>
        </div>
    );
};

export default MetroSignGenerator;

registerDefaultBlockTypes();
