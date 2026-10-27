import { CAMERA_LOGOS, detectBrandLogo } from './logos.js';

/**
 * High-Resolution Frame Watermark Renderer
 * Smart responsive layout with collision prevention for landscape, portrait & square images.
 */
export class FrameRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Render image with frame according to options
   * @param {HTMLImageElement} img
   * @param {Object} metadata
   * @param {Object} options
   * @returns {HTMLCanvasElement}
   */
  render(img, metadata, options = {}) {
    const {
      style = 'iphone',
      customLogo = null,
      selectedBrand = 'auto'
    } = options;

    // Convert 0-100 scale (default: 50 for text/logo, 40 for margin/blur, 80 for brightness)
    const textVal = Math.max(0, Math.min(100, options.textSize !== undefined ? options.textSize : (options.textSizePercent ? (options.textSizePercent - 50) / 1.5 : 50)));
    const textScale = textVal <= 50 ? 0.4 + (textVal / 50) * 0.6 : 1.0 + ((textVal - 50) / 50) * 0.8;

    const marginVal = Math.max(0, Math.min(100, options.frameMargin !== undefined ? options.frameMargin : (options.frameMarginPercent ? (options.frameMarginPercent / 15) * 100 : 40)));
    const marginRatio = 0.01 + (marginVal / 100) * 0.14; // 1% to 15%

    const logoVal = Math.max(0, Math.min(100, options.logoSize !== undefined ? options.logoSize : (options.logoSizePercent ? (options.logoSizePercent - 50) / 2 : 50)));
    const logoScale = logoVal <= 50 ? 0.35 + (logoVal / 50) * 0.65 : 1.0 + ((logoVal - 50) / 50) * 1.0;

    const blurVal = Math.max(0, Math.min(100, options.bgBlur !== undefined ? options.bgBlur : 40));
    const bgBlur = Math.round((blurVal / 100) * 60);

    const brightVal = Math.max(0, Math.min(100, options.bgBrightness !== undefined ? options.bgBrightness : 80));
    const bgBrightness = Math.round(30 + (brightVal / 100) * 70);

    const renderOpts = {
      textScale,
      marginRatio,
      logoScale,
      bgBlur,
      bgBrightness,
      customLogo
    };

    const brandKey = selectedBrand === 'auto' ? detectBrandLogo(metadata.model, metadata.make) : selectedBrand;

    switch (style) {
      case 'leica_dark':
      case 'dark_center':
        return this.renderLeicaDark(img, metadata, brandKey, renderOpts);
      case 'leica_white':
      case 'white_center':
        return this.renderLeicaWhite(img, metadata, brandKey, renderOpts);
      case 'studio':
      case 'polaroid':
        return this.renderStudioMat(img, metadata, brandKey, renderOpts);
      case 'blur':
        return this.renderCinematicBlur(img, metadata, brandKey, renderOpts);
      case 'liveview':
        return this.renderLiveView(img, metadata, brandKey, renderOpts);
      case 'iphone':
      default:
        return this.renderIphoneStyle(img, metadata, brandKey, renderOpts);
    }
  }

  /**
   * 1. iPhone Style (Mẫu chuẩn trong hình 1)
   * Khung viền đáy trắng tối giản, chống đè chữ thông minh cho ảnh dọc & ngang
   */
  renderIphoneStyle(img, meta, brandKey, opts) {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const isPortrait = origH > origW;
    const landscapeScale = isPortrait ? 1.0 : 0.78;

    // Bottom banner height: balanced for portrait & landscape
    const marginRatio = opts.marginRatio !== undefined ? opts.marginRatio : ((opts.frameMarginPercent || 6) / 100);
    const baseDimension = isPortrait ? origW : origH;
    const bannerHeight = Math.max(85, Math.round(baseDimension * ((isPortrait ? 0.09 : 0.078) + marginRatio * 0.65)));

    const targetW = origW;
    const targetH = origH + bannerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // Background white fill
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);

    // Draw main photo
    ctx.drawImage(img, 0, 0, origW, origH);

    // Sizing: calculate based on targetW to guarantee horizontal room
    const textScale = opts.textScale !== undefined ? opts.textScale : ((opts.textSizePercent || 100) / 100);
    const logoScale = opts.logoScale !== undefined ? opts.logoScale : ((opts.logoSizePercent || 100) / 100);

    // Base unit must respect both banner height and canvas width (compact for landscape)
    let baseUnit = Math.min(bannerHeight * 0.165, targetW * (isPortrait ? 0.021 : 0.016)) * textScale;
    const paddingX = Math.round(targetW * 0.045);
    const centerY = origH + bannerHeight / 2;

    // Logo calculations
    const brand = CAMERA_LOGOS[brandKey] || CAMERA_LOGOS.fujifilm;
    const aspect = brand.aspect || 3.2;

    const logoX = targetW / 2;
    let logoH = Math.round(bannerHeight * 0.32 * logoScale * landscapeScale);
    let logoW = Math.round(logoH * aspect);

    // Limit logo width to at most 24% of total width so side columns have room
    const maxLogoW = Math.round(targetW * 0.24);
    if (logoW > maxLogoW) {
      logoW = maxLogoW;
      logoH = Math.round(logoW / aspect);
    }

    // Safety margins between Left Column, Center Logo, and Right Column
    const safetyGap = Math.round(targetW * 0.035);
    const maxLeftWidth = Math.max(50, (targetW / 2) - (logoW / 2) - paddingX - safetyGap);
    const maxRightWidth = Math.max(50, (targetW - paddingX) - ((targetW / 2) + (logoW / 2) + safetyGap));

    // Formatted right column text
    const paramParts = [meta.focalLength, meta.aperture, meta.shutterSpeed, meta.iso].filter(Boolean);
    const paramsText = paramParts.length > 0 ? paramParts.join('   ') : '';

    // Smart Auto-Fit: Measure text widths and auto-scale if space is tight
    const modelText = meta.model || 'CAMERA';
    const lensText = meta.lens || '';
    const dateText = meta.dateTime || '';

    // Measure at initial size
    ctx.font = `bold ${Math.round(baseUnit * 1.2)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const modelW = ctx.measureText(modelText).width;

    ctx.font = `${Math.round(baseUnit * 0.95)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const lensW = lensText ? ctx.measureText(lensText).width : 0;

    ctx.font = `${Math.round(baseUnit * 0.82)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const dateW = dateText ? ctx.measureText(dateText).width : 0;

    const maxObservedLeft = Math.max(modelW, lensW, dateW);

    ctx.font = `600 ${Math.round(baseUnit * 1.1)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif`;
    const paramsW = paramsText ? ctx.measureText(paramsText).width : 0;

    // Calculate shrink factor to prevent any collision
    let leftRatio = maxObservedLeft > maxLeftWidth ? maxLeftWidth / maxObservedLeft : 1.0;
    let rightRatio = paramsW > maxRightWidth ? maxRightWidth / paramsW : 1.0;
    const autoFitRatio = Math.min(leftRatio, rightRatio, 1.0);

    // Apply auto-fit shrink
    baseUnit = Math.max(10, baseUnit * autoFitRatio);

    // Recompute fonts with fitted baseUnit
    const fontBold = `bold ${Math.round(baseUnit * 1.2)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;
    const fontRegular = `${Math.round(baseUnit * 0.95)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;
    const fontSub = `${Math.round(baseUnit * 0.82)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif`;
    const fontParams = `600 ${Math.round(baseUnit * 1.08)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif`;

    // 1. LEFT COLUMN: Camera Model + Lens + DateTime
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const hasLens = !!lensText;
    const hasDate = !!dateText;
    const lineSpacing = baseUnit * 1.25;

    let startY = centerY;
    if (hasLens && hasDate) {
      startY = centerY - lineSpacing;
    } else if (hasLens || hasDate) {
      startY = centerY - lineSpacing * 0.5;
    }

    // Line 1: Camera Model (Bold)
    ctx.font = fontBold;
    ctx.fillText(modelText, paddingX, startY);

    // Line 2: Lens Model
    if (hasLens) {
      ctx.font = fontRegular;
      ctx.fillStyle = '#444444';
      ctx.fillText(lensText, paddingX, startY + lineSpacing);
    }

    // Line 3: Timestamp
    if (hasDate) {
      ctx.font = fontSub;
      ctx.fillStyle = '#777777';
      const dateY = hasLens ? startY + lineSpacing * 2 : startY + lineSpacing;
      ctx.fillText(dateText, paddingX, dateY);
    }

    // 2. CENTER: Camera Brand Logo
    if (opts.customLogo) {
      const aspect = opts.customLogo.width / opts.customLogo.height;
      const clW = logoH * aspect;
      ctx.drawImage(opts.customLogo, logoX - clW / 2, centerY - logoH / 2, clW, logoH);
    } else {
      const brand = CAMERA_LOGOS[brandKey] || CAMERA_LOGOS.fujifilm;
      brand.render(ctx, logoX, centerY, logoW, logoH, '#111111');
    }

    // 3. RIGHT COLUMN: Exposure Parameters
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = fontParams;
    ctx.fillStyle = '#111111';
    ctx.fillText(paramsText, targetW - paddingX, centerY);

    return canvas;
  }

  /**
   * 2. Cinematic Blur (Mẫu chuẩn trong hình 2)
   * Nền ảnh mờ Gaussian Blur nghệ thuật, ảnh bo góc đổ bóng mềm, chống đè chữ
   */
  renderCinematicBlur(img, meta, brandKey, opts) {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const isPortrait = origH > origW;
    const landscapeScale = isPortrait ? 1.0 : 0.78;

    const marginPct = opts.marginRatio !== undefined ? opts.marginRatio : ((opts.frameMarginPercent || 6) / 100);
    const baseDim = isPortrait ? origW : origH;
    const pad = Math.round(baseDim * (0.04 + marginPct * 0.5));
    const bottomExtra = Math.max(80, Math.round(baseDim * ((isPortrait ? 0.10 : 0.082) + marginPct * 0.45)));

    const targetW = origW + pad * 2;
    const targetH = origH + pad * 2 + bottomExtra;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // 1. Instant Creamy Bokeh Blur Background (Runs in 0.1ms via downsampled buffer)
    const blurAmount = Math.max(1, Math.round(opts.bgBlur !== undefined ? opts.bgBlur : 20));
    const brightness = Math.max(30, Math.min(100, opts.bgBrightness !== undefined ? opts.bgBrightness : 85));

    // Downsample to max 140px for instantaneous, silky Gaussian blur
    const tinyMax = 140;
    const tinyScale = tinyMax / Math.max(origW, origH);
    const tinyW = Math.max(16, Math.round(origW * tinyScale));
    const tinyH = Math.max(16, Math.round(origH * tinyScale));

    if (!this.tinyCanvas) {
      this.tinyCanvas = document.createElement('canvas');
    }
    this.tinyCanvas.width = tinyW;
    this.tinyCanvas.height = tinyH;
    const tinyCtx = this.tinyCanvas.getContext('2d');

    const tinyBlur = Math.max(1, Math.round((blurAmount / 60) * 6 + 1.5));
    tinyCtx.filter = `blur(${tinyBlur}px) brightness(${brightness}%)`;
    tinyCtx.drawImage(img, 0, 0, tinyW, tinyH);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const scale = 1.08;
    const bgW = targetW * scale;
    const bgH = targetH * scale;
    ctx.drawImage(this.tinyCanvas, (targetW - bgW) / 2, (targetH - bgH) / 2, bgW, bgH);
    ctx.restore();

    // 2. Main Photo Container with Rounded Corners & Soft Drop Shadow
    const innerX = pad;
    const innerY = pad;
    const innerW = origW;
    const innerH = origH;
    const cornerRadius = Math.max(8, Math.round(Math.min(origW, origH) * 0.025));

    ctx.save();
    // Fast, lightweight drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.min(24, Math.round(pad * 0.4));
    ctx.shadowOffsetY = Math.min(10, Math.round(pad * 0.18));

    // Clip rounded rectangle
    ctx.beginPath();
    ctx.roundRect(innerX, innerY, innerW, innerH, cornerRadius);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.clip();

    ctx.drawImage(img, innerX, innerY, innerW, innerH);
    ctx.restore();

    // 3. Watermark Text & Logo Overlay
    const textScale = opts.textScale !== undefined ? opts.textScale : ((opts.textSizePercent || 100) / 100);
    const logoScale = opts.logoScale !== undefined ? opts.logoScale : ((opts.logoSizePercent || 100) / 100);

    // Base unit compact for landscape
    let baseUnit = Math.min(bottomExtra * 0.20, targetW * (isPortrait ? 0.021 : 0.016)) * textScale;
    const centerY = innerY + innerH + (targetH - (innerY + innerH)) / 2;
    const paddingX = innerX + Math.round(innerW * 0.035);

    // Logo dimensions (proportional for landscape)
    const brand = CAMERA_LOGOS[brandKey] || CAMERA_LOGOS.fujifilm;
    const aspect = brand.aspect || 3.2;

    const logoX = targetW / 2;
    let logoH = Math.round(bottomExtra * 0.35 * logoScale * landscapeScale);
    let logoW = Math.round(logoH * aspect);

    const maxLogoW = Math.round(targetW * 0.24);
    if (logoW > maxLogoW) {
      logoW = maxLogoW;
      logoH = Math.round(logoW / aspect);
    }

    const safetyGap = Math.round(targetW * 0.035);
    const maxLeftWidth = Math.max(50, (targetW / 2) - (logoW / 2) - paddingX - safetyGap);
    const maxRightWidth = Math.max(50, (targetW - paddingX) - ((targetW / 2) + (logoW / 2) + safetyGap));

    const paramParts = [meta.focalLength, meta.aperture, meta.shutterSpeed, meta.iso].filter(Boolean);
    const paramsText = paramParts.length > 0 ? paramParts.join('   ') : '';

    const modelText = meta.model || 'CAMERA';
    const lensText = meta.lens || '';
    const dateText = meta.dateTime || '';

    // Measure to prevent collision
    ctx.font = `bold ${Math.round(baseUnit * 1.2)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const modelW = ctx.measureText(modelText).width;

    ctx.font = `${Math.round(baseUnit * 0.95)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const lensW = lensText ? ctx.measureText(lensText).width : 0;

    ctx.font = `${Math.round(baseUnit * 0.82)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const dateW = dateText ? ctx.measureText(dateText).width : 0;

    const maxObservedLeft = Math.max(modelW, lensW, dateW);

    ctx.font = `600 ${Math.round(baseUnit * 1.08)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const paramsW = paramsText ? ctx.measureText(paramsText).width : 0;

    let leftRatio = maxObservedLeft > maxLeftWidth ? maxLeftWidth / maxObservedLeft : 1.0;
    let rightRatio = paramsW > maxRightWidth ? maxRightWidth / paramsW : 1.0;
    const autoFitRatio = Math.min(leftRatio, rightRatio, 1.0);

    baseUnit = Math.max(10, baseUnit * autoFitRatio);

    const fontBold = `bold ${Math.round(baseUnit * 1.2)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const fontRegular = `${Math.round(baseUnit * 0.95)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const fontSub = `${Math.round(baseUnit * 0.82)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const fontParams = `600 ${Math.round(baseUnit * 1.08)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif`;

    // Fast, crisp contrast shadow for text without expensive Gaussian blur
    const renderShadowText = (text, x, y, font, color, align = 'left') => {
      ctx.font = font;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      // Subtle shadow pass
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillText(text, x + 1, y + 1.5);
      // Crisp text pass
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };

    // Left Column
    const hasLens = !!lensText;
    const hasDate = !!dateText;
    const lineSpacing = baseUnit * 1.25;

    let startY = centerY;
    if (hasLens && hasDate) {
      startY = centerY - lineSpacing;
    } else if (hasLens || hasDate) {
      startY = centerY - lineSpacing * 0.5;
    }

    renderShadowText(modelText, paddingX, startY, fontBold, '#FFFFFF', 'left');

    if (hasLens) {
      renderShadowText(lensText, paddingX, startY + lineSpacing, fontRegular, '#E0E0E0', 'left');
    }

    if (hasDate) {
      const dateY = hasLens ? startY + lineSpacing * 2 : startY + lineSpacing;
      renderShadowText(dateText, paddingX, dateY, fontSub, '#B0B0B0', 'left');
    }

    // Center Logo
    if (opts.customLogo) {
      const aspect = opts.customLogo.width / opts.customLogo.height;
      const clW = logoH * aspect;
      ctx.drawImage(opts.customLogo, logoX - clW / 2, centerY - logoH / 2, clW, logoH);
    } else {
      const brand = CAMERA_LOGOS[brandKey] || CAMERA_LOGOS.fujifilm;
      brand.render(ctx, logoX, centerY, logoW, logoH, '#FFFFFF');
    }

    // Right Column
    renderShadowText(paramsText, targetW - paddingX, centerY, fontParams, '#FFFFFF', 'right');

    return canvas;
  }

  /**
   * 3. Camera Live View Style (Viewfinder HUD)
   */
  renderLiveView(img, meta, brandKey, opts) {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const isPortrait = origH > origW;
    const canvas = document.createElement('canvas');
    canvas.width = origW;
    canvas.height = origH;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, origW, origH);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    const textScale = opts.textScale !== undefined ? opts.textScale : ((opts.textSizePercent || 100) / 100);
    const baseUnit = Math.round(Math.min(origW, origH) * (isPortrait ? 0.024 : 0.019) * textScale);
    const pad = Math.round(Math.min(origW, origH) * 0.04);

    // Top left: Camera info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${baseUnit}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`[REC]  ${meta.model || 'RAW'}`, pad, pad);
    if (meta.lens) {
      ctx.font = `${Math.round(baseUnit * 0.85)}px monospace`;
      ctx.fillStyle = '#FFCC00';
      ctx.fillText(meta.lens, pad, pad + baseUnit * 1.4);
    }

    // Top right: Battery & Date
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00FF66';
    ctx.font = `bold ${baseUnit}px monospace`;
    ctx.fillText('⚡ 100%  RAW', origW - pad, pad);
    if (meta.dateTime) {
      ctx.font = `${Math.round(baseUnit * 0.8)}px monospace`;
      ctx.fillStyle = '#CCCCCC';
      ctx.fillText(meta.dateTime, origW - pad, pad + baseUnit * 1.4);
    }

    // Bottom HUD: Exposure parameters
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `bold ${Math.round(baseUnit * 1.15)}px monospace`;
    ctx.fillStyle = '#FFFFFF';
    const paramsText = [meta.focalLength, meta.aperture, meta.shutterSpeed, meta.iso].filter(Boolean).join('  |  ');
    ctx.fillText(paramsText, origW / 2, origH - pad);

    // Corner brackets
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(2, Math.round(baseUnit * 0.15));
    const bracketSize = baseUnit * 2;
    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(pad - 10, pad + bracketSize);
    ctx.lineTo(pad - 10, pad - 10);
    ctx.lineTo(pad + bracketSize, pad - 10);
    ctx.stroke();

    // Bottom-right bracket
    ctx.beginPath();
    ctx.moveTo(origW - pad + 10, origH - pad - bracketSize);
    ctx.lineTo(origW - pad + 10, origH - pad + 10);
    ctx.lineTo(origW - pad - bracketSize, origH - pad + 10);
    ctx.stroke();

    ctx.restore();
    return canvas;
  }

  /**
   * 4. Studio Mat Style (Mẫu Gallery / Apple Card viền trắng bao quanh như mẫu người dùng gửi)
   * Viền trắng bao quanh ảnh trên-trái-phải, đáy có logo và thông số 3 dòng (tiêu cự, F/S/ISO, GPS/Lens)
   * và tên máy + ngày giờ ở góc phải.
   * Tỉ lệ kích thước được đồng bộ tinh gọn, cân đối với các layout khác (iPhone Style & Leica Mat).
   */
  renderStudioMat(img, meta, brandKey, opts) {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const isPortrait = origH > origW;
    const landscapeScale = isPortrait ? 1.0 : 0.80;
    const baseDim = Math.min(origW, origH);

    // Padding around top, left, right (tinh gọn, viền thanh mảnh theo đúng tỉ lệ các layout khác)
    const marginRatio = opts.marginRatio !== undefined ? opts.marginRatio : 0.05;
    const pad = Math.max(24, Math.round(baseDim * ((isPortrait ? 0.038 : 0.030) + marginRatio * 0.35)));
    const bannerHeight = Math.max(75, Math.round(baseDim * ((isPortrait ? 0.10 : 0.080) + marginRatio * 0.5)));

    const targetW = origW + pad * 2;
    const targetH = origH + pad * 2 + bannerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // Clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);

    // Draw main photo with crisp borders
    ctx.drawImage(img, pad, pad, origW, origH);

    // Sizing calculations (đồng bộ baseUnit và logoScale nhỏ gọn vừa vặn)
    const textScale = opts.textScale !== undefined ? opts.textScale : 1.0;
    const logoScale = opts.logoScale !== undefined ? opts.logoScale : 1.0;

    let baseUnit = Math.min(bannerHeight * 0.15, targetW * (isPortrait ? 0.019 : 0.0135)) * textScale;
    const centerY = origH + pad + bannerHeight / 2;

    // Brand logo
    const brand = CAMERA_LOGOS[brandKey] || CAMERA_LOGOS.fujifilm;
    const aspect = brand.aspect || 1.0;

    let logoH = Math.round(bannerHeight * (isPortrait ? 0.34 : 0.28) * logoScale * landscapeScale);
    let logoW = Math.round(logoH * aspect);
    const maxLogoW = Math.round(targetW * (isPortrait ? 0.18 : 0.14));
    if (logoW > maxLogoW) {
      logoW = maxLogoW;
      logoH = Math.round(logoW / aspect);
    }

    const gapX = Math.round(targetW * 0.020);
    const textStartX = pad + logoW + gapX;

    // Content definitions
    const focalText = meta.focalLength || (meta.lens ? meta.lens.split(' ')[0] : '16mm');
    const modelText = meta.model || 'CAMERA';
    const dateText = meta.dateTime || '';
    const subText = meta.gps || meta.lens || '';

    // Measurement & collision detection
    ctx.font = `bold ${Math.round(baseUnit * 1.10)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const focalW = ctx.measureText(focalText).width;

    ctx.font = `700 ${Math.round(baseUnit * 1.12)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    const modelW = ctx.measureText(modelText).width;

    const exposureEstW = baseUnit * 10;
    const maxLeftEstW = Math.max(focalW, exposureEstW);

    const availableW = (targetW - pad) - textStartX;
    const minGap = Math.round(targetW * 0.04);
    if (maxLeftEstW + modelW + minGap > availableW) {
      const fitRatio = (availableW - minGap) / (maxLeftEstW + modelW);
      baseUnit = Math.max(10, baseUnit * Math.min(fitRatio, 1.0));
      logoH = Math.round(logoH * Math.min(fitRatio, 1.0));
      logoW = Math.round(logoH * aspect);
    }

    // 1. BRAND LOGO (Left edge aligned with photo left)
    const logoCenterY = centerY;
    if (opts.customLogo) {
      const cAspect = opts.customLogo.width / opts.customLogo.height;
      const clW = logoH * cAspect;
      ctx.drawImage(opts.customLogo, pad, logoCenterY - logoH / 2, clW, logoH);
    } else {
      brand.render(ctx, pad + logoW / 2, logoCenterY, logoW, logoH, '#111111');
    }

    // 2. 3-LINE TEXT BLOCK (Next to logo)
    const lineSpacing = baseUnit * 1.30;
    const hasSub = !!subText;
    const line1Y = hasSub ? centerY - lineSpacing : centerY - lineSpacing * 0.65;
    const line2Y = hasSub ? centerY : centerY + lineSpacing * 0.55;
    const line3Y = centerY + lineSpacing;

    // Line 1: Focal length (Bold)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(baseUnit * 1.10)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    ctx.fillStyle = '#111111';
    ctx.fillText(focalText, textStartX, line1Y);

    // Line 2: Exposure parameters (F, S, ISO with gray labels)
    this.drawStudioExposureRow(ctx, textStartX, line2Y, baseUnit, meta);

    // Line 3: GPS Coordinates or Lens (Subtle gray)
    if (hasSub) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `500 ${Math.round(baseUnit * 0.72)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      ctx.fillStyle = '#8E8E93';
      ctx.fillText(subText, textStartX, line3Y);
    }

    // 3. RIGHT BLOCK (Model name + DateTime, aligned to right edge of photo)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const rightX = targetW - pad;
    const rightModelY = dateText ? centerY - baseUnit * 0.65 : centerY;
    const rightDateY = centerY + baseUnit * 0.75;

    // Device Model Name
    ctx.font = `700 ${Math.round(baseUnit * 1.12)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    ctx.fillStyle = '#111111';
    ctx.fillText(modelText, rightX, rightModelY);

    // Date & Time
    if (dateText) {
      ctx.font = `400 ${Math.round(baseUnit * 0.75)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      ctx.fillStyle = '#8E8E93';
      ctx.fillText(dateText, rightX, rightDateY);
    }

    return canvas;
  }

  /**
   * Helper to draw "F 2.8   S 1/100s   ISO 200" with gray labels and dark bold values
   */
  drawStudioExposureRow(ctx, x, y, baseUnit, meta) {
    let curX = x;
    const parts = [];

    if (meta.aperture) {
      const apVal = meta.aperture.replace(/^f\//i, '');
      parts.push({ label: 'F ', val: apVal });
    }
    if (meta.shutterSpeed) {
      const ssVal = meta.shutterSpeed.replace(/s$/i, 's');
      parts.push({ label: 'S ', val: ssVal });
    }
    if (meta.iso) {
      const isoVal = meta.iso.replace(/^ISO/i, '');
      parts.push({ label: 'ISO ', val: isoVal });
    }

    if (parts.length === 0) return;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    parts.forEach((p, idx) => {
      // Gray prefix (F, S, ISO)
      ctx.font = `600 ${Math.round(baseUnit * 0.78)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      ctx.fillStyle = '#8E8E93';
      ctx.fillText(p.label, curX, y);
      curX += ctx.measureText(p.label).width;

      // Dark bold value
      ctx.font = `700 ${Math.round(baseUnit * 0.98)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      ctx.fillStyle = '#111111';
      ctx.fillText(p.val, curX, y);
      curX += ctx.measureText(p.val).width;

      // Space before next parameter
      if (idx < parts.length - 1) {
        curX += Math.round(baseUnit * 0.85);
      }
    });
  }

  /**
   * 5. Leica Dark Center (Mẫu thông tin nằm TRỰC TIẾP TRONG KHUNG HÌNH như hình đính kèm 1)
   * Giữ nguyên 100% kích thước ảnh (không thêm viền đen ngoài), logo và thông số căn giữa
   * phủ trực tiếp lên phần đáy ảnh với gradient mềm chống lóa.
   */
  renderLeicaDark(img, meta, brandKey, opts) {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const isPortrait = origH > origW;
    const landscapeScale = isPortrait ? 1.0 : 0.80;
    const baseDim = Math.min(origW, origH);

    const targetW = origW;
    const targetH = origH;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // 1. Draw 100% full-bleed main photo (no border, no crop)
    ctx.drawImage(img, 0, 0, origW, origH);

    // 2. Subtle protective bottom gradient for high contrast readability
    const gradH = Math.round(origH * (isPortrait ? 0.28 : 0.24));
    const grad = ctx.createLinearGradient(0, origH - gradH, 0, origH);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, origH - gradH, origW, gradH);

    // 3. Sizing calculations (scaled down for landscape)
    const textScale = opts.textScale !== undefined ? opts.textScale : 1.0;
    const logoScale = opts.logoScale !== undefined ? opts.logoScale : 1.0;
    const marginRatio = opts.marginRatio !== undefined ? opts.marginRatio : 0.05;

    let baseUnit = Math.max(11, Math.round(baseDim * (isPortrait ? 0.021 : 0.0165) * textScale));
    const centerX = targetW / 2;

    // Brand logo
    const brand = CAMERA_LOGOS[brandKey] || CAMERA_LOGOS.leica;
    const aspect = brand.aspect || 1.0;

    let logoH = Math.round(baseUnit * 2.2 * logoScale * landscapeScale);
    let logoW = Math.round(logoH * aspect);
    const maxLogoW = Math.round(targetW * 0.20);
    if (logoW > maxLogoW) {
      logoW = maxLogoW;
      logoH = Math.round(logoW / aspect);
    }

    // Texts
    const modelText = meta.model || 'CAMERA';
    const paramParts = [meta.focalLength, meta.aperture, meta.shutterSpeed, meta.iso].filter(Boolean);
    const paramsText = paramParts.join('   ');
    const gpsText = meta.gps || meta.lens || '';
    const dateText = meta.dateTime || '';

    // Subtle drop shadow for crisp readability on any photo background
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;

    // Calculate total height of the stack from bottom
    const lineGap = baseUnit * 1.32;
    const bottomPad = Math.max(28, Math.round(origH * (0.045 + marginRatio * 0.35)));

    let numLines = 2; // model + params
    if (gpsText) numLines++;
    if (dateText) numLines++;

    const totalTextHeight = (numLines - 1) * lineGap;
    const totalBlockHeight = logoH + baseUnit * 0.8 + totalTextHeight;

    // Start position of the logo
    const blockStartY = origH - bottomPad - totalBlockHeight;
    const logoCenterY = blockStartY + logoH / 2;

    // 1. Center Brand Logo
    if (opts.customLogo) {
      const cAspect = opts.customLogo.width / opts.customLogo.height;
      const clW = logoH * cAspect;
      ctx.drawImage(opts.customLogo, centerX - clW / 2, logoCenterY - logoH / 2, clW, logoH);
    } else {
      brand.render(ctx, centerX, logoCenterY, logoW, logoH, '#FFFFFF');
    }

    // 2. Line 1: Device Model Name (Bold White)
    let curY = logoCenterY + logoH / 2 + baseUnit * 1.0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(baseUnit * 1.25)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(modelText, centerX, curY);

    // 3. Line 2: Exposure Parameters
    if (paramsText) {
      curY += lineGap;
      ctx.font = `500 ${Math.round(baseUnit * 0.88)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", monospace`;
      ctx.fillStyle = '#F0F0F5';
      ctx.fillText(paramsText, centerX, curY);
    }

    // 4. Line 3: GPS Coordinates or Lens Model
    if (gpsText) {
      curY += lineGap * 0.95;
      ctx.font = `400 ${Math.round(baseUnit * 0.78)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      ctx.fillStyle = '#D5D5DC';
      ctx.fillText(gpsText, centerX, curY);
    }

    // 5. Line 4: Timestamp
    if (dateText) {
      curY += lineGap * 0.95;
      ctx.font = `400 ${Math.round(baseUnit * 0.75)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      ctx.fillStyle = '#B0B0B8';
      ctx.fillText(dateText, centerX, curY);
    }

    ctx.restore();
    return canvas;
  }

  /**
   * 6. Leica White Mat (Mẫu trắng Gallery căn giữa như hình đính kèm 2)
   * Khung viền trắng bao quanh, logo đỏ và thông số căn giữa thanh lịch
   */
  renderLeicaWhite(img, meta, brandKey, opts) {
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    const isPortrait = origH > origW;
    const landscapeScale = isPortrait ? 1.0 : 0.80;
    const baseDim = Math.min(origW, origH);

    const marginRatio = opts.marginRatio !== undefined ? opts.marginRatio : 0.05;
    const pad = Math.max(30, Math.round(baseDim * (0.045 + marginRatio * 0.4)));
    const bannerHeight = Math.max(90, Math.round(baseDim * ((isPortrait ? 0.135 : 0.115) + marginRatio * 0.55)));

    const targetW = origW + pad * 2;
    const targetH = origH + pad * 2 + bannerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // Pure white gallery background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);

    // Draw main photo with crisp borders
    ctx.drawImage(img, pad, pad, origW, origH);

    // Sizing calculations (scaled down for landscape)
    const textScale = opts.textScale !== undefined ? opts.textScale : 1.0;
    const logoScale = opts.logoScale !== undefined ? opts.logoScale : 1.0;

    let baseUnit = Math.min(bannerHeight * 0.155, targetW * (isPortrait ? 0.021 : 0.016)) * textScale;
    const centerX = targetW / 2;

    // Brand logo
    const brand = CAMERA_LOGOS[brandKey] || CAMERA_LOGOS.leica;
    const aspect = brand.aspect || 1.0;

    let logoH = Math.round(bannerHeight * 0.25 * logoScale * landscapeScale);
    let logoW = Math.round(logoH * aspect);
    const maxLogoW = Math.round(targetW * 0.20);
    if (logoW > maxLogoW) {
      logoW = maxLogoW;
      logoH = Math.round(logoW / aspect);
    }

    // Texts
    const modelText = meta.model || 'CAMERA';
    const paramParts = [meta.focalLength, meta.aperture, meta.shutterSpeed, meta.iso].filter(Boolean);
    const paramsText = paramParts.join('   ');
    const subParts = [meta.gps || meta.lens, meta.dateTime].filter(Boolean);
    const subText = subParts.length > 0 ? subParts.join('   •   ') : '';

    const contentStartY = origH + pad + bannerHeight * 0.18;
    const logoCenterY = contentStartY + logoH / 2;

    // 1. Center Brand Logo
    if (opts.customLogo) {
      const cAspect = opts.customLogo.width / opts.customLogo.height;
      const clW = logoH * cAspect;
      ctx.drawImage(opts.customLogo, centerX - clW / 2, logoCenterY - logoH / 2, clW, logoH);
    } else {
      brand.render(ctx, centerX, logoCenterY, logoW, logoH, '#111111');
    }

    // 2. Line 1: Model Name (Bold Dark)
    let curY = logoCenterY + logoH / 2 + baseUnit * 1.35;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(baseUnit * 1.25)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
    ctx.fillStyle = '#111111';
    ctx.fillText(modelText, centerX, curY);

    // 3. Line 2: Exposure Parameters (Subtle Gray)
    if (paramsText) {
      curY += baseUnit * 1.35;
      ctx.font = `500 ${Math.round(baseUnit * 0.88)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", monospace`;
      ctx.fillStyle = '#8E8E93';
      ctx.fillText(paramsText, centerX, curY);
    }

    // 4. Line 3 (Optional): Subtitle (GPS / Lens / Date)
    if (subText) {
      curY += baseUnit * 1.15;
      ctx.font = `400 ${Math.round(baseUnit * 0.75)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`;
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText(subText, centerX, curY);
    }

    return canvas;
  }
}
