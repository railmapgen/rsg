import React, { useEffect, useState } from 'react';
import { Button, Input } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import {
    BlockData,
    BlockTheme,
    BLOCK_ALIGN_CONFIG_KEY,
    getBaseBlockWidth,
    getBlockSpecialStyleStorageKey,
    getDefaultBlockTheme,
    getSpecialStyleDefaultValue,
    getSpecialStyleValueByKey,
    getStyleLabel,
    hasSpecialStyleConfig,
    hasSpecialStyleKey,
    MANUAL_WIDTH_CONFIG_KEY,
    specialStyleConfigs,
} from './configs';
import StylePickerModal from './StylePickerModal';

type Props = {
    blocks: BlockData[];
    onUpdateBlockStyle: (id: number, style: string) => void;
    onUpdateBlockCutLine: (id: number, cutLine: boolean) => void;
    onUpdateSpecialStyle: (id: number, key: string, value: string) => void;
    onOpenTheme: (blockId: number, initialTheme: BlockTheme) => void;
    getThemeFromGlobals: () => BlockTheme;
};

const MANUAL_WIDTH_MIN = 128;
const MANUAL_WIDTH_MAX = 740;

const clampManualWidth = (value: number, minWidth: number) =>
    Math.min(MANUAL_WIDTH_MAX, Math.max(minWidth, Math.round(value)));
const sliderValueToWidth = (value: number, minWidth: number) => String(clampManualWidth(value, minWidth));

