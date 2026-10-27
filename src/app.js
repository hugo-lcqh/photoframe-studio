import { parseExif } from './exif.js';
import { FrameRenderer } from './renderer.js';
import { CAMERA_LOGOS, detectBrandLogo } from './logos.js';

class PhotoFrameApp {
  constructor() {
    this.renderer = new FrameRenderer();
    this.photos = []; // [{ id, file, name, img, previewImg, thumbUrl, meta, detectedBrand }]
    this.activePhotoId = null;

    this.defaultSettings = {
      style: 'iphone',
      textSize: 50,         // 0 to 100 (50 is default/balanced)
      frameMargin: 40,      // 0 to 100 (40 is default)
      logoSize: 50,         // 0 to 100 (50 is default/balanced)
      selectedBrand: 'auto',
      customLogo: null,
      bgBlur: 40,           // 0 to 100 (40 is default ~24px)
      bgBrightness: 80      // 0 to 100 (80 is default ~85%)
    };

    this.settings = { ...this.defaultSettings };
    this.previewCache = new Map();
    this.renderRaf = null;
    this.warmWorkerId = null;
    this.sliderDebounce = null;

    this.initDOMElements();
    this.initEventListeners();
    this.populateBrandDropdown();
  }

  initDOMElements() {
    // Inputs & drops
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.folderInput = document.getElementById('folderInput');
    this.addMoreBtn = document.getElementById('addMoreBtn');
    this.addFolderBtn = document.getElementById('addFolderBtn');
    this.clearAllBtn = document.getElementById('clearAllBtn');
    this.photoList = document.getElementById('photoList');
    this.photoCount = document.getElementById('photoCount');

    // Preview
    this.previewCanvas = document.getElementById('previewCanvas');
    this.emptyState = document.getElementById('emptyState');
    this.previewContainer = document.getElementById('previewContainer');
    this.loadingIndicator = document.getElementById('loadingIndicator');

    // Reset button
    this.resetSettingsBtn = document.getElementById('resetSettingsBtn');

    // Controls
    this.styleButtons = document.querySelectorAll('.style-btn');
    this.textSizeSlider = document.getElementById('textSize');
    this.textSizeInput = document.getElementById('textSizeInput');
    this.frameMarginSlider = document.getElementById('frameMargin');
    this.frameMarginInput = document.getElementById('frameMarginInput');
    this.logoSizeSlider = document.getElementById('logoSize');
    this.logoSizeInput = document.getElementById('logoSizeInput');
    this.brandSelect = document.getElementById('brandSelect');
    this.customLogoInput = document.getElementById('customLogoInput');
    this.selectLogoBtn = document.getElementById('selectLogoBtn');

    // Blur specific controls
    this.blurControls = document.getElementById('blurControls');
    this.bgBlurSlider = document.getElementById('bgBlur');
    this.bgBlurInput = document.getElementById('bgBlurInput');
    this.bgBrightnessSlider = document.getElementById('bgBrightness');
    this.bgBrightnessInput = document.getElementById('bgBrightnessInput');

    // Export
    this.downloadCurrentBtn = document.getElementById('downloadCurrentBtn');
    this.downloadAllBtn = document.getElementById('downloadAllBtn');
  }

