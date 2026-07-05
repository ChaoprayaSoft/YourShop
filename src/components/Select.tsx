'use client';

import { useState, useRef, useEffect } from 'react';

type Option = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function Select({ options, value, onChange, placeholder = 'Select...', required, className = '', style }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`custom-select-container ${className}`} style={{ position: 'relative', ...style }} ref={containerRef}>
      <div 
        className="input-field" 
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'var(--background-white)',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayLabel}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '8px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          zIndex: 1000,
          maxHeight: '250px',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {options.map((opt, i) => (
            <div 
              key={i}
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '12px 16px',
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                borderRadius: '8px',
                background: opt.value === value ? 'var(--primary-color)' : 'transparent',
                color: opt.disabled ? '#999' : (opt.value === value ? 'white' : 'var(--text-primary)'),
                opacity: opt.disabled ? 0.6 : 1,
                fontWeight: opt.value === value ? 600 : 400,
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!opt.disabled && opt.value !== value) e.currentTarget.style.background = 'rgba(123, 97, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                if (!opt.disabled && opt.value !== value) e.currentTarget.style.background = 'transparent';
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
      
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input 
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}
