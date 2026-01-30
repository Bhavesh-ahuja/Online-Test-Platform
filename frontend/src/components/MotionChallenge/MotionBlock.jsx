import React from 'react';

const MotionBlock = ({ item, isDragging, onDragStart, style = {} }) => {
    // Grid Setup
    const widthPct = (item.w / 4) * 100;
    const heightPct = (item.h / 6) * 100;

    // If dragging, X/Y are handled by the parent style or transform
    // If not, we calculate from grid
    const leftPct = (item.x / 4) * 100;
    const topPct = (item.y / 6) * 100;

    // Type Styling
    let bgColor = item.color || 'blue';
    let borderRadius = '8px';
    let border = 'none';

    if (item.type === 1) { // Target
        borderRadius = '50%';
        bgColor = 'radial-gradient(circle at 30% 30%, #ff5555, #990000)';
    } else if (item.type === 3) { // Wall
        bgColor = '#4b5563'; // Gray-600
        borderRadius = '4px';
        border = '2px solid #374151';
    } else {
        // Block
        border = '1px solid rgba(255,255,255,0.2)';
    }

    const baseStyle = {
        position: 'absolute',
        width: `${widthPct}%`,
        height: `${heightPct}%`,
        boxSizing: 'border-box',
        padding: '4px', // Gap
        transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        zIndex: isDragging ? 20 : (item.type === 1 ? 10 : 5),
        cursor: item.type === 3 ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        touchAction: 'none',
        ...style // Allow overrides
    };

    // If NOT dragging, position is grid-based
    if (!style.left && !style.transform) {
        baseStyle.left = `${leftPct}%`;
        baseStyle.top = `${topPct}%`;
    }

    const handlePointerDown = (e) => {
        if (item.type === 3) return; // Wall
        // Stop bubbling so grid doesn't get it?
        // e.preventDefault(); 
        onDragStart(e, item.id);
    };

    return (
        <div
            style={baseStyle}
            onPointerDown={handlePointerDown}
        // Add mouse listeners just in case pointer events aren't fully polyfilled in environment, 
        // but Pointer Events are standard now.
        >
            <div style={{
                width: '100%',
                height: '100%',
                background: bgColor,
                borderRadius: borderRadius,
                border: border,
                boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                userSelect: 'none',
                transform: isDragging ? 'scale(1.02)' : 'none'
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
