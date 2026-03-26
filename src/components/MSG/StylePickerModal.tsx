import React, { useMemo, useState } from 'react';
import { Input, Modal, Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
    BLOCK_ALIGN_CONFIG_KEY,
    createBlock,
    getBlockSpecialStyleStorageKey,
    getBlockWidth,
    getStyleSystemsForStyle,
    getStyleLabel,
    hasSpecialStyleKey,
    isStyleAvailableInSystem,
    renderBlockSVG,
    styleSystemOptions,
    styleGroups,
} from './configs';

type Props = {
    opened: boolean;
    onClose: () => void;
    title: string;
    activeStyle?: string | null;
    onSelectStyle: (style: string) => void;
    layout?: 'list' | 'preview-grid';
};

const PREVIEW_TILE_SIZE = 64;

const StylePreviewTile: React.FC<{
    style: string;
    label: string;
    active: boolean;
    onSelect: (style: string) => void;
}> = ({ style, label, active, onSelect }) => {
    const block = useMemo(() => {
        const created = createBlock(1, style);
        const blockAlignKey = getBlockSpecialStyleStorageKey(created, BLOCK_ALIGN_CONFIG_KEY);
        if (hasSpecialStyleKey(style, BLOCK_ALIGN_CONFIG_KEY) && blockAlignKey) {
            created.specialStyles[blockAlignKey] = 'true';
        }
        return created;
    }, [style]);

    const blockWidth = getBlockWidth(block);
    const svgWidth = Math.max(PREVIEW_TILE_SIZE, blockWidth + 24);
    const renderX = Math.max(12, (svgWidth - blockWidth) / 2);
    const svgElements = renderBlockSVG(block, renderX, blockWidth);

    return (
        <button
            type="button"
            className={`style-picker-card${active ? ' is-active' : ''}`}
            onClick={() => onSelect(style)}
        >
            <div className="style-picker-card-preview">
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${svgWidth} 128`}
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <rect x="0" y="0" width={svgWidth} height="128" fill="#041c31" rx="8" ry="8" />
                    {svgElements}
                </svg>
            </div>
            <div className="style-picker-card-label">{label}</div>
        </button>
    );
};

const StylePickerModal: React.FC<Props> = ({
    opened,
    onClose,
    title,
    activeStyle = null,
    onSelectStyle,
    layout = 'list',
}) => {
    const { t } = useTranslation();
    const [styleSearch, setStyleSearch] = useState('');
    const [selectedStyleSystem, setSelectedStyleSystem] = useState(styleSystemOptions[0]?.id ?? 'beijing-subway-new');

    React.useEffect(() => {
        if (!opened) {
            return;
        }

        const preferredSystem = activeStyle ? getStyleSystemsForStyle(activeStyle)[0] : styleSystemOptions[0]?.id;
        if (preferredSystem) {
            setSelectedStyleSystem(preferredSystem);
        }
    }, [activeStyle, opened]);

    const filteredStyleGroups = useMemo(() => {
        const keyword = styleSearch.trim().toLowerCase();
        return styleGroups
            .map(group => ({
                ...group,
                styles: group.styles.filter(style => {
                    if (!isStyleAvailableInSystem(style, selectedStyleSystem)) {
                        return false;
                    }
                    if (!keyword) return true;
                    const translatedMatch = getStyleLabel(style, t).toLowerCase().includes(keyword);
                    const styleMatch = style.toLowerCase().includes(keyword);
                    return translatedMatch || styleMatch;
                }),
            }))
            .filter(group => group.styles.length > 0);
    }, [selectedStyleSystem, styleSearch, t]);

    return (
        <Modal
            opened={opened}
            onClose={() => {
                setStyleSearch('');
                onClose();
            }}
            title={
                <div className="style-picker-titlebar">
                    <span>{title}</span>
                    <Select
                        size="xs"
                        value={selectedStyleSystem}
                        onChange={value => {
                            if (value) {
                                setSelectedStyleSystem(value as typeof selectedStyleSystem);
                            }
                        }}
                        data={styleSystemOptions.map(option => ({
                            value: option.id,
                            label: t(option.labelKey),
                        }))}
                        aria-label={t('blocks.styles.system_filter')}
                        className="style-picker-system-select"
                        allowDeselect={false}
                    />
                </div>
            }
            centered
            size={layout === 'preview-grid' ? 'calc(100vw - 32px)' : 'lg'}
            classNames={
                layout === 'preview-grid'
                    ? {
                          content: 'style-picker-modal-content',
                          body: 'style-picker-modal-body',
                      }
                    : undefined
            }
        >
            <Input
                value={styleSearch}
                onChange={event => setStyleSearch(event.target.value)}
                placeholder={t('blocks.styles.search_placeholder')}
                mb="md"
            />
            <div className="style-picker-list">
                {filteredStyleGroups.map(group => (
                    <div key={group.titleKey} className="style-picker-group">
                        <h4>{t(group.titleKey)}</h4>
                        <div className={layout === 'preview-grid' ? 'style-picker-cards' : 'style-picker-items'}>
                            {group.styles.map(style => (
                                <React.Fragment key={style}>
                                    {layout === 'preview-grid' ? (
                                        <StylePreviewTile
                                            style={style}
                                            label={getStyleLabel(style, t)}
                                            active={activeStyle === style}
                                            onSelect={selectedStyle => {
                                                onSelectStyle(selectedStyle);
                                                setStyleSearch('');
                                            }}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className={`style-picker-item${activeStyle === style ? ' is-active' : ''}`}
                                            onClick={() => {
                                                onSelectStyle(style);
                                                setStyleSearch('');
                                            }}
                                        >
                                            <span>{getStyleLabel(style, t)}</span>
                                            {activeStyle === style && (
                                                <span className="style-picker-current">
                                                    {t('blocks.styles.current_style')}
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ))}
                {filteredStyleGroups.length === 0 && (
                    <div className="style-picker-empty">{t('blocks.styles.no_style_results')}</div>
                )}
            </div>
        </Modal>
    );
};

export default StylePickerModal;
