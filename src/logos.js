// SVG Vector Logo Paths from official camera brand assets

// Official FUJIFILM Vector Logo Paths (from fujifilm-logo.svg, viewBox 0 0 1028.935 172.877)
const FUJI_VB_W = 1028.935;
const FUJI_VB_H = 172.877;
const FUJI_PATH_LETTERS_1 = "M783.786.02v134.021c0 8.71 4.3 13.184 13.066 13.629.109.009 44.162.009 44.162.009v15.035c0 1.679-.907 2.858-2.776 2.858h-71.493c-22.086 0-25.352-12.158-25.352-23.201V9.13c0-6.288 2.395-9.264 9.827-9.101zM701.394.02l.01 156.823c0 6.978-2.958 8.73-8.893 8.73h-33.546V8.676c0-5.172 1.978-8.647 9.5-8.647zM0 22.839C0 10.217.027 0 20.76 0h91.138v15.934c0 1.134-.535 2.16-2.123 2.16l-54.615-.019c-7.341 0-11.034 3.52-11.034 10.925v42.039h64.26l.01 16.696c0 1.479-.926 2.259-2.378 2.259H44.126v66.702c-.136 6.433-3.348 8.992-10.408 8.865H0zM177.718.005v126.189c0 10.834 1.533 18.429 9.137 22.82 10.19 5.899 27.448 5.99 37.838.164 7.105-3.965 9.818-10.335 9.818-22.948V8.416c0-5.3 2.023-8.411 9.427-8.411h32.984l.009 122.46c0 28.446-17.912 40.115-33.746 44.443-21.069 5.744-53.072 5.835-72.953-.136-23.755-7.15-34.853-21.215-34.88-44.298l-.018-113.967c0-5.499 1.978-8.502 8.303-8.502zM979.892.03c-8.367 0-13.14 3.902-15.027 11.37l-27.012 114.157-.735-.018L909.216.029h-38.147c-7.359 0-9.672 3.785-9.672 9.628v155.916h16.115c2.595 0 3.666-1.289 3.666-3.93V30.918h2.55l34.489 134.656h22.585c8.51 0 11.678-3.494 13.774-11.905l30.96-122.75h2.504l-.01 134.655 30.135-.046c7.395 0 10.77-2.84 10.77-10.108V.02zM478.475 89.989h-42.411v75.584H469.6c5.908 0 8.884-1.733 8.884-8.729 0 0-.01-32.33-.01-66.855";
const FUJI_PATH_RED_DOT = "M476.003 57.69c1.488-1.207 2.36-2.115 2.468-4.71V.034h-32.929c-7.413 0-9.473 3.62-9.473 8.775v80.158z";
const FUJI_PATH_LETTERS_2 = "M330.608 152.477c18.42-2.604 24.544-13.547 24.544-29.68V9.01c0-6.805 3.684-9.01 8.44-9.01h33.971v107.588c0 26.46-5.57 39.825-21.241 51.104-8.158 5.852-22.422 12.53-53.327 12.53-17.694 0-25.561-.997-26.623-1.242-1.497-.345-2.105-1.262-2.105-2.56V153.53c7.268.208 23.91.717 36.34-1.053M542.727.005c-20.715 0-20.724 10.217-20.724 22.838V65.5c0 .88-.381 1.234-.78 1.624l-29.01 22.857h29.79v75.576h33.7c7.06.136 10.271-2.432 10.39-8.856V90h61.892c1.452 0 2.386-.79 2.386-2.26V71.034h-64.279V28.995c0-7.395 3.702-10.925 11.034-10.925l54.633.019c1.57 0 2.124-1.017 2.124-2.15V.004z";

let fujiPaths = null;
function getFujiPaths() {
  if (!fujiPaths && typeof Path2D !== 'undefined') {
    fujiPaths = {
      p1: new Path2D(FUJI_PATH_LETTERS_1),
      pRed: new Path2D(FUJI_PATH_RED_DOT),
      p2: new Path2D(FUJI_PATH_LETTERS_2)
    };
  }
  return fujiPaths;
}

const APPLE_SVG_PATH = "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.65-.79 1.1-1.89.98-2.99-.95.04-2.1.63-2.78 1.42-.6.69-1.12 1.81-.98 2.89 1.05.08 2.13-.53 2.78-1.32z";
let applePath = null;
function getApplePath() {
  if (!applePath && typeof Path2D !== 'undefined') {
    applePath = new Path2D(APPLE_SVG_PATH);
  }
  return applePath;
}

