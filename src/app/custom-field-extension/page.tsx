'use client';

import { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useMarketplaceClient } from '@/src/utils/hooks/useMarketplaceClient';

type ColorMode = 'HEX' | 'RGB' | 'HSL';

// ---- Color conversion helpers ----
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex: string) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255));
}

export default function ColorPickerField() {
  const { client, isInitialized, isLoading, error } = useMarketplaceClient();
  const [color, setColor] = useState('#ffffff');
  const [colorMode, setColorMode] = useState<ColorMode>('HEX');

  // Separate input states for each mode
  const [hexInput, setHexInput] = useState('#ffffff');
  const [rgbInput, setRgbInput] = useState({ r: 255, g: 255, b: 255 });
  const [hslInput, setHslInput] = useState({ h: 0, s: 0, l: 100 });

  const [eyedropperSupported, setEyedropperSupported] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEyedropperSupported('EyeDropper' in window);
  }, []);

  // Load existing saved value
  useEffect(() => {
    if (!client || !isInitialized) return;
    const loadValue = async () => {
      const existing = await client.getValue();
      if (existing && typeof existing === 'string') {
        const parsed = existing.startsWith('{') ? JSON.parse(existing) : null;
        const hex = parsed?.hex ?? existing;
        updateAllFromHex(hex);
      }
    };
    loadValue();
  }, [client, isInitialized]);

  // Master function — whenever color changes, sync all input states
  const updateAllFromHex = (hex: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    setColor(hex);
    setHexInput(hex);
    setRgbInput(hexToRgb(hex));
    setHslInput(hexToHsl(hex));
  };

  // Color wheel change
  const handleColorChange = (newColor: string) => {
    updateAllFromHex(newColor);
  };

  // HEX input
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) updateAllFromHex(val);
  };

  // RGB inputs
  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: string) => {
    const num = Math.max(0, Math.min(255, Number(val) || 0));
    const updated = { ...rgbInput, [channel]: num };
    setRgbInput(updated);
    updateAllFromHex(rgbToHex(updated.r, updated.g, updated.b));
  };

  // HSL inputs
  const handleHslChange = (channel: 'h' | 's' | 'l', val: string) => {
    const max = channel === 'h' ? 360 : 100;
    const num = Math.max(0, Math.min(max, Number(val) || 0));
    const updated = { ...hslInput, [channel]: num };
    setHslInput(updated);
    updateAllFromHex(hslToHex(updated.h, updated.s, updated.l));
  };

  // EyeDropper
  const handleEyeDropper = async () => {
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      updateAllFromHex(result.sRGBHex);
    } catch {
      // user cancelled
    }
  };

  // Image upload — browser only, no server
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  // Draw image onto canvas
  useEffect(() => {
    if (!uploadedImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = uploadedImage;
  }, [uploadedImage]);

  // Pick color from image
  const handleImageClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    updateAllFromHex(rgbToHex(pixel[0], pixel[1], pixel[2]));
  };

  const clearImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirm = async () => {
    if (!client) return;
    await client.setValue(hexInput);
    await (client as any).closeApp?.();
  };

  if (isLoading) return <p style={msgStyle}>Loading...</p>;
  if (error) return <p style={{ ...msgStyle, color: 'red' }}>Failed to connect to Sitecore. Please try again.</p>;
  if (!isInitialized) return <p style={msgStyle}>Waiting for Sitecore...</p>;

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>🎨 Color Picker</h2>

      {/* Color Wheel */}
      <HexColorPicker
        color={color}
        onChange={handleColorChange}
        style={{ width: '100%', height: '200px' }}
      />

      {/* Preview swatch */}
      <div style={{ ...previewSwatch, backgroundColor: color }} />

      {/* Mode Switcher Tabs */}
      <div style={tabRowStyle}>
        {(['HEX', 'RGB', 'HSL'] as ColorMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setColorMode(mode)}
            style={{
              ...tabBtn,
              backgroundColor: colorMode === mode ? '#eb1f1f' : '#f0f0f0',
              color: colorMode === mode ? '#fff' : '#333',
            }}
          >
            {mode}
          </button>
        ))}
        {eyedropperSupported && (
          <button onClick={handleEyeDropper} style={tabBtn} title="Pick color from screen">
            🔍
          </button>
        )}
      </div>

      {/* HEX Input */}
      {colorMode === 'HEX' && (
        <div style={inputRowStyle}>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            placeholder="#ffffff"
            style={singleInputStyle}
          />
          <span style={inputLabelStyle}>HEX</span>
        </div>
      )}

      {/* RGB Inputs */}
      {colorMode === 'RGB' && (
        <div style={inputRowStyle}>
          {(['r', 'g', 'b'] as const).map((ch) => (
            <div key={ch} style={inputGroupStyle}>
              <input
                type="number"
                min={0}
                max={255}
                value={rgbInput[ch]}
                onChange={(e) => handleRgbChange(ch, e.target.value)}
                style={smallInputStyle}
              />
              <span style={inputLabelStyle}>{ch.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      {/* HSL Inputs */}
      {colorMode === 'HSL' && (
        <div style={inputRowStyle}>
          {(['h', 's', 'l'] as const).map((ch) => (
            <div key={ch} style={inputGroupStyle}>
              <input
                type="number"
                min={0}
                max={ch === 'h' ? 360 : 100}
                value={hslInput[ch]}
                onChange={(e) => handleHslChange(ch, e.target.value)}
                style={smallInputStyle}
              />
              <span style={inputLabelStyle}>
                {ch === 'h' ? 'H°' : ch === 's' ? 'S%' : 'L%'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Image Upload Section */}
      <div style={{ width: '100%' }}>
        <label style={sectionLabelStyle}>Pick from an Image</label>
        {!uploadedImage ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...dropZone,
              borderColor: isDragging ? '#eb1f1f' : '#ccc',
              background: isDragging ? '#fff5f5' : '#fafafa',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              📁 Click or drag an image here
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              onClick={handleImageClick}
              style={{
                width: '100%',
                maxHeight: '350px',
                objectFit: 'contain',
                borderRadius: '8px',
                cursor: 'crosshair',
                border: '1px solid #ccc',
                display: 'block',
              }}
            />
            <button onClick={clearImage} style={clearBtn} title="Remove image">✕</button>
            <p style={{ fontSize: '0.72rem', color: '#888', margin: '4px 0 0' }}>
              Click anywhere on the image to pick that color
            </p>
          </div>
        )}
      </div>

      {/* Confirm */}
      <button onClick={handleConfirm} style={confirmBtn}>
        ✅ Confirm Color
      </button>
    </div>
  );
}

// ---- Styles ----
const msgStyle: React.CSSProperties = { padding: '1rem', fontFamily: 'sans-serif' };

const containerStyle: React.CSSProperties = {
  padding: '1rem',
  fontFamily: 'sans-serif',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  maxWidth: '340px',
  margin: '0 auto',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 600,
  alignSelf: 'flex-start',
};

const previewSwatch: React.CSSProperties = {
  width: '100%',
  height: '36px',
  borderRadius: '6px',
  border: '1px solid #ccc',
};

const tabRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
  width: '100%',
};

const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: '0.35rem 0',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const inputRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  width: '100%',
  alignItems: 'flex-end',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  flex: 1,
};

const singleInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.4rem 0.6rem',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontFamily: 'monospace',
  width: '100%',
};

const smallInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.4rem 0.3rem',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '0.85rem',
  textAlign: 'center',
};

const inputLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#888',
  marginTop: '2px',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#555',
  display: 'block',
  marginBottom: '6px',
};

const dropZone: React.CSSProperties = {
  border: '2px dashed #ccc',
  borderRadius: '8px',
  padding: '1.2rem',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const clearBtn: React.CSSProperties = {
  position: 'absolute',
  top: '6px',
  right: '6px',
  background: 'rgba(0,0,0,0.55)',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  width: '22px',
  height: '22px',
  cursor: 'pointer',
  fontSize: '0.7rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const confirmBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem',
  backgroundColor: '#eb1f1f',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
};