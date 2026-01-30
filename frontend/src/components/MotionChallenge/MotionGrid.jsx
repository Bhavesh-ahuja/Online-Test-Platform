import React, { useRef, useState, useEffect } from 'react';
import MotionBlock from './MotionBlock';

const MotionGrid = ({ items, onMoveTo, getConstraints, exitPos = { x: 3, y: 5 } }) => {
    const gridRef = useRef(null);
    const [dragState, setDragState] = useState(null);
    // { id, startX, startY, initialGridX, initialGridY, currentGridX, currentGridY, constraints, axis: 'x'|'y'|null }

    const handleDragStart = (e, id) => {
        // e is React synthetic event.
        // We need clientX/Y.
        const clientX = e.clientX || e.touches?.[0].clientX;
        const clientY = e.clientY || e.touches?.[0].clientY;

        const item = items.find(i => i.id === id);
        if (!item) return;

        const constraints = getConstraints(id);

        setDragState({
            id,
            startX: clientX,
            startY: clientY,
            initialGridX: item.x,
            initialGridY: item.y,
            currentGridX: item.x,
            currentGridY: item.y,
            constraints,
            axis: null
        });

        // Add listeners to Window to track drag outside component
        // We'll adding them in useEffect based on dragState presence usually, 
        // but explicit add here and remove in "end" is also fine/common.
    };

    useEffect(() => {
        if (!dragState) return;

        const handlePointerMove = (e) => {
            const clientX = e.clientX || e.touches?.[0].clientX;
            const clientY = e.clientY || e.touches?.[0].clientY;

            if (!gridRef.current) return;
            const rect = gridRef.current.getBoundingClientRect();
            // grid is 4 wide, 6 high. 400px wide usually? 2:3 aspect.
            const cellWidth = rect.width / 4;
            const cellHeight = rect.height / 6;

            const deltaPixelsX = clientX - dragState.startX;
            const deltaPixelsY = clientY - dragState.startY;

            // Determine Axis if not set
            let axis = dragState.axis;
            if (!axis) {
                if (Math.abs(deltaPixelsX) > 10) axis = 'x';
                else if (Math.abs(deltaPixelsY) > 10) axis = 'y';
            }

            let newGridX = dragState.initialGridX;
            let newGridY = dragState.initialGridY;

            if (axis === 'x') {
                const deltaGrid = deltaPixelsX / cellWidth;
                newGridX = dragState.initialGridX + deltaGrid;
                // Clamp
                newGridX = Math.max(dragState.constraints.minX, Math.min(dragState.constraints.maxX, newGridX));
            } else if (axis === 'y') {
                const deltaGrid = deltaPixelsY / cellHeight;
                newGridY = dragState.initialGridY + deltaGrid;
                // Clamp
                newGridY = Math.max(dragState.constraints.minY, Math.min(dragState.constraints.maxY, newGridY));
            }

            setDragState(prev => ({
                ...prev,
                axis,
                currentGridX: newGridX,
                currentGridY: newGridY
            }));
        };

        const handlePointerUp = () => {
            if (dragState) {
                // Commit
                const finalX = Math.round(dragState.currentGridX);
                const finalY = Math.round(dragState.currentGridY);

                if (finalX !== dragState.initialGridX || finalY !== dragState.initialGridY) {
                    onMoveTo(dragState.id, finalX, finalY);
                }
                setDragState(null);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        // Touch fallbacks if pointer events behave oddly
        window.addEventListener('touchmove', handlePointerMove);
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [dragState, onMoveTo]);


    return (
        <div
            ref={gridRef}
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '400px',
                aspectRatio: '2/3',
                backgroundColor: '#1f2937',
                borderRadius: '12px',
                border: '8px solid #374151',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                margin: '0 auto',
                overflow: 'hidden',
                touchAction: 'none' // Critical for drag prevention on mobile scroll
            }}
        >
            {/* Grid Lines */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)`,
                backgroundSize: `${100 / 4}% ${100 / 6}%`,
                opacity: 0.3,
                pointerEvents: 'none'
            }}></div>

            {/* Exit Hole */}
            <div style={{
                position: 'absolute',
                left: `${(exitPos.x / 4) * 100}%`,
                top: `${(exitPos.y / 6) * 100}%`,
                width: `${(1 / 4) * 100}%`,
                height: `${(1 / 6) * 100}%`,
                background: 'radial-gradient(circle, rgba(0,0,0,0.8) 20%, transparent 70%)',
                zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ width: '60%', height: '60%', border: '4px dashed rgba(255, 255, 255, 0.2)', borderRadius: '50%' }}></div>
            </div>

            {/* Items */}
            {items.map(item => {
                const isDragging = dragState && dragState.id === item.id;

                // If dragging, render TWO blocks:
                // 1. Ghost (Snap Target) - Faint
                // 2. Dragging Block - High Z, exact pos

                if (isDragging) {
                    const snapX = Math.round(dragState.currentGridX);
                    const snapY = Math.round(dragState.currentGridY);

                    // Helper to create temp item
                    const draggingItem = {
                        ...item,
                        x: dragState.currentGridX,
                        y: dragState.currentGridY
                    };

                    const ghostItem = {
                        ...item,
                        x: snapX,
                        y: snapY
                    };

                    return (
                        <React.Fragment key={item.id}>
                            {/* Ghost */}
                            <MotionBlock
                                item={ghostItem}
                                isDragging={false}
                                onDragStart={() => { }}
                                style={{ opacity: 0.3, zIndex: 15 }}
                            />
                            {/* Real Drag */}
                            <MotionBlock
                                item={draggingItem}
                                isDragging={true}
                                onDragStart={() => { }}
                            />
                        </React.Fragment>
                    );
                }

                return (
                    <MotionBlock
                        key={item.id}
                        item={item}
                        isDragging={false}
                        onDragStart={handleDragStart}
                    />
                );
            })}
        </div>
    );
};

export default MotionGrid;
