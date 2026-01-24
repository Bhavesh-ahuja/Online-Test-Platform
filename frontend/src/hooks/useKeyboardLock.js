import { useEffect } from 'react';

/**
 * Hook to lock down specific keyboard keys and shortcuts to prevent cheating.
 * blocked: F12, Meta (Windows), Alt, Ctrl+Shift+I/J/C, Ctrl+U/S/P, PrintScreen
 */
export function useKeyboardLock(isActive = true, onViolation = () => { }) {
    useEffect(() => {
        if (!isActive) return;

        // 1. Key Blocking
        const handleKeyDown = (e) => {
            const { key, ctrlKey, shiftKey, altKey, metaKey } = e;

            // Allow common non-cheating keys
            // Block specific cheat keys
            const isBlocked =
                key === 'F12' ||
                key === 'Alt' ||
                key === 'Tab' ||
                key === 'Meta' ||
                key === 'ContextMenu' ||
                key === 'PrintScreen';

            // Block Ctrl Shortcuts (Copy, Paste, Print, Save, Inspect)
            const isCtrlBlocked = ctrlKey && (
                ['c', 'v', 'p', 's', 'u'].includes(key.toLowerCase()) ||
                (shiftKey && ['i', 'j', 'c'].includes(key.toLowerCase()))
            );

            if (isBlocked || isCtrlBlocked) {
                console.warn(`[Security] Blocked Key: ${key}`);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }
        };

        // 2. Focus Tracking (Blur Detection)
        const handleBlur = () => {
            if (isActive) {
                console.warn("[Security] Focus Lost - Potential Violation");
                onViolation();
            }
        };

        // 3. Context Menu (Right Click)
        const handleContextMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        // Attach Aggressive Listeners
        window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
        window.addEventListener('blur', handleBlur);
        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [isActive, onViolation]);
}
