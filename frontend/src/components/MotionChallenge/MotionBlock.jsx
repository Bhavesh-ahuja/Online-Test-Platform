import React from 'react';

const MotionBlock = ({ item, onMove }) => {
    // Grid Setup
    // Grid is 4 wide, 6 high.
    const widthPct = (item.w / 4) * 100;
    const heightPct = (item.h / 6) * 100;
    const leftPct = (item.x / 4) * 100;
    const topPct = (item.y / 6) * 100;

    const [startPos, setStartPos] = React.useState(null);

    // Touch Handlers
    const handleTouchStart = (e) => {
        if (item.type === 3) return; // Prevent WALL interaction
        const touch = e.touches[0];
        setStartPos({ x: touch.clientX, y: touch.clientY });
    };

    const handleTouchEnd = (e) => {
        if (!startPos) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - startPos.x;
        const dy = touch.clientY - startPos.y;
        finishSwipe(dx, dy);
        setStartPos(null);
    };

    // Mouse Handlers
    const handleMouseDown = (e) => {
        if (item.type === 3) return; // Prevent WALL interaction
        e.preventDefault(); // Prevent text selection
        setStartPos({ x: e.clientX, y: e.clientY });
    };

    // Global Mouse Listeners (for smoother drag)
    React.useEffect(() => {
        if (!startPos) return;

        const handleWindowMouseMove = (e) => {
            // Optional: visual feedback could go here
        };

        const handleWindowMouseUp = (e) => {
            if (!startPos) return;
            const dx = e.clientX - startPos.x;
            const dy = e.clientY - startPos.y;
            finishSwipe(dx, dy);
            setStartPos(null);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [startPos]); // Re-bind when startPos changes

    const finishSwipe = (dx, dy) => {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Minimum swipe distance
        if (Math.max(absDx, absDy) < 30) return;

        let dir = '';
        if (absDx > absDy) {
            dir = dx > 0 ? 'RIGHT' : 'LEFT';
        } else {
            dir = dy > 0 ? 'DOWN' : 'UP';
        }

        onMove(item.id, dir);
    };

    // Type Styling
    let bgColor = item.color || 'blue';
    let borderRadius = '8px';
    let border = 'none';

    if (item.type === 1) { // Target
        borderRadius = '50%';
        // Add some shine or effect
        bgColor = 'radial-gradient(circle at 30% 30%, #ff5555, #990000)';
    } else if (item.type === 3) { // Wall
        bgColor = '#4b5563'; // Gray-600
        borderRadius = '4px';
        border = '2px solid #374151';
        // Add "X" or crosshatch
    } else {
        // Block
        // Bevel effect
        border = '1px solid rgba(255,255,255,0.2)';
    }

    return (
        <div
            style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                boxSizing: 'border-box',
                padding: '4px', // Gap between blocks
                transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)', // Smooth slide
                zIndex: item.type === 1 ? 10 : 5,
                cursor: item.type === 3 ? 'default' : (startPos ? 'grabbing' : 'grab'),
                touchAction: 'none' // Prevent scrolling while touching blocks
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
        >
            <div style={{
                width: '100%',
                height: '100%',
                background: bgColor,
                borderRadius: borderRadius,
                border: border,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                userSelect: 'none'
            }}>
                {item.type === 3 && "❌"}
                {item.type === 1 && (
                    <div style={{ width: '40%', height: '40%', background: 'rgba(255,255,255,0.3)', borderRadius: '50%' }}></div>
                )}
            </div>
        </div>
    );
};

export default MotionBlock;
