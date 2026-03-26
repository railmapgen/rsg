import React, { Fragment, useMemo } from 'react';
import { Modal } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import tutorialEn from '../docs/tutorial/en.md?raw';
import tutorialJa from '../docs/tutorial/ja.md?raw';
import tutorialKo from '../docs/tutorial/ko.md?raw';
import tutorialZhHans from '../docs/tutorial/zh-Hans.md?raw';
import tutorialZhHant from '../docs/tutorial/zh-Hant.md?raw';

type Props = {
    opened: boolean;
    onClose: () => void;
};

const tutorialMap: Record<string, string> = {
    en: tutorialEn,
    ja: tutorialJa,
    ko: tutorialKo,
    'zh-Hans': tutorialZhHans,
    'zh-Hant': tutorialZhHant,
};

function getTutorialMarkdown(language: string) {
    if (tutorialMap[language]) {
        return tutorialMap[language];
    }

    if (language.startsWith('zh')) {
        return tutorialZhHans;
    }

    return tutorialEn;
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
    const parts = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

    return parts.map((part, index) => {
        const key = `${keyPrefix}-${index}`;

        if (part.startsWith('[')) {
            const matched = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (matched) {
                return (
                    <a key={key} href={matched[2]} target="_blank" rel="noreferrer">
                        {matched[1]}
                    </a>
                );
            }
        }

        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={key}>{part.slice(1, -1)}</code>;
        }

        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={key}>{part.slice(2, -2)}</strong>;
        }

        return <Fragment key={key}>{part}</Fragment>;
    });
}

function renderMarkdown(markdown: string) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const nodes: React.ReactNode[] = [];
    let paragraphBuffer: string[] = [];
    let listItems: string[] = [];
    let codeBuffer: string[] = [];
    let codeLanguage = '';
    let inCodeBlock = false;

    const flushParagraph = () => {
        if (paragraphBuffer.length === 0) return;
        const text = paragraphBuffer.join(' ').trim();
        if (text) {
            nodes.push(
                <p key={`p-${nodes.length}`} className="tutorial-markdown-paragraph">
                    {renderInlineMarkdown(text, `p-${nodes.length}`)}
                </p>
            );
        }
        paragraphBuffer = [];
    };

    const flushList = () => {
        if (listItems.length === 0) return;
        nodes.push(
            <ul key={`ul-${nodes.length}`} className="tutorial-markdown-list">
                {listItems.map((item, index) => (
                    <li key={`li-${nodes.length}-${index}`}>
                        {renderInlineMarkdown(item, `li-${nodes.length}-${index}`)}
                    </li>
                ))}
            </ul>
        );
        listItems = [];
    };

    const flushCode = () => {
        if (codeBuffer.length === 0) return;
        nodes.push(
            <pre
                key={`pre-${nodes.length}`}
                className="tutorial-markdown-code"
                data-language={codeLanguage || undefined}
            >
                <code>{codeBuffer.join('\n')}</code>
            </pre>
        );
        codeBuffer = [];
        codeLanguage = '';
    };

    lines.forEach(line => {
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                flushCode();
                inCodeBlock = false;
            } else {
                flushParagraph();
                flushList();
                inCodeBlock = true;
                codeLanguage = line.slice(3).trim();
            }
            return;
        }

        if (inCodeBlock) {
            codeBuffer.push(line);
            return;
        }

        const trimmed = line.trim();

        if (!trimmed) {
            flushParagraph();
            flushList();
            return;
        }

        if (trimmed.startsWith('# ')) {
            flushParagraph();
            flushList();
            nodes.push(
                <h1 key={`h1-${nodes.length}`} className="tutorial-markdown-h1">
                    {renderInlineMarkdown(trimmed.slice(2).trim(), `h1-${nodes.length}`)}
                </h1>
            );
            return;
        }

        if (trimmed.startsWith('## ')) {
            flushParagraph();
            flushList();
            nodes.push(
                <h2 key={`h2-${nodes.length}`} className="tutorial-markdown-h2">
                    {renderInlineMarkdown(trimmed.slice(3).trim(), `h2-${nodes.length}`)}
                </h2>
            );
            return;
        }

        if (trimmed.startsWith('- ')) {
            flushParagraph();
            listItems.push(trimmed.slice(2).trim());
            return;
        }

        paragraphBuffer.push(trimmed);
    });

    flushParagraph();
    flushList();
    flushCode();

    return nodes;
}

const TutorialModal: React.FC<Props> = ({ opened, onClose }) => {
    const { i18n, t } = useTranslation();

    const tutorialContent = useMemo(
        () => renderMarkdown(getTutorialMarkdown(i18n.resolvedLanguage || i18n.language || 'en')),
        [i18n.language, i18n.resolvedLanguage]
    );

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={t('head_bar.tutorial')}
            centered
            size="calc(100vw - 48px)"
            classNames={{
                content: 'tutorial-modal-content',
                body: 'tutorial-modal-body',
                header: 'tutorial-modal-header',
                title: 'tutorial-modal-title',
            }}
        >
            <div className="tutorial-markdown">{tutorialContent}</div>
        </Modal>
    );
};

export default TutorialModal;