  initEventListeners() {
    // Drag & Drop
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      window.addEventListener(evt, prevent, false);
    });

    window.addEventListener('dragover', () => document.body.classList.add('dragging'));
    window.addEventListener('dragleave', (e) => {
      if (e.clientX <= 0 || e.clientY <= 0) document.body.classList.remove('dragging');
    });
    window.addEventListener('drop', (e) => {
      document.body.classList.remove('dragging');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        this.handleFiles(Array.from(e.dataTransfer.files));
      }
    });

    // File buttons
    this.fileInput.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
      e.target.value = '';
    });
    this.folderInput.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
      e.target.value = '';
    });
    this.addMoreBtn.addEventListener('click', () => this.fileInput.click());
    this.addFolderBtn.addEventListener('click', () => this.folderInput.click());
    this.clearAllBtn.addEventListener('click', () => this.clearAll());

    // Style buttons
    this.styleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.styleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.style = btn.dataset.style;
        this.toggleBlurControls();
        this.renderActivePreview();
        this.warmCacheInBackground();
      });
    });

    // Sync Sliders and Number Inputs (0 - 100)
    this.setupSyncControl(this.textSizeSlider, this.textSizeInput, 'textSize');
    this.setupSyncControl(this.frameMarginSlider, this.frameMarginInput, 'frameMargin');
    this.setupSyncControl(this.logoSizeSlider, this.logoSizeInput, 'logoSize');
    this.setupSyncControl(this.bgBlurSlider, this.bgBlurInput, 'bgBlur');
    this.setupSyncControl(this.bgBrightnessSlider, this.bgBrightnessInput, 'bgBrightness');

    // Reset button
    if (this.resetSettingsBtn) {
      this.resetSettingsBtn.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }

    this.brandSelect.addEventListener('change', (e) => {
      this.settings.selectedBrand = e.target.value;
      this.renderActivePreview();
      this.warmCacheInBackground();
    });

    this.selectLogoBtn.addEventListener('click', () => this.customLogoInput.click());
    this.customLogoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const img = new Image();
        img.onload = () => {
          this.settings.customLogo = img;
          this.selectLogoBtn.textContent = 'Custom Logo ✓';
          this.renderActivePreview();
          this.warmCacheInBackground();
        };
        img.src = URL.createObjectURL(file);
      }
    });

    // Export buttons
    this.downloadCurrentBtn.addEventListener('click', () => this.downloadCurrent());
    this.downloadAllBtn.addEventListener('click', () => this.downloadAll());
  }

  setupSyncControl(slider, numInput, settingKey) {
    if (!slider || !numInput) return;
    const update = (val) => {
      let num = parseInt(val, 10);
      if (isNaN(num)) num = 0;
      if (num < 0) num = 0;
      if (num > 100) num = 100;
      slider.value = num;
      numInput.value = num;
      this.settings[settingKey] = num;
      this.renderActivePreview();

      // Debounce background pre-warming while user drags slider
      if (this.sliderDebounce) clearTimeout(this.sliderDebounce);
      this.sliderDebounce = setTimeout(() => {
        this.warmCacheInBackground();
      }, 250);
    };

    slider.addEventListener('input', (e) => update(e.target.value));
    numInput.addEventListener('input', (e) => update(e.target.value));
    numInput.addEventListener('change', (e) => update(e.target.value));
  }

  resetToDefaults() {
    this.settings.textSize = this.defaultSettings.textSize;
    this.settings.frameMargin = this.defaultSettings.frameMargin;
    this.settings.logoSize = this.defaultSettings.logoSize;
    this.settings.bgBlur = this.defaultSettings.bgBlur;
    this.settings.bgBrightness = this.defaultSettings.bgBrightness;

    if (this.textSizeSlider) this.textSizeSlider.value = this.settings.textSize;
    if (this.textSizeInput) this.textSizeInput.value = this.settings.textSize;

    if (this.frameMarginSlider) this.frameMarginSlider.value = this.settings.frameMargin;
    if (this.frameMarginInput) this.frameMarginInput.value = this.settings.frameMargin;

    if (this.logoSizeSlider) this.logoSizeSlider.value = this.settings.logoSize;
    if (this.logoSizeInput) this.logoSizeInput.value = this.settings.logoSize;

    if (this.bgBlurSlider) this.bgBlurSlider.value = this.settings.bgBlur;
    if (this.bgBlurInput) this.bgBlurInput.value = this.settings.bgBlur;

    if (this.bgBrightnessSlider) this.bgBrightnessSlider.value = this.settings.bgBrightness;
    if (this.bgBrightnessInput) this.bgBrightnessInput.value = this.settings.bgBrightness;

    this.renderActivePreview();
    this.warmCacheInBackground();
  }

  populateBrandDropdown() {
    this.brandSelect.innerHTML = '<option value="auto">Auto Detect Brand</option>';
    for (const [key, brand] of Object.entries(CAMERA_LOGOS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = brand.name;
      this.brandSelect.appendChild(opt);
    }
  }

  toggleBlurControls() {
    if (this.settings.style === 'blur') {
      this.blurControls.style.display = 'block';
    } else {
      this.blurControls.style.display = 'none';
    }
  }

  getSettingsKey() {
    return `${this.settings.style}_${this.settings.textSize}_${this.settings.frameMargin}_${this.settings.logoSize}_${this.settings.bgBlur}_${this.settings.bgBrightness}_${this.settings.selectedBrand}_${this.settings.customLogo ? 'custom' : 'default'}`;
  }

  /**
   * Generates a compact 120x120 JPEG thumbnail data URL (~3-5 KB)
   * Prevents browser memory bloat from holding 18 full 24MP images in DOM
   */
  createThumbnail(img, size = 120) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const minDim = Math.min(w, h);
    const sx = (w - minDim) / 2;
    const sy = (h - minDim) / 2;
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  /**
   * Downsamples high-res camera photos to 1200px max for instant 60fps canvas previews
   */
  createPreviewCanvas(img, maxDim = 1200) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (Math.max(w, h) <= maxDim) {
      return img;
    }
    const scale = maxDim / Math.max(w, h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async handleFiles(files) {
    const validFiles = files.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|tiff?)$/i.test(f.name));
    if (validFiles.length === 0) return;

    this.showLoading(true, 'Đang đọc EXIF và nạp ảnh...');

    for (const file of validFiles) {
      const id = 'p_' + Math.random().toString(36).substring(2, 9);
      try {
        const [meta, img] = await Promise.all([
          parseExif(file),
          this.loadImage(file)
        ]);

        const detected = detectBrandLogo(meta.model, meta.make);
        const previewImg = this.createPreviewCanvas(img, 1200);
        const thumbUrl = this.createThumbnail(previewImg || img, 120);

        this.photos.push({
          id,
          file,
          name: file.name,
          img,             // Full camera resolution (24MP-40MP) for pristine export
          previewImg,      // 1200px downscaled buffer for instant UI preview
          thumbUrl,        // Lightweight 120px JPEG for silky-smooth sidebar
          meta,
          detectedBrand: detected
        });
      } catch (err) {
        console.error('Failed to load image:', file.name, err);
      }
    }

    this.updatePhotoList();

    if (!this.activePhotoId && this.photos.length > 0) {
      this.setActivePhoto(this.photos[0].id);
    } else if (this.activePhotoId) {
      this.renderActivePreview();
    }

    this.showLoading(false);
    this.warmCacheInBackground();
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  updatePhotoList() {
    this.photoCount.textContent = `(${this.photos.length})`;
    this.photoList.innerHTML = '';

    if (this.photos.length === 0) {
      this.emptyState.style.display = 'flex';
      if (this.previewCanvas) this.previewCanvas.style.display = 'none';
      return;
    }

    this.emptyState.style.display = 'none';

    this.photos.forEach(item => {
      const div = document.createElement('div');
      div.className = `photo-thumb-card ${item.id === this.activePhotoId ? 'active' : ''}`;
      div.dataset.id = item.id;
      div.innerHTML = `
        <img src="${item.thumbUrl || item.img.src}" alt="${item.name}" loading="lazy" />
        <div class="thumb-info">
          <div class="thumb-title">${item.name}</div>
          <div class="thumb-meta">${item.meta.model || 'Unknown'}</div>
        </div>
        <button class="thumb-del-btn" title="Remove">&times;</button>
      `;

      // Click anywhere on card switches photo instantly
      div.addEventListener('click', (e) => {
        if (e.target.closest('.thumb-del-btn')) return;
        this.setActivePhoto(item.id);
      });

      div.querySelector('.thumb-del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removePhoto(item.id);
      });

      this.photoList.appendChild(div);
    });
  }

  setActivePhoto(id) {
    if (this.activePhotoId === id) return;
    this.activePhotoId = id;

    // 1. Instant class toggle without rebuilding sidebar DOM
    document.querySelectorAll('.photo-thumb-card').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });

    const current = this.photos.find(p => p.id === id);
    if (!current) return;

    // 2. Ultra-fast cache lookup: if ready, display immediately (0ms latency!)
    const cacheKey = `${current.id}_${this.getSettingsKey()}`;
    if (this.previewCache.has(cacheKey)) {
      this.displayPreviewCanvas(this.previewCache.get(cacheKey));
      return;
    }

    // 3. Fallback render if not cached yet
    this.renderActivePreview();
  }

  removePhoto(id) {
    const idx = this.photos.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.photos.splice(idx, 1);
      if (this.activePhotoId === id) {
        this.activePhotoId = this.photos.length > 0 ? this.photos[0].id : null;
      }
      this.updatePhotoList();
      if (this.activePhotoId) {
        this.setActivePhoto(this.activePhotoId);
      } else {
        this.emptyState.style.display = 'flex';
        this.previewContainer.innerHTML = '';
      }
    }
  }

  clearAll() {
    this.photos = [];
    this.activePhotoId = null;
    this.previewCache.clear();
    if (this.warmWorkerId) {
      if ('cancelIdleCallback' in window) cancelIdleCallback(this.warmWorkerId);
      else clearTimeout(this.warmWorkerId);
      this.warmWorkerId = null;
    }
    this.updatePhotoList();
    this.emptyState.style.display = 'flex';
    this.previewContainer.innerHTML = '';
  }

  renderActivePreview() {
    if (this.renderRaf) cancelAnimationFrame(this.renderRaf);

    const active = this.photos.find(p => p.id === this.activePhotoId);
    if (!active) {
      this.emptyState.style.display = 'flex';
      if (this.previewCanvas) this.previewCanvas.style.display = 'none';
      return;
    }

    const cacheKey = `${active.id}_${this.getSettingsKey()}`;
    if (this.previewCache.has(cacheKey)) {
      this.displayPreviewCanvas(this.previewCache.get(cacheKey));
      return;
    }

    this.renderRaf = requestAnimationFrame(() => {
      const sourceImg = active.previewImg || active.img;
      const rendered = this.renderer.render(sourceImg, active.meta, this.settings);

      // Save to cache
      if (this.previewCache.size > 80) {
        const oldestKey = this.previewCache.keys().next().value;
        this.previewCache.delete(oldestKey);
      }
      this.previewCache.set(cacheKey, rendered);

      this.displayPreviewCanvas(rendered);
      this.warmCacheInBackground();
    });
  }

  displayPreviewCanvas(canvas) {
    if (!canvas) return;
    this.emptyState.style.display = 'none';
    canvas.id = 'previewCanvas';
    canvas.style.display = 'block';

    // Direct DOM element swap: 0ms texture switch, no context recreation, no reflow
    if (this.previewContainer.firstElementChild !== canvas) {
      this.previewContainer.replaceChildren(canvas);
    }
    this.previewCanvas = canvas;
  }

  /**
   * Background pre-render queue: Pre-heats all photos in idle slices
   * Guarantees 0ms instant switching between any of the 18 photos
   */
  warmCacheInBackground() {
    if (this.warmWorkerId) {
      if ('cancelIdleCallback' in window) cancelIdleCallback(this.warmWorkerId);
      else clearTimeout(this.warmWorkerId);
      this.warmWorkerId = null;
    }

    if (this.photos.length <= 1) return;

    const settingsKey = this.getSettingsKey();
    const activeIdx = this.photos.findIndex(p => p.id === this.activePhotoId);
    const queue = [...this.photos];

    // Prioritize adjacent photos first
    if (activeIdx !== -1) {
      queue.sort((a, b) => {
        const distA = Math.abs(this.photos.indexOf(a) - activeIdx);
        const distB = Math.abs(this.photos.indexOf(b) - activeIdx);
        return distA - distB;
      });
    }

    const unrendered = queue.filter(p => !this.previewCache.has(`${p.id}_${settingsKey}`));
    if (unrendered.length === 0) return;

    let i = 0;
    const runChunk = (deadline) => {
      const start = performance.now();
      while (i < unrendered.length && ((deadline && deadline.timeRemaining() > 6) || (performance.now() - start < 14))) {
        const p = unrendered[i++];
        const key = `${p.id}_${settingsKey}`;
        if (!this.previewCache.has(key)) {
          const source = p.previewImg || p.img;
          const rendered = this.renderer.render(source, p.meta, this.settings);
          this.previewCache.set(key, rendered);
        }
      }

      if (i < unrendered.length) {
        if ('requestIdleCallback' in window) {
          this.warmWorkerId = requestIdleCallback(runChunk, { timeout: 80 });
        } else {
          this.warmWorkerId = setTimeout(runChunk, 16);
        }
      }
    };

    if ('requestIdleCallback' in window) {
      this.warmWorkerId = requestIdleCallback(runChunk, { timeout: 80 });
    } else {
      this.warmWorkerId = setTimeout(runChunk, 16);
    }
  }

  async downloadCurrent() {
    const active = this.photos.find(p => p.id === this.activePhotoId);
    if (!active) return;

    // Render using 100% full-resolution original camera image
    const rendered = this.renderer.render(active.img, active.meta, this.settings);
    rendered.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = active.name.replace(/\.[^/.]+$/, '');
      link.download = `${baseName}_framed.jpg`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/jpeg', 0.98);
  }

  async downloadAll() {
    if (this.photos.length === 0) return;

    // Check if JSZip is available for convenient 1-click batch download
    if (typeof JSZip !== 'undefined') {
      try {
        const zip = new JSZip();
        const total = this.photos.length;

        for (let i = 0; i < total; i++) {
          const p = this.photos[i];
          this.showLoading(true, `Đang kết xuất ảnh gốc (${i + 1}/${total}): ${p.name}...`);

          // Render using 100% full-resolution original camera image
          const rendered = this.renderer.render(p.img, p.meta, this.settings);

          const blob = await new Promise((resolve) => {
            rendered.toBlob(resolve, 'image/jpeg', 0.98);
          });

          if (blob) {
            const baseName = p.name.replace(/\.[^/.]+$/, '');
            zip.file(`${baseName}_framed.jpg`, blob);
          }
        }

        this.showLoading(true, 'Đang nén toàn bộ ảnh vào file ZIP...');

        const zipBlob = await zip.generateAsync(
          {
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 5 }
          },
          (metadata) => {
            if (metadata.percent) {
              this.showLoading(true, `Đang nén file ZIP: ${Math.round(metadata.percent)}%...`);
            }
          }
        );

        // Download single ZIP file
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        link.download = `PhotoFrame_Export_${timestamp}.zip`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        this.showLoading(false);
        return;
      } catch (err) {
        console.error('Lỗi khi đóng gói ZIP, chuyển sang chế độ tải từng file:', err);
      }
    }

    // Fallback if JSZip is not available
    this.showLoading(true, 'Đang xuất toàn bộ ảnh ở chất lượng gốc cao nhất...');

    for (let i = 0; i < this.photos.length; i++) {
      const p = this.photos[i];
      // Render using 100% full-resolution original camera image
      const rendered = this.renderer.render(p.img, p.meta, this.settings);
      await new Promise((resolve) => {
        rendered.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const baseName = p.name.replace(/\.[^/.]+$/, '');
          link.download = `${baseName}_framed.jpg`;
          link.href = url;
          link.click();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            resolve();
          }, 450);
        }, 'image/jpeg', 0.98);
      });
    }

    this.showLoading(false);
  }

  showLoading(show, message = 'Processing...') {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = show ? 'flex' : 'none';
      const msgEl = this.loadingIndicator.querySelector('.loading-text');
      if (msgEl) msgEl.textContent = message;
    }
  }
}

// Launch app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.photoFrameApp = new PhotoFrameApp();
});