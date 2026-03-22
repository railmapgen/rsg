import React, { useMemo, useState } from 'react';
import { Input, Modal } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { getStyleLabel, styleGroups } from './configs';

type Props = {
    opened: boolean;
    onClose: () => void;
    title: string;
    activeStyle?: string | null;
    onSelectStyle: (style: string) => void;
};

const StylePickerModal: React.FC<Props> = ({ opened, onClose, title, activeStyle = null, onSelectStyle }) => {
    const { t } = useTranslation();
    const [styleSearch, setStyleSearch] = useState('');

    const filteredStyleGroups = useMemo(() => {
        const keyword = styleSearch.trim().toLowerCase();
        return styleGroups
            .map(group => ({
                ...group,
                styles: group.styles.filter(style => {
                    if (!keyword) return true;
                    const translatedMatch = getStyleLabel(style, t).toLowerCase().includes(keyword);
                    const styleMatch = style.toLowerCase().includes(keyword);
                    return translatedMatch || styleMatch;
                }),
            }))
            .filter(group => group.styles.length > 0);
    }, [styleSearch, t]);

    return (
        <Modal
            opened={opened}
            onClose={() => {
                setStyleSearch('');
                onClose();
            }}
            title={title}
            centered
            size="lg"
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
                        <div className="style-picker-items">
                            {group.styles.map(style => (
                                <button
                                    key={style}
                                    type="button"
                                    className={`style-picker-item${activeStyle === style ? ' is-active' : ''}`}
                                    onClick={() => {
                                        onSelectStyle(style);
                                        setStyleSearch('');
                                    }}
                                >
                                    <span>{getStyleLabel(style, t)}</span>
                                    {activeStyle === style && (
                                        <span className="style-picker-current">{t('blocks.styles.current_style')}</span>
                                    )}
                                </button>
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
