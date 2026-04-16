import { jsx as _jsx } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
const VIEWPORT_FIT_PADDING_PX = 6;
const MIN_VIEWPORT_FIT_SCALE = 0.1;
export function ViewportFit({ children, className, contentClassName, disabled = false, }) {
    const frameRef = useRef(null);
    const contentRef = useRef(null);
    const [scale, setScale] = useState(1);
    useLayoutEffect(() => {
        if (disabled) {
            setScale(1);
            return;
        }
        let animationFrameId = null;
        const measure = () => {
            const frameElement = frameRef.current;
            const contentElement = contentRef.current;
            if (!frameElement || !contentElement) {
                return;
            }
            const availableWidth = Math.max(1, frameElement.clientWidth - VIEWPORT_FIT_PADDING_PX);
            const availableHeight = Math.max(1, frameElement.clientHeight - VIEWPORT_FIT_PADDING_PX);
            const contentWidth = Math.max(contentElement.scrollWidth, contentElement.offsetWidth, contentElement.clientWidth);
            const contentHeight = Math.max(contentElement.scrollHeight, contentElement.offsetHeight, contentElement.clientHeight);
            const nextScale = Math.max(MIN_VIEWPORT_FIT_SCALE, Math.min(1, availableWidth / Math.max(1, contentWidth), availableHeight / Math.max(1, contentHeight)));
            const roundedScale = Number(nextScale.toFixed(4));
            setScale((current) => (Math.abs(current - roundedScale) < 0.001 ? current : roundedScale));
        };
        const scheduleMeasure = () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = window.requestAnimationFrame(() => {
                animationFrameId = null;
                measure();
            });
        };
        scheduleMeasure();
        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => scheduleMeasure());
        if (frameRef.current) {
            resizeObserver?.observe(frameRef.current);
        }
        if (contentRef.current) {
            resizeObserver?.observe(contentRef.current);
        }
        window.addEventListener('resize', scheduleMeasure);
        window.visualViewport?.addEventListener('resize', scheduleMeasure);
        return () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }
            resizeObserver?.disconnect();
            window.removeEventListener('resize', scheduleMeasure);
            window.visualViewport?.removeEventListener('resize', scheduleMeasure);
        };
    }, [disabled]);
    return (_jsx("div", { ref: frameRef, className: cn('viewport-fit-frame', className), children: _jsx("div", { ref: contentRef, className: cn('viewport-fit-content', contentClassName), style: { '--viewport-fit-scale': String(scale) }, children: children }) }));
}
