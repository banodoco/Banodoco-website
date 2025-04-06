import os
import cv2
import numpy as np
from moviepy.editor import VideoFileClip
from tqdm import tqdm
import imageio.v2 as imageio  # ensures compatibility
import subprocess
import shutil

# === Paths ===
input_path = "1.mp4"
frames_dir = "output_frames"
os.makedirs(frames_dir, exist_ok=True)

# === Color range for near-white
lower_white = np.array([230, 230, 230], dtype=np.uint8)
upper_white = np.array([255, 255, 255], dtype=np.uint8)

# === Load video
clip = VideoFileClip(input_path)

# === Process each frame
print("⏳ Processing video frames...")
for i, frame in enumerate(tqdm(clip.iter_frames())):
    bgr_frame = cv2.cvtColor(frame[:, :, :3], cv2.COLOR_RGB2BGR)
    white_mask = cv2.inRange(bgr_frame, lower_white, upper_white)

    # Create a mask to mark edge-connected white pixels
    h, w = white_mask.shape
    edge_connected_mask = white_mask.copy()
    flood_fill_mask = np.zeros((h + 2, w + 2), np.uint8) # Mask for floodFill needs to be 2 pixels larger

    # Flood fill from border pixels IF they are white
    # Top row
    for x in range(w):
        if edge_connected_mask[0, x] == 255:
            cv2.floodFill(edge_connected_mask, flood_fill_mask, (x, 0), 128) # Use marker 128
    # Bottom row
    for x in range(w):
        if edge_connected_mask[h - 1, x] == 255:
            cv2.floodFill(edge_connected_mask, flood_fill_mask, (x, h - 1), 128)
    # Left column
    for y in range(h):
        if edge_connected_mask[y, 0] == 255:
            cv2.floodFill(edge_connected_mask, flood_fill_mask, (0, y), 128)
    # Right column
    for y in range(h):
        if edge_connected_mask[y, w - 1] == 255:
            cv2.floodFill(edge_connected_mask, flood_fill_mask, (w - 1, y), 128)

    # Create alpha channel: 0 if marked (128), 255 otherwise
    alpha = np.where(edge_connected_mask == 128, 0, 255).astype(np.uint8)

    # Combine with alpha
    rgba = np.dstack((cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB), alpha))

    # Save PNG
    imageio.imwrite(os.path.join(frames_dir, f"frame{i:04}.png"), rgba)

clip.close()
print(f"✅ Done! Frames saved to `{frames_dir}/`")

# === Create transparent WebM video ===
print("\n⏳ Creating transparent WebM video with ffmpeg...")
ffmpeg_command = [
    "ffmpeg",
    "-framerate", "30",
    "-i", os.path.join(frames_dir, "frame%04d.png"),
    "-c:v", "libvpx-vp9",
    "-pix_fmt", "yuva420p",
    "-auto-alt-ref", "0",
    "out_transparent.webm"
]
try:
    result = subprocess.run(ffmpeg_command, check=True)
    print("\n✅ ffmpeg command finished successfully.")

    # Remove the frames directory
    print(f"\n⏳ Removing temporary frames directory: {frames_dir}")
    shutil.rmtree(frames_dir)
    print(f"✅ Successfully removed {frames_dir}")

except subprocess.CalledProcessError as e:
    print(f"❌ Error running ffmpeg:")
    print(f"Command: {' '.join(e.cmd)}")
    print(f"Return code: {e.returncode}")
except FileNotFoundError:
    print("❌ Error: ffmpeg command not found. Make sure ffmpeg is installed and in your PATH.")