const MetroSignBlockEditor: React.FC<Props> = ({
    blocks,
    onUpdateBlockStyle,
    onUpdateBlockCutLine,
    onUpdateSpecialStyle,
    onOpenTheme,
    getThemeFromGlobals,
}) => {
    const { t } = useTranslation();
    const activeBlock = blocks.find(block => block.collapsed);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const activeBlockId = activeBlock?.id ?? -1;
    const manualWidthValue = activeBlock ? getSpecialStyleValueByKey(activeBlock, MANUAL_WIDTH_CONFIG_KEY, '') : '';
    const [manualWidthDraft, setManualWidthDraft] = useState(manualWidthValue);

    useEffect(() => {
        setManualWidthDraft(manualWidthValue);
    }, [activeBlockId, manualWidthValue]);

    const getStoredValue = (block: BlockData, key: string, legacyKey: string, fallback: string) => {
        if (Object.prototype.hasOwnProperty.call(block.specialStyles, key)) {
            return block.specialStyles[key];
        }
        if (Object.prototype.hasOwnProperty.call(block.specialStyles, legacyKey)) {
            return block.specialStyles[legacyKey];
        }
        return fallback;
    };

    const getRenderableSpecialConfigs = (block: BlockData) =>
        (specialStyleConfigs[block.style] || []).filter(
            config => config.key !== MANUAL_WIDTH_CONFIG_KEY && config.key !== BLOCK_ALIGN_CONFIG_KEY
        );

    const renderSpecialInputs = (block: BlockData) => {
        const configs = getRenderableSpecialConfigs(block);

        return configs.map(config => {
            const originalIndex = (specialStyleConfigs[block.style] || []).findIndex(item => item === config);
            const key = `${block.id}-${originalIndex}`;
            const legacyKey = `${block.dragId}-${originalIndex}`;
            const value = getStoredValue(block, key, legacyKey, getSpecialStyleDefaultValue(config));

            if (config.type === 'text') {
                return (
                    <div key={key} className="special-input">
                        <label>{t(config.label)}:</label>
                        <Input
                            type="text"
                            value={value}
                            placeholder={getSpecialStyleDefaultValue(config)}
                            maxLength={config.maxLength}
                            onChange={e => onUpdateSpecialStyle(block.id, key, e.target.value)}
                        />
                    </div>
                );
            }

            if (config.type === 'number') {
                return (
                    <div key={key} className="special-input">
                        <label>{t(config.label)}:</label>
                        <Input
                            type="number"
                            value={value}
                            placeholder={getSpecialStyleDefaultValue(config)}
                            onChange={e => onUpdateSpecialStyle(block.id, key, e.target.value)}
                        />
                    </div>
                );
            }

            if (config.type === 'radio' && config.options) {
                return (
                    <div key={key} className="special-input">
                        <label>{t(config.label)}:</label>
                        <div className="radio-group">
                            {config.options.map(option => (
                                <label key={option.value}>
                                    <input
                                        type="radio"
                                        name={`${key}-radio`}
                                        value={option.value}
                                        checked={value === option.value}
                                        onChange={() => onUpdateSpecialStyle(block.id, key, option.value)}
                                    />
                                    {t(option.label)}
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }

            if (config.type === 'color') {
                const blockTheme =
                    block.theme || getDefaultBlockTheme(block.style, getThemeFromGlobals()) || getThemeFromGlobals();
                return (
                    <React.Fragment key={key}>
                        <Button
                            onClick={() => onOpenTheme(block.id, blockTheme)}
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

    if (!activeBlock) {
        return (
            <div className="blocks-container">
                <div className="blocks-box-specials">
                    <p>{t('blocks.no_block_selected')}</p>
                </div>
            </div>
        );
    }

    const manualWidthKey = getBlockSpecialStyleStorageKey(activeBlock, MANUAL_WIDTH_CONFIG_KEY);
    const blockAlignKey = getBlockSpecialStyleStorageKey(activeBlock, BLOCK_ALIGN_CONFIG_KEY);
    const blockAlignValue = getSpecialStyleValueByKey(activeBlock, BLOCK_ALIGN_CONFIG_KEY, 'false');
    const hasManualWidth = hasSpecialStyleKey(activeBlock.style, MANUAL_WIDTH_CONFIG_KEY);
    const hasBlockAlign = hasSpecialStyleKey(activeBlock.style, BLOCK_ALIGN_CONFIG_KEY);
    const hasRenderableSpecials = getRenderableSpecialConfigs(activeBlock).length > 0;
    const autoWidth = Math.max(MANUAL_WIDTH_MIN, getBaseBlockWidth(activeBlock));
    const sliderValue = manualWidthValue
        ? String(clampManualWidth(Number(manualWidthValue), autoWidth))
        : String(autoWidth);

    return (
        <div className="blocks-container">
            <div className="blocks-box-specials">
                <div className="section">
                    <label>{t('blocks.styles.style')}</label>
                    <div className="style-summary">
                        <span className="style-summary-name">{getStyleLabel(activeBlock.style, t)}</span>
                        <Button size="xs" onClick={() => setIsStyleModalOpen(true)}>
                            {t('blocks.styles.change_style')}
                        </Button>
                    </div>
                </div>
                <div className="section">
                    <label>{t('blocks.cutline')}</label>
                    <div className="radio-group">
                        <label>
                            <input
                                type="radio"
                                name={`cutLine-${activeBlock.id}`}
                                checked={!activeBlock.cutLine}
                                onChange={() => onUpdateBlockCutLine(activeBlock.id, false)}
                            />
                            {t('useful.no')}
                        </label>
                        <label>
                            <input
                                type="radio"
                                name={`cutLine-${activeBlock.id}`}
                                checked={activeBlock.cutLine}
                                onChange={() => onUpdateBlockCutLine(activeBlock.id, true)}
                            />
                            {t('useful.yes')}
                        </label>
                    </div>
                </div>

                {hasManualWidth && manualWidthKey && (
                    <div className="section">
                        <label>{t('blocks.styles.specials.manual_width')}</label>
                        <div className="width-control">
                            <span className="width-control-auto">{t('useful.auto')}</span>
                            <input
                                className="width-control-slider"
                                type="range"
                                min={autoWidth}
                                max={MANUAL_WIDTH_MAX}
                                step={32}
                                value={sliderValue}
                                onChange={event =>
                                    onUpdateSpecialStyle(
                                        activeBlock.id,
                                        manualWidthKey,
                                        sliderValueToWidth(Number(event.target.value), autoWidth)
                                    )
                                }
                            />
                            <Input
                                className="width-control-input"
                                type="text"
                                inputMode="numeric"
                                value={manualWidthDraft}
                                placeholder={t('useful.auto')}
                                onChange={event => {
                                    const rawValue = event.target.value.trim();
                                    if (!/^\d*$/.test(rawValue)) {
                                        return;
                                    }
                                    setManualWidthDraft(rawValue);
                                    if (!rawValue) {
                                        onUpdateSpecialStyle(activeBlock.id, manualWidthKey, '');
                                        return;
                                    }

                                    const nextValue = Number(rawValue);
                                    if (!Number.isFinite(nextValue)) {
                                        return;
                                    }

                                    onUpdateSpecialStyle(activeBlock.id, manualWidthKey, String(nextValue));
                                }}
                                onBlur={() => {
                                    if (!manualWidthDraft) {
                                        onUpdateSpecialStyle(activeBlock.id, manualWidthKey, '');
                                        return;
                                    }

                                    const nextValue = Number(manualWidthDraft);
                                    if (!Number.isFinite(nextValue)) {
                                        setManualWidthDraft(manualWidthValue);
                                        return;
                                    }

                                    const normalizedWidth = String(clampManualWidth(nextValue, autoWidth));
                                    setManualWidthDraft(normalizedWidth);
                                    onUpdateSpecialStyle(activeBlock.id, manualWidthKey, normalizedWidth);
                                }}
                            />
                        </div>
                    </div>
                )}

                {hasBlockAlign && blockAlignKey && (
                    <div className="section">
                        <label>{t('blocks.styles.specials.block_align')}</label>
                        <div className="radio-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={blockAlignValue === 'true' || blockAlignValue === 'center'}
                                    onChange={event =>
                                        onUpdateSpecialStyle(
                                            activeBlock.id,
                                            blockAlignKey,
                                            event.target.checked ? 'true' : 'false'
                                        )
                                    }
                                />
                                {t('blocks.styles.specials.align_center')}
                            </label>
                        </div>
                    </div>
                )}

                {hasSpecialStyleConfig(activeBlock.style) && hasRenderableSpecials && (
                    <div className="section special-styles">
                        <label>{t('blocks.styles.special')}</label>
                        {renderSpecialInputs(activeBlock)}
                    </div>
                )}
            </div>

            <StylePickerModal
                opened={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                title={t('blocks.styles.select_style')}
                activeStyle={activeBlock.style}
                layout="preview-grid"
                onSelectStyle={style => {
                    onUpdateBlockStyle(activeBlock.id, style);
                    setIsStyleModalOpen(false);
                }}
            />
        </div>
    );
};

export default MetroSignBlockEditor;
