import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.resolve(__dirname, '../build')

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

// Custom Minimalist "PII Eraser on Clipboard" SVG Icon
const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Squircle Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0E121B"/>
      <stop offset="50%" stop-color="#141924"/>
      <stop offset="100%" stop-color="#1A2232"/>
    </linearGradient>

    <!-- Outer Rim Glow -->
    <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="40%" stop-color="rgba(255,255,255,0.06)"/>
      <stop offset="100%" stop-color="rgba(10,132,255,0.3)"/>
    </linearGradient>

    <!-- Clipboard Plate Glass -->
    <linearGradient id="plateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.09)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.03)"/>
    </linearGradient>

    <!-- Metallic Clip Gradient -->
    <linearGradient id="clipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#64748B"/>
      <stop offset="50%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>

    <!-- Redacted Sensitive PII Gradient (Before Eraser) -->
    <linearGradient id="piiRedactedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF3B30"/>
      <stop offset="100%" stop-color="#FF9500"/>
    </linearGradient>

    <!-- Sanitized Safe Clean Gradient (After Eraser) -->
    <linearGradient id="sanitizedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0A84FF"/>
      <stop offset="100%" stop-color="#30D158"/>
    </linearGradient>

    <!-- Eraser Body Gradient -->
    <linearGradient id="eraserBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="40%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>

    <!-- Eraser Active Tip (Electric Privacy Cyan/Blue) -->
    <linearGradient id="eraserTip" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="60%" stop-color="#0A84FF"/>
      <stop offset="100%" stop-color="#6366F1"/>
    </linearGradient>

    <!-- Soft Ambient Glow -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Base Plate Squircle -->
  <rect x="24" y="24" width="464" height="464" rx="108" fill="url(#bgGrad)" stroke="url(#rimGrad)" stroke-width="2.5"/>

  <!-- Ambient Light Reflection -->
  <ellipse cx="256" cy="110" rx="180" ry="60" fill="white" opacity="0.04"/>

  <!-- Clipboard Board Group -->
  <g filter="url(#subtleShadow)">
    <!-- Clipboard Body -->
    <rect x="116" y="96" width="280" height="340" rx="26" fill="url(#plateGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

    <!-- Document Subtle Inner Header Bar -->
    <rect x="156" y="156" width="130" height="12" rx="6" fill="rgba(255,255,255,0.3)"/>

    <!-- Top Metallic Clip -->
    <rect x="206" y="80" width="100" height="32" rx="10" fill="url(#clipGrad)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <!-- Clip Inner Ring Accent -->
    <rect x="232" y="88" width="48" height="16" rx="6" fill="#0E121B" opacity="0.6"/>

    <!-- 1st Data Row: Normal text lines -->
    <rect x="156" y="196" width="200" height="10" rx="5" fill="rgba(255,255,255,0.18)"/>

    <!-- 2nd Data Row: Sensitive PII Being Erased! -->
    <!-- Left side: Redacted Raw PII block (Warning Red/Amber) -->
    <rect x="156" y="238" width="86" height="20" rx="6" fill="url(#piiRedactedGrad)" opacity="0.95"/>
    <!-- Sensitive text masked dashes inside the red block -->
    <rect x="166" y="246" width="14" height="4" rx="2" fill="white" opacity="0.9"/>
    <rect x="186" y="246" width="14" height="4" rx="2" fill="white" opacity="0.9"/>
    <rect x="206" y="246" width="14" height="4" rx="2" fill="white" opacity="0.9"/>

    <!-- Right side: Sanitized Clean Masked Slot (Clean Blue) -->
    <rect x="252" y="238" width="104" height="20" rx="6" fill="url(#sanitizedGrad)" opacity="0.25" stroke="url(#sanitizedGrad)" stroke-width="1.5" stroke-dasharray="4 3"/>
    <rect x="268" y="246" width="72" height="4" rx="2" fill="#38BDF8" opacity="0.8"/>

    <!-- 3rd Data Row: Standard Text -->
    <rect x="156" y="292" width="170" height="10" rx="5" fill="rgba(255,255,255,0.18)"/>

    <!-- 4th Data Row: Masked Tag Slot -->
    <rect x="156" y="334" width="94" height="18" rx="6" fill="rgba(10,132,255,0.15)" stroke="rgba(10,132,255,0.3)" stroke-width="1.2"/>
    <rect x="170" y="341" width="66" height="4" rx="2" fill="#0A84FF" opacity="0.8"/>
  </g>

  <!-- The Eraser Tool (Hero Component) -->
  <!-- Slicing cleanly across the sensitive PII row at a dynamic 45-degree angle -->
  <g transform="translate(230, 190) rotate(32)" filter="url(#glow)">
    <!-- Eraser Body Shadow -->
    <rect x="16" y="-8" width="114" height="40" rx="10" fill="#000000" opacity="0.35"/>

    <!-- Eraser Stylus / Handle -->
    <rect x="24" y="-12" width="116" height="36" rx="10" fill="url(#eraserBody)" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>

    <!-- Ergonomic Grip Insets -->
    <line x1="72" y1="-10" x2="72" y2="22" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
    <line x1="84" y1="-10" x2="84" y2="22" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
    <line x1="96" y1="-10" x2="96" y2="22" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

    <!-- Chrome Collar Ring -->
    <rect x="20" y="-13" width="8" height="38" rx="2" fill="#94A3B8"/>

    <!-- Active Precision Eraser Block / Bevel -->
    <path d="M-16, -11 L20, -11 L20, 23 L-16, 23 L-26, 6 Z" fill="url(#eraserTip)" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
    
    <!-- Eraser Contact Highlight -->
    <line x1="-24" y1="-4" x2="-24" y2="16" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
  </g>

  <!-- Clean Sweep Trail & Sparkles (Representing Purged PII) -->
  <!-- Sparkle 1 -->
  <path d="M 238 214 Q 244 214 244 208 Q 244 214 250 214 Q 244 214 244 220 Q 244 214 238 214 Z" fill="#38BDF8" opacity="0.95"/>
  <!-- Sparkle 2 -->
  <path d="M 276 196 Q 282 196 282 190 Q 282 196 288 196 Q 282 196 282 202 Q 282 196 276 196 Z" fill="#60A5FA" opacity="0.9"/>
  <!-- Sparkle 3 -->
  <path d="M 226 272 Q 230 272 230 268 Q 230 272 234 272 Q 230 272 230 276 Q 230 272 226 272 Z" fill="#30D158" opacity="0.85"/>
