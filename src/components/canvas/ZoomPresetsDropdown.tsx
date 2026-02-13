/**
 * Zoom Presets Dropdown
 * Quick navigation to common zoom levels
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';

interface ZoomPreset {
  label: string;
  value: number | 'fit';
}

const ZOOM_PRESETS: ZoomPreset[] = [
  { label: 'Fit All', value: 'fit' },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2.0 },
];

interface ZoomPresetsDropdownProps {
  currentZoom: number;
  onZoomTo: (zoom: number) => void;
  onFitView: () => void;
  darkMode?: boolean;
}

const ZoomPresetsDropdown: React.FC<ZoomPresetsDropdownProps> = ({
  currentZoom,
  onZoomTo,
  onFitView,
  darkMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handlePresetClick = (preset: ZoomPreset) => {
    if (preset.value === 'fit') {
      onFitView();
    } else {
      onZoomTo(preset.value);
    }
    setIsOpen(false);
  };

  const currentZoomPercent = Math.round(currentZoom * 100);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-2 py-1 rounded text-xs font-mono
          transition-colors duration-150
          ${darkMode
            ? 'hover:bg-gray-700 text-gray-300'
            : 'hover:bg-gray-100 text-gray-700'
          }
          ${isOpen
            ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
            : ''
          }
        `}
        title="Zoom presets"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="w-10 text-center">{currentZoomPercent}%</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute bottom-full mb-1 left-1/2 -translate-x-1/2
            min-w-[100px] py-1 rounded-lg shadow-lg border
            z-50 animate-in fade-in slide-in-from-bottom-2 duration-150
            ${darkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
            }
          `}
          role="menu"
        >
          {ZOOM_PRESETS.map((preset) => {
            const isActive = preset.value !== 'fit' && Math.round(preset.value * 100) === currentZoomPercent;
            const isFitAll = preset.value === 'fit';

            return (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className={`
                  w-full px-3 py-1.5 text-xs text-left flex items-center gap-2
                  transition-colors duration-100
                  ${darkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                  }
                  ${isActive
                    ? darkMode
                      ? 'bg-blue-900/30 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                    : ''
                  }
                `}
                role="menuitem"
              >
                {isFitAll && <Maximize2 size={12} className="text-gray-400" />}
                <span className={isFitAll ? '' : 'ml-5'}>{preset.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ZoomPresetsDropdown;
