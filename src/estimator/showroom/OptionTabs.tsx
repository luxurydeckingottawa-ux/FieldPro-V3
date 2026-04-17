/**
 * OptionTabs
 *
 * Tab bar shown at the top of the Estimator Showroom input panel.
 * Lets the user switch between multiple estimate options (A, B, C...)
 * on the SAME estimate — same customer, same estimate number, but
 * different dimensions/selections/materials.
 *
 * Design (modeled on HousecallPro's estimate-options tabs):
 * - Each option = a tab showing "Option A", price preview, and a 3-dot menu
 * - "+ Add Option" button at the end with dropdown: Start Fresh | Duplicate
 * - 3-dot menu per tab: Rename, Delete (disabled on last remaining option)
 */

import React, { useState, useRef, useEffect } from 'react';

export interface OptionTabItem {
  id: string;              // 'A', 'B', 'C', ...
  name: string;            // 'Option A' (editable)
  totalPrice: number;      // For display in the tab
}

export interface OptionTabsProps {
  options: OptionTabItem[];
  activeId: string;
  estimateNumber: number;
  onSelect: (id: string) => void;
  onAdd: (mode: 'fresh' | 'duplicate') => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

const OptionTabs: React.FC<OptionTabsProps> = ({
  options,
  activeId,
  estimateNumber,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}) => {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const addMenuRef = useRef<HTMLDivElement>(null);
  const dotsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const startRename = (opt: OptionTabItem) => {
    setRenamingId(opt.id);
    setRenameValue(opt.name);
    setMenuOpenId(null);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const fmtPrice = (p: number) =>
    p > 0 ? `$${Math.round(p).toLocaleString()}` : '—';

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Section label */}
      <div
        style={{
          fontSize: 9,
          letterSpacing: 2,
          color: 'var(--lux-gold)',
          textTransform: 'uppercase',
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        Estimate #{estimateNumber} Options
      </div>

      {/* Tab pills + Add button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.map((opt) => {
          const isActive = opt.id === activeId;
          const isRenaming = renamingId === opt.id;
          return (
            <div
              key={opt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 10px',
                borderRadius: 6,
                border: `1px solid ${isActive ? 'rgba(212,168,83,0.5)' : 'rgba(255,255,255,0.06)'}`,
                background: isActive ? 'rgba(212,168,83,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: isRenaming ? 'default' : 'pointer',
                position: 'relative',
                transition: 'all 180ms ease',
              }}
              onClick={() => !isRenaming && onSelect(opt.id)}
            >
              {/* Option letter badge */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: isActive ? 'var(--lux-gold)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#0A0A0A' : 'rgba(232,224,212,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  flexShrink: 0,
                  transition: 'all 180ms ease',
                }}
              >
                {opt.id}
              </div>

              {/* Name + price */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {isRenaming ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#E8E0D4',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid var(--lux-gold)',
                      borderRadius: 3,
                      padding: '2px 6px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isActive ? '#E8E0D4' : 'rgba(232,224,212,0.7)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {opt.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: isActive ? 'var(--lux-gold)' : 'rgba(212,168,83,0.35)',
                        fontWeight: 600,
                      }}
                    >
                      {fmtPrice(opt.totalPrice)}
                    </div>
                  </>
                )}
              </div>

              {/* 3-dot menu button */}
              {!isRenaming && (
                <div style={{ position: 'relative' }} ref={menuOpenId === opt.id ? dotsMenuRef : undefined}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === opt.id ? null : opt.id);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      border: 'none',
                      background: 'transparent',
                      color: 'rgba(232,224,212,0.5)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 800,
                      lineHeight: 1,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 3,
                    }}
                    title="Options"
                  >
                    {'\u22EE'}
                  </button>
                  {menuOpenId === opt.id && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 22,
                        background: 'rgba(15,15,15,0.98)',
                        border: '1px solid rgba(212,168,83,0.2)',
                        borderRadius: 6,
                        minWidth: 120,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                        zIndex: 50,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(opt);
                        }}
                        style={menuItemStyle}
                      >
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (options.length > 1) {
                            onDelete(opt.id);
                            setMenuOpenId(null);
                          }
                        }}
                        disabled={options.length <= 1}
                        style={{
                          ...menuItemStyle,
                          color: options.length <= 1 ? 'rgba(232,224,212,0.2)' : '#E74C3C',
                          cursor: options.length <= 1 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add option button */}
        <div style={{ position: 'relative' }} ref={addMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAddMenuOpen(!addMenuOpen);
            }}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px dashed rgba(212,168,83,0.3)',
              background: 'transparent',
              color: 'var(--lux-gold)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              textTransform: 'uppercase',
              transition: 'all 180ms ease',
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Add Option
          </button>
          {addMenuOpen && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 34,
                background: 'rgba(15,15,15,0.98)',
                border: '1px solid rgba(212,168,83,0.2)',
                borderRadius: 6,
                boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => {
                  onAdd('duplicate');
                  setAddMenuOpen(false);
                }}
                style={{ ...menuItemStyle, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div style={{ fontWeight: 700 }}>Duplicate Current</div>
                <div style={{ fontSize: 9, color: 'rgba(232,224,212,0.4)', marginTop: 2 }}>
                  Copy sizes, selections, and materials
                </div>
              </button>
              <button
                onClick={() => {
                  onAdd('fresh');
                  setAddMenuOpen(false);
                }}
                style={menuItemStyle}
              >
                <div style={{ fontWeight: 700 }}>Start Fresh</div>
                <div style={{ fontSize: 9, color: 'rgba(232,224,212,0.4)', marginTop: 2 }}>
                  Blank option (keeps customer info)
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  color: '#E8E0D4',
  fontSize: 10,
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export default OptionTabs;
