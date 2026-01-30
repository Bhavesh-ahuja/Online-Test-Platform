import React from 'react';
import MotionBlock from './MotionBlock';

const MotionGrid = ({ items, onMove, exitPos = { x: 3, y: 5 } }) => {
    // Aspect Ratio 2:3 (4 cols : 6 rows)
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '400px', // Max size constraint narrower for vertical
            aspectRatio: '2/3',
            backgroundColor: '#1f2937', // Dark slate board
            borderRadius: '12px',
            border: '8px solid #374151',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
            margin: '0 auto',
            overflow: 'hidden'
        }}>
            {/* Grid Lines (Optional) */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)`,
                backgroundSize: `${100 / 4}% ${100 / 6}%`,
                opacity: 0.3,
                pointerEvents: 'none'
            }}></div>

            {/* Exit Hole Indicator */}
            <div style={{
                position: 'absolute',
                left: `${(exitPos.x / 4) * 100}%`,
                top: `${(exitPos.y / 6) * 100}%`,
                width: `${(1 / 4) * 100}%`,
                height: `${(1 / 6) * 100}%`,
                background: 'radial-gradient(circle, rgba(0,0,0,0.8) 20%, transparent 70%)',

                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '60%',
                    height: '60%',
                    border: '4px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%'
                }}></div>
            </div>

            {/* Blocks */}
            {items.map(item => (
                <MotionBlock key={item.id} item={item} onMove={onMove} />
            ))}
        </div>
    );
};

export default MotionGrid;
