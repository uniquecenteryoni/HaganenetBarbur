#!/usr/bin/env python3
"""
Create placeholder images for the website
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_placeholder(width, height, text, color, filename):
    """Create a placeholder image with text"""
    # Create image
    image = Image.new('RGB', (width, height), color)
    draw = ImageDraw.Draw(image)
    
    # Try to load a font, fallback to default
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 40)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
        except:
            font = ImageFont.load_default()
    
    # Calculate text position (center)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    # Draw text
    draw.text((x, y), text, fill='white', font=font)
    
    # Save image
    image.save(filename, 'JPEG', quality=85)
    print(f"Created: {filename}")

def main():
    # Create images directory if it doesn't exist
    images_dir = "images"
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
    
    # Define colors (light purple theme)
    purple = (147, 112, 219)  # Medium slate blue
    cream = (255, 253, 240)   # Ivory
    light_purple = (221, 160, 221)  # Plum
    
    # Create Instagram placeholder images
    create_placeholder(400, 400, "Instagram\nPost 1", purple, "images/instagram-placeholder-1.jpg")
    create_placeholder(400, 400, "Instagram\nPost 2", light_purple, "images/instagram-placeholder-2.jpg")
    create_placeholder(400, 400, "Instagram\nPost 3", purple, "images/instagram-placeholder-3.jpg")
    
    # Create product placeholder images
    create_placeholder(300, 300, "Product\nImage", cream, "images/placeholder-product.jpg")
    
    # Create hero image
    create_placeholder(800, 400, "Welcome to\nGannenet Bar", purple, "images/hero-placeholder.jpg")
    
    print("All placeholder images created successfully!")

if __name__ == "__main__":
    main()