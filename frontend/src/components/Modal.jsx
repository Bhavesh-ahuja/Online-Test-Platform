import React from 'react';

function Modal({ isOpen, onClose, title, children, actions }) {
    if (!isOpen) return null;

    return (
        // Backdrop
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>

            {/* Modal Box */}
            <div className='bg-white rounded-lg shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200'>

                {/* Header */}
                <div className='flex justify-between items-center p-4 border-b'>
                    <h3 className='text-x font-semibold text-gray-800'>{title}</h3>
                    <button
                        onClick={onClose}
                        className='text-gray-400 hover:text-gray-600 transition'>
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className='p-6 text-gray-600'>
                    {children}
                </div>

                {/* Footer / Actions */}
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
                    {actions}
                </div>

            </div>
        </div>
    );
}

export default Modal;