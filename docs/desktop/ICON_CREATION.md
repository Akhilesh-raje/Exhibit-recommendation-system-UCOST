# Creating the Desktop App Icon

## Icon Requirements

The desktop app needs an `icon.ico` file for Windows. Based on the UCOST logo description, here's how to create it:

## Logo Description

The UCOST logo features:
- **Outer Ring**: Dark blue gear-like ring with white text "SCIENCE AND TECHNOLOGY COUNCIL" and "UTTARAKHAND"
- **Inner Circle**: Bright lime green circle
- **Central Content**: 
  - Stylized "u/ost" acronym (with magnifying glass as "o")
  - Hindi text: "यूकॉस्ट" (Yukost)
  - Hindi text: "विज्ञानम् लोकहिताय" (Vigyanam Lokahitaya - Science for public welfare)

## Creating the Icon

### Option 1: Using the Existing Logo PNG

1. **Locate the logo**: `logo ucost.png` in the project root
2. **Convert to ICO**:
   - Use an online converter: https://convertio.co/png-ico/ or https://www.icoconverter.com/
   - Or use ImageMagick: `magick "logo ucost.png" -resize 256x256 desktop/build/icon.ico`
   - Or use GIMP/Photoshop: Export as ICO format with multiple sizes (16x16, 32x32, 48x48, 256x256)

### Option 2: Using Python (if PIL/Pillow is installed)

```python
from PIL import Image
import os

# Load the logo
logo_path = "logo ucost.png"
icon_path = "desktop/build/icon.ico"

if os.path.exists(logo_path):
    img = Image.open(logo_path)
    # Resize to 256x256 (standard icon size)
    img = img.resize((256, 256), Image.Resampling.LANCZOS)
    # Save as ICO
    img.save(icon_path, format='ICO', sizes=[(256, 256)])
    print(f"Icon created: {icon_path}")
else:
    print(f"Logo not found: {logo_path}")
```

### Option 3: Manual Creation

1. Open the logo in an image editor
2. Resize to 256x256 pixels
3. Export as ICO format with multiple sizes:
   - 16x16 (for small icons)
   - 32x32 (for taskbar)
   - 48x48 (for medium icons)
   - 256x256 (for high-DPI displays)

## Icon Specifications

- **Format**: ICO (Windows Icon)
- **Sizes**: 16x16, 32x32, 48x48, 256x256 (recommended)
- **Location**: `desktop/build/icon.ico`
- **Colors**: Should match the logo (blue and lime green)

## After Creating the Icon

1. Place the icon at: `desktop/build/icon.ico`
2. Update `desktop/package.json` to reference it (already configured)
3. Rebuild: `cd desktop && npm run package`

## Current Status

The app will work without a custom icon (uses Electron default), but adding the UCOST logo will provide:
- Professional branding
- Custom installer icon
- Custom desktop shortcut icon
- Custom taskbar icon

