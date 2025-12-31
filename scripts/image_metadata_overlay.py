#!/usr/bin/env python3
"""
Image Metadata Overlay Script

This script downloads a sample image with EXIF data, extracts metadata,
and overlays it onto the image with a minimalistic design.
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont
import exifread
import requests
from io import BytesIO

# Sample image URL with EXIF data - can be changed to use different images
SAMPLE_IMAGE_URL = "https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/Canon_40D.jpg"
OUTPUT_FILENAME = "output_with_metadata.jpg"


def download_image(url):
    """Download image from URL and return as PIL Image."""
    print(f"Downloading image from {url}...")
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return Image.open(BytesIO(response.content))


def extract_exif_data(url):
    """Extract EXIF metadata from image."""
    print("Extracting EXIF metadata...")
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    
    tags = exifread.process_file(BytesIO(response.content))
    
    metadata = {}
    
    # Extract camera make and model
    make = tags.get('Image Make', None)
    model = tags.get('Image Model', None)
    if make and model:
        metadata['camera'] = f"{make} {model}".strip()
    elif model:
        metadata['camera'] = str(model)
    else:
        metadata['camera'] = "Unknown Camera"
    
    # Extract lens information
    lens = tags.get('EXIF LensModel', None)
    if lens:
        metadata['lens'] = str(lens)
    else:
        metadata['lens'] = "Unknown Lens"
    
    # Extract aperture (F-number)
    aperture = tags.get('EXIF FNumber', None)
    if aperture:
        # Convert fraction to float
        aperture_str = str(aperture)
        if '/' in aperture_str:
            num, denom = aperture_str.split('/')
            aperture_value = float(num) / float(denom)
            metadata['aperture'] = f"f/{aperture_value:.1f}"
        else:
            metadata['aperture'] = f"f/{aperture_str}"
    else:
        metadata['aperture'] = "f/?"
    
    # Extract shutter speed
    shutter = tags.get('EXIF ExposureTime', None)
    if shutter:
        metadata['shutter'] = f"{shutter}s"
    else:
        metadata['shutter'] = "?s"
    
    # Extract ISO
    iso = tags.get('EXIF ISOSpeedRatings', None)
    if iso:
        metadata['iso'] = f"ISO {iso}"
    else:
        metadata['iso'] = "ISO ?"
    
    # Extract date and time
    datetime_original = tags.get('EXIF DateTimeOriginal', None)
    if datetime_original:
        # Format: YYYY:MM:DD HH:MM:SS
        datetime_str = str(datetime_original)
        # Convert to more readable format
        date_part, time_part = datetime_str.split(' ')
        date_part = date_part.replace(':', '-')
        metadata['datetime'] = f"{date_part} {time_part}"
    else:
        metadata['datetime'] = "Unknown Date"
    
    return metadata


def create_text_with_shadow(draw, position, text, font, text_color=(255, 255, 255), shadow_color=(0, 0, 0), shadow_offset=2):
    """Draw text with shadow effect for better readability."""
    x, y = position
    
    # Draw shadow (offset in multiple directions for better effect)
    for offset_x in range(-shadow_offset, shadow_offset + 1):
        for offset_y in range(-shadow_offset, shadow_offset + 1):
            if offset_x != 0 or offset_y != 0:
                draw.text((x + offset_x, y + offset_y), text, font=font, fill=shadow_color)
    
    # Draw main text
    draw.text((x, y), text, font=font, fill=text_color)


def overlay_metadata(image, metadata):
    """Overlay metadata onto the image with minimalistic design."""
    print("Overlaying metadata onto image...")
    
    # Create a copy to work with
    img_with_metadata = image.copy()
    draw = ImageDraw.Draw(img_with_metadata)
    
    # Try to use a nice font, fall back to default if not available
    try:
        # Try common font paths
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "C:\\Windows\\Fonts\\arial.ttf"
        ]
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, 24)
                break
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Get image dimensions
    width, height = img_with_metadata.size
    
    # Prepare metadata text for left side (camera info)
    left_text_lines = [
        metadata['camera'],
        metadata['lens'],
        f"{metadata['aperture']} {metadata['shutter']} {metadata['iso']}"
    ]
    
    # Prepare metadata text for right side (date/time)
    right_text_lines = [
        metadata['datetime']
    ]
    
    # Position for bottom-left corner
    margin = 20
    line_spacing = 30
    y_position = height - margin - (len(left_text_lines) * line_spacing)
    
    # Draw left side text
    for line in left_text_lines:
        create_text_with_shadow(
            draw,
            (margin, y_position),
            line,
            font,
            text_color=(255, 255, 255),
            shadow_color=(0, 0, 0),
            shadow_offset=2
        )
        y_position += line_spacing
    
    # Draw right side text (bottom-right corner)
    y_position = height - margin - (len(right_text_lines) * line_spacing)
    for line in right_text_lines:
        # Calculate text width to align to the right
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x_position = width - margin - text_width
        
        create_text_with_shadow(
            draw,
            (x_position, y_position),
            line,
            font,
            text_color=(255, 255, 255),
            shadow_color=(0, 0, 0),
            shadow_offset=2
        )
        y_position += line_spacing
    
    return img_with_metadata


def main():
    """Main function to execute the script."""
    try:
        # Download image
        image = download_image(SAMPLE_IMAGE_URL)
        
        # Extract EXIF metadata
        metadata = extract_exif_data(SAMPLE_IMAGE_URL)
        
        print("\nExtracted Metadata:")
        for key, value in metadata.items():
            print(f"  {key}: {value}")
        
        # Overlay metadata onto image
        image_with_metadata = overlay_metadata(image, metadata)
        
        # Save the result
        image_with_metadata.save(OUTPUT_FILENAME, "JPEG", quality=95)
        print(f"\n✅ Success! Image saved as {OUTPUT_FILENAME}")
        
        return 0
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
