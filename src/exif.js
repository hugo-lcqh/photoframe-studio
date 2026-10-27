/**
 * Standalone EXIF Parser for Camera Photos
 * Extracts: Make, Model, LensModel, DateTimeOriginal, FocalLength, FNumber, ExposureTime, ISO
 */

export async function parseExif(file) {
  const defaultMeta = {
    make: '',
    model: 'CAMERA',
    lens: '',
    dateTime: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
    iso: ''
  };

  try {
    // Read first 512KB to ensure all EXIF SubIFD tags are covered safely
    const buffer = await file.slice(0, 524288).arrayBuffer();
    const view = new DataView(buffer);

    // Check JPEG SOI marker (0xFFD8)
    if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) {
      return defaultMeta;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset + 4 < length) {
      if (view.getUint8(offset) !== 0xFF) break;
      const marker = view.getUint8(offset + 1);

      // APP1 Marker (0xFFE1) contains EXIF
      if (marker === 0xE1) {
        return readExifBlock(view, offset + 4);
      }

      // Stop before Start of Scan
      if (marker === 0xDA || marker === 0xD9) break;

      const segLen = view.getUint16(offset + 2);
      if (segLen < 2) break;
      offset += 2 + segLen;
    }
  } catch (err) {
    console.warn('Could not parse EXIF:', err);
  }

  return defaultMeta;
}

function readExifBlock(view, startOffset) {
  const result = {
    make: '',
    model: '',
    lens: '',
    dateTime: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
    iso: ''
  };

  if (startOffset + 14 >= view.byteLength) return result;

  // Check "Exif\0\0" header (0x457869660000)
  if (view.getUint32(startOffset) !== 0x45786966 || view.getUint16(startOffset + 4) !== 0x0000) {
    return result;
  }

  const tiffOffset = startOffset + 6;
  const isLittleEndian = view.getUint16(tiffOffset) === 0x4949; // "II" = Little Endian, "MM" = Big Endian

  // First IFD offset
  const ifd0Offset = tiffOffset + view.getUint32(tiffOffset + 4, isLittleEndian);
  if (ifd0Offset < view.byteLength) {
    parseIFD(view, tiffOffset, ifd0Offset, isLittleEndian, result);
  }

  // Format extracted parameters nicely
  formatMetadata(result);
  return result;
}

function parseIFD(view, tiffOffset, ifdOffset, isLittleEndian, result) {
  try {
    if (ifdOffset + 2 > view.byteLength) return;
    const numEntries = view.getUint16(ifdOffset, isLittleEndian);
    let subExifOffset = null;
    let gpsOffset = null;

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, isLittleEndian);

      switch (tag) {
        case 0x010F: // Make
          result.make = readString(view, tiffOffset, entryOffset, isLittleEndian);
          break;
        case 0x0110: // Model
          result.model = readString(view, tiffOffset, entryOffset, isLittleEndian);
          break;
        case 0x0132: // DateTime
        case 0x9003: // DateTimeOriginal
        case 0x9004: // DateTimeDigitized
          if (!result.dateTime) {
            result.dateTime = readString(view, tiffOffset, entryOffset, isLittleEndian);
          }
          break;
        case 0x8769: // Exif SubIFD Offset
          subExifOffset = tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian);
          break;
        case 0x8825: // GPS IFD Offset
          gpsOffset = tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian);
          break;
        case 0xA434: // LensModel
          result.lens = readString(view, tiffOffset, entryOffset, isLittleEndian);
          break;
      }
    }

    if (subExifOffset && subExifOffset < view.byteLength) {
      parseSubIFD(view, tiffOffset, subExifOffset, isLittleEndian, result);
    }

    if (gpsOffset && gpsOffset < view.byteLength) {
      parseGpsIFD(view, tiffOffset, gpsOffset, isLittleEndian, result);
    }
  } catch (e) {
    console.warn('Error reading IFD:', e);
  }
}

function parseSubIFD(view, tiffOffset, ifdOffset, isLittleEndian, result) {
  try {
    if (ifdOffset + 2 > view.byteLength) return;
    const numEntries = view.getUint16(ifdOffset, isLittleEndian);

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, isLittleEndian);

      switch (tag) {
        case 0x9003: // DateTimeOriginal
          result.dateTime = readString(view, tiffOffset, entryOffset, isLittleEndian);
          break;
        case 0x829A: // ExposureTime
          result.shutterSpeed = readRational(view, tiffOffset, entryOffset, isLittleEndian);
          break;
        case 0x829D: // FNumber
          result.aperture = readRational(view, tiffOffset, entryOffset, isLittleEndian);
          break;
        case 0x8827: // ISO
          result.iso = view.getUint16(entryOffset + 8, isLittleEndian);
          break;
        case 0x920A: // FocalLength
          result.focalLength = readRational(view, tiffOffset, entryOffset, isLittleEndian);
          break;
        case 0xA434: // LensModel
          if (!result.lens) {
            result.lens = readString(view, tiffOffset, entryOffset, isLittleEndian);
          }
          break;
      }
    }
  } catch (e) {
    console.warn('Error reading SubIFD:', e);
  }
}