export const CAMERA_LOGOS = {
  fujifilm: {
    name: 'FUJIFILM',
    keywords: ['fujifilm', 'fuji', 'x-t', 'x100', 'gfx', 'x-pro', 'x-h', 'x-s', 'x-e', 'x-a'],
    aspect: FUJI_VB_W / FUJI_VB_H, // ~5.95
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      const scale = Math.min(width / FUJI_VB_W, height / FUJI_VB_H);
      const drawW = FUJI_VB_W * scale;
      const drawH = FUJI_VB_H * scale;

      ctx.translate(x - drawW / 2, y - drawH / 2);
      ctx.scale(scale, scale);

      const paths = getFujiPaths();
      if (paths) {
        // Letters in specified color (black or white)
        ctx.fillStyle = color;
        ctx.fill(paths.p1);

        // Iconic Red Mark above the 'J'
        ctx.fillStyle = '#ED1A3A';
        ctx.fill(paths.pRed);

        // Remaining letters in specified color
        ctx.fillStyle = color;
        ctx.fill(paths.p2);
      } else {
        // Fallback for canvas environments without Path2D
        ctx.fillStyle = color;
        ctx.font = `bold ${drawH * 0.75}px -apple-system, "SF Pro Display", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FUJIFILM', FUJI_VB_W / 2, FUJI_VB_H / 2);
      }
      ctx.restore();
    }
  },
  sony: {
    name: 'SONY',
    keywords: ['sony', 'ilce', 'a7', 'a9', 'a1', 'a6', 'zv-', 'fx'],
    aspect: 4.2,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${height * 0.75}px "Times New Roman", "Baskerville", serif`;
      ctx.letterSpacing = '3px';
      ctx.fillText('SONY', x, y);
      ctx.restore();
    }
  },
  canon: {
    name: 'Canon',
    keywords: ['canon', 'eos', 'powershot', 'ixus'],
    aspect: 3.8,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      ctx.fillStyle = color === '#000000' || color === '#ffffff' ? color : '#C41230';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold italic ${height * 0.8}px "Times New Roman", Georgia, serif`;
      ctx.letterSpacing = '1px';
      ctx.fillText('Canon', x, y);
      ctx.restore();
    }
  },
  nikon: {
    name: 'Nikon',
    keywords: ['nikon', 'coolpix', 'z5', 'z6', 'z7', 'z8', 'z9', 'z30', 'z50', 'zfc', 'd850', 'd750'],
    aspect: 3.6,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `italic 900 ${height * 0.85}px "Arial Black", "Impact", sans-serif`;
      ctx.letterSpacing = '2px';
      ctx.fillText('Nikon', x, y);
      ctx.restore();
    }
  },
  leica: {
    name: 'Leica',
    keywords: ['leica', 'typ', 'm10', 'm11', 'sl2', 'q2', 'q3', 'cl', 'd-lux'],
    aspect: 2.2,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      const radius = height * 0.5;
      ctx.fillStyle = '#E30613';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `italic bold ${height * 0.55}px "Brush Script MT", "Snell Roundhand", cursive, Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Leica', x, y + height * 0.02);
      ctx.restore();
    }
  },
  hasselblad: {
    name: 'HASSELBLAD',
    keywords: ['hasselblad', 'x1d', 'x2d', 'h6d', '907x'],
    aspect: 5.0,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `italic 700 ${height * 0.7}px "Didot", "Bodoni MT", serif`;
      ctx.letterSpacing = '3px';
      ctx.fillText('HASSELBLAD', x, y);
      ctx.restore();
    }
  },
  apple: {
    name: 'Apple',
    keywords: ['apple', 'iphone', 'ipad'],
    aspect: 0.83, // 20 / 24
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      const p = getApplePath();
      if (p) {
        const scale = Math.min(width / 20, height / 24);
        ctx.translate(x - 12 * scale, y - 12 * scale);
        ctx.scale(scale, scale);
        ctx.fillStyle = color;
        ctx.fill(p);
      } else {
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${height * 0.8}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText('', x, y);
      }
      ctx.restore();
    }
  },
  lumix: {
    name: 'LUMIX',
    keywords: ['lumix', 'panasonic', 'dc-s', 'dmc', 's5', 'gh5', 'gh6', 'g9'],
    aspect: 4.2,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${height * 0.72}px "SF Pro Display", sans-serif`;
      ctx.letterSpacing = '3px';
      ctx.fillText('LUMIX', x, y);
      ctx.restore();
    }
  },
  ricoh: {
    name: 'RICOH',
    keywords: ['ricoh', 'gr iii', 'gr ii', 'gr3', 'gr2', 'pentax'],
    aspect: 3.8,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${height * 0.75}px "Helvetica Neue", Arial, sans-serif`;
      ctx.letterSpacing = '2px';
      ctx.fillText('RICOH', x, y);
      ctx.restore();
    }
  },
  olympus: {
    name: 'OLYMPUS',
    keywords: ['olympus', 'om digital', 'om system', 'e-m', 'om-1', 'om-5'],
    aspect: 4.5,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${height * 0.7}px "Century Gothic", sans-serif`;
      ctx.letterSpacing = '4px';
      ctx.fillText('OLYMPUS', x, y);
      ctx.restore();
    }
  },
  xiaomi: {
    name: 'Xiaomi',
    keywords: ['xiaomi', 'mi ', 'redmi', 'poco'],
    aspect: 1.0,
    render: (ctx, x, y, width, height, color = '#000000') => {
      ctx.save();
      const radius = height * 0.45;
      ctx.fillStyle = '#FF6900';
      ctx.beginPath();
      ctx.roundRect(x - radius, y - radius, radius * 2, radius * 2, radius * 0.42);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${height * 0.44}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText('mi', x, y);
      ctx.restore();
    }
  }
};

export function detectBrandLogo(cameraModel = '', make = '') {
  const text = `${make} ${cameraModel}`.toLowerCase();
  for (const [key, brand] of Object.entries(CAMERA_LOGOS)) {
    if (brand.keywords.some(kw => text.includes(kw))) {
      return key;
    }
  }
  return 'fujifilm';
}