</svg>`

// Standalone Tray Icon (Clean High-Contrast SVG for 16x16 / 32x32)
const traySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="trayBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A84FF"/>
      <stop offset="100%" stop-color="#5E5CE6"/>
    </linearGradient>
  </defs>
  <!-- Rounded Base Shield/Clip -->
  <rect x="6" y="6" width="52" height="52" rx="14" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
  <!-- Top Clip -->
  <rect x="22" y="3" width="20" height="8" rx="3" fill="#38BDF8"/>
  <!-- Erasing Bars -->
  <rect x="14" y="20" width="36" height="5" rx="2.5" fill="white" opacity="0.4"/>
  <rect x="14" y="30" width="16" height="6" rx="3" fill="#FF3B30"/>
  <rect x="34" y="30" width="16" height="6" rx="3" fill="#38BDF8" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="2 2"/>
  <rect x="14" y="42" width="28" height="5" rx="2.5" fill="white" opacity="0.4"/>
  <!-- Slicing Eraser -->
  <polygon points="26,22 36,32 30,38 20,28" fill="url(#trayBg)" stroke="white" stroke-width="2"/>
</svg>`

async function generate() {
  console.log('Generating master SVG icons...')
  fs.writeFileSync(path.join(buildDir, 'icon.svg'), masterSvg, 'utf8')
  fs.writeFileSync(path.join(buildDir, 'tray-icon.svg'), traySvg, 'utf8')

  // Render PNGs at various resolutions for multi-res Windows ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512]
  const pngBuffers = []

  for (const size of sizes) {
    const pngBuffer = await sharp(Buffer.from(masterSvg))
      .resize(size, size)
      .png()
      .toBuffer()
    
    fs.writeFileSync(path.join(buildDir, `icon-${size}.png`), pngBuffer)
    if (size <= 256) {
      pngBuffers.push(pngBuffer)
    }
  }

  // Master 512x512 icon.png
  fs.copyFileSync(path.join(buildDir, 'icon-512.png'), path.join(buildDir, 'icon.png'))
  console.log('Generated master icon.png (512x512)')

  // Generate multi-resolution icon.ico
  console.log('Packaging multi-resolution icon.ico...')
  const icoBuffer = await pngToIco(pngBuffers)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
  console.log('Generated icon.ico successfully!')

  // Generate 16x16 and 32x32 tray icons
  const tray16 = await sharp(Buffer.from(traySvg)).resize(16, 16).png().toBuffer()
  const tray32 = await sharp(Buffer.from(traySvg)).resize(32, 32).png().toBuffer()
  fs.writeFileSync(path.join(buildDir, 'tray-icon.png'), tray16)
  fs.writeFileSync(path.join(buildDir, 'tray-icon-32.png'), tray32)
  const trayIco = await pngToIco([tray16, tray32])
  fs.writeFileSync(path.join(buildDir, 'tray-icon.ico'), trayIco)
  console.log('Generated tray icons successfully!')
}

generate().catch((err) => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