function readString(view, tiffOffset, entryOffset, isLittleEndian) {
  try {
    const count = view.getUint32(entryOffset + 4, isLittleEndian);
    let valueOffset = entryOffset + 8;
    if (count > 4) {
      valueOffset = tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian);
    }
    if (valueOffset >= view.byteLength) return '';

    let str = '';
    const maxLen = Math.min(count, 128); // prevent runaway strings
    for (let i = 0; i < maxLen; i++) {
      if (valueOffset + i >= view.byteLength) break;
      const charCode = view.getUint8(valueOffset + i);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }
    return str.trim();
  } catch {
    return '';
  }
}

function readRational(view, tiffOffset, entryOffset, isLittleEndian) {
  try {
    const valueOffset = tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian);
    if (valueOffset + 8 > view.byteLength) return { numerator: 0, denominator: 1, value: 0 };

    const numerator = view.getUint32(valueOffset, isLittleEndian);
    const denominator = view.getUint32(valueOffset + 4, isLittleEndian);
    return { numerator, denominator, value: denominator ? numerator / denominator : 0 };
  } catch {
    return { numerator: 0, denominator: 1, value: 0 };
  }
}

function readRationalArray(view, tiffOffset, entryOffset, isLittleEndian, count = 3) {
  try {
    const valueOffset = tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian);
    const arr = [];
    for (let i = 0; i < count; i++) {
      const pos = valueOffset + i * 8;
      if (pos + 8 > view.byteLength) break;
      const num = view.getUint32(pos, isLittleEndian);
      const den = view.getUint32(pos + 4, isLittleEndian);
      arr.push({ numerator: num, denominator: den, value: den ? num / den : 0 });
    }
    return arr;
  } catch {
    return [];
  }
}

function parseGpsIFD(view, tiffOffset, ifdOffset, isLittleEndian, result) {
  try {
    if (ifdOffset + 2 > view.byteLength) return;
    const numEntries = view.getUint16(ifdOffset, isLittleEndian);
    let latRef = 'N', lonRef = 'E';
    let lat = null, lon = null;

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;
      const tag = view.getUint16(entryOffset, isLittleEndian);

      if (tag === 0x0001) { // LatitudeRef
        latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
      } else if (tag === 0x0002) { // Latitude (3 rationals)
        lat = readRationalArray(view, tiffOffset, entryOffset, isLittleEndian, 3);
      } else if (tag === 0x0003) { // LongitudeRef
        lonRef = String.fromCharCode(view.getUint8(entryOffset + 8));
      } else if (tag === 0x0004) { // Longitude (3 rationals)
        lon = readRationalArray(view, tiffOffset, entryOffset, isLittleEndian, 3);
      }
    }

    if (lat && lon && lat.length === 3 && lon.length === 3) {
      const latStr = `${Math.floor(lat[0].value)}°${Math.floor(lat[1].value)}'${Math.round(lat[2].value)}"${latRef}`;
      const lonStr = `${Math.floor(lon[0].value)}°${Math.floor(lon[1].value)}'${Math.round(lon[2].value)}"${lonRef}`;
      result.gps = `${latStr}  ${lonStr}`;
    }
  } catch (e) {
    console.warn('Error reading GPS IFD:', e);
  }
}

function formatMetadata(meta) {
  // Clean Model name (if Make is repeated in Model like 'FUJIFILM X-T2')
  if (meta.make && meta.model && !meta.model.toLowerCase().includes(meta.make.toLowerCase())) {
    meta.model = `${meta.make.toUpperCase()} ${meta.model}`;
  } else if (meta.model) {
    meta.model = meta.model.trim();
  }

  // Format Date (YYYY:MM:DD HH:MM:SS -> YYYY.MM.DD HH:MM:SS)
  if (meta.dateTime) {
    const parts = meta.dateTime.split(' ');
    if (parts.length >= 2) {
      const datePart = parts[0].replace(/:/g, '.');
      meta.dateTime = `${datePart} ${parts[1]}`;
    }
  }

  // Format Aperture
  if (meta.aperture && meta.aperture.value) {
    const val = meta.aperture.value;
    meta.aperture = `f/${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}`;
  } else {
    meta.aperture = '';
  }

  // Format Shutter Speed (e.g. 1/250s, 1/1000s, or 2s)
  if (meta.shutterSpeed) {
    const { numerator, denominator, value } = meta.shutterSpeed;
    if (value >= 1) {
      meta.shutterSpeed = `${value.toFixed(value % 1 === 0 ? 0 : 1)}s`;
    } else if (value > 0) {
      meta.shutterSpeed = `1/${Math.round(1 / value)}s`;
    } else if (denominator > 0) {
      meta.shutterSpeed = `${numerator}/${denominator}s`;
    } else {
      meta.shutterSpeed = '';
    }
  }

  // Format Focal Length
  if (meta.focalLength && meta.focalLength.value) {
    meta.focalLength = `${Math.round(meta.focalLength.value)}mm`;
  } else {
    meta.focalLength = '';
  }

  // Format ISO
  if (meta.iso) {
    meta.iso = `ISO${meta.iso}`;
  }
}
