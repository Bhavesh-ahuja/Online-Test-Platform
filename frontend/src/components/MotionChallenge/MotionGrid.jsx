import React, { useRef, useState, useEffect } from 'react';
import MotionBlock from './MotionBlock';

const MotionGrid = ({ items, onMoveTo, getConstraints, exitPos = { x: 3, y: 5 }, gridSize = { w: 4, h: 6 } }) => {
    const gridRef = useRef(null);
    const [dragState, setDragState] = useState(null);

    const handleDragStart = (e, id) => {
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
    };

    useEffect(() => {
        if (!dragState) return;

        const handlePointerMove = (e) => {
            const clientX = e.clientX || e.touches?.[0].clientX;
            const clientY = e.clientY || e.touches?.[0].clientY;

            if (!gridRef.current) return;
            const rect = gridRef.current.getBoundingClientRect();

            // Dynamic Cell Size
            const cellWidth = rect.width / gridSize.w;
            const cellHeight = rect.height / gridSize.h;

            const deltaPixelsX = clientX - dragState.startX;
            const deltaPixelsY = clientY - dragState.startY;

            // Determine Axis
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
                newGridX = Math.max(dragState.constraints.minX, Math.min(dragState.constraints.maxX, newGridX));
            } else if (axis === 'y') {
                const deltaGrid = deltaPixelsY / cellHeight;
                newGridY = dragState.initialGridY + deltaGrid;
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
        window.addEventListener('touchmove', handlePointerMove);
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [dragState, onMoveTo, gridSize]);


    return (
        <div
            ref={gridRef}
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '400px',
                aspectRatio: `${gridSize.w}/${gridSize.h}`, // Dynamic Aspect Ratio
                backgroundColor: '#1f2937',
                borderRadius: '12px',
                border: '8px solid #374151',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                margin: '0 auto',
                overflow: 'hidden',
                touchAction: 'none'
            }}
        >
            {/* Grid Lines */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)`,
                backgroundSize: `${100 / gridSize.w}% ${100 / gridSize.h}%`, // Dynamic Grid Lines
                opacity: 0.3,
                pointerEvents: 'none'
            }}></div>

            {/* Exit Hole */}
            <div style={{
                position: 'absolute',
                left: `${(exitPos.x / gridSize.w) * 100}%`,
                top: `${(exitPos.y / gridSize.h) * 100}%`,
                width: `${(1 / gridSize.w) * 100}%`,
                height: `${(1 / gridSize.h) * 100}%`,
                background: 'radial-gradient(circle, rgba(0,0,0,0.8) 20%, transparent 70%)',
                zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ width: '90%', height: '90%', border: '4px dashed rgba(255, 255, 255, 0.4)', borderRadius: '50%' }}></div>
            </div>

            {/* Items */}
            {items.map(item => {
                const isDragging = dragState && dragState.id === item.id;

                if (isDragging) {
                    const snapX = Math.round(dragState.currentGridX);
                    const snapY = Math.round(dragState.currentGridY);

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
                            <MotionBlock
                                item={ghostItem}
                                isDragging={false}
                                onDragStart={() => { }}
                                gridSize={gridSize}
                                style={{ opacity: 0.3, zIndex: 15 }}
                            />
                            <MotionBlock
                                item={draggingItem}
                                isDragging={true}
                                onDragStart={() => { }}
                                gridSize={gridSize}
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
                        gridSize={gridSize}
                    />
                );
            })}
        </div>
    );
};

export default MotionGrid;
