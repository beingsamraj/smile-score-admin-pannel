import os
import cv2
import numpy as np
import base64
import json
import zlib
from typing import Tuple, Optional, Dict, Any, List

# Haar cascade for face detection
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)


def decode_image_bytes(image_data: bytes) -> Optional[np.ndarray]:
    """Decode raw image bytes (JPEG, PNG, WebP) into an OpenCV BGR numpy array."""
    try:
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception:
        return None


def decode_base64_image(base64_str: str) -> Optional[np.ndarray]:
    """Decode base64 encoded data (with or without data:image/...;base64, prefix)."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        raw_bytes = base64.b64decode(base64_str)
        return decode_image_bytes(raw_bytes)
    except Exception:
        return None


def detect_and_crop_face(
    image: np.ndarray,
    target_size: Tuple[int, int] = (128, 128)
) -> Tuple[bool, Optional[np.ndarray], float, str]:
    """
    Detect the most prominent face in the image, crop it with margin,
    compute a quality clarity score (Laplacian variance), and return resized face.
    
    Returns:
        (success, cropped_face_img, quality_score, message)
    """
    if image is None or image.size == 0:
        return False, None, 0.0, "Invalid image data."

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Measure image blurriness (variance of Laplacian)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    quality = min(1.0, max(0.1, round(blur_score / 300.0, 3)))

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(60, 60),
        flags=cv2.CASCADE_SCALE_IMAGE
    )

    if len(faces) == 0:
        # Fallback to center crop if face detector is too strict for extreme tilts
        h, w = gray.shape
        margin_y = int(h * 0.15)
        margin_x = int(w * 0.15)
        cropped = image[margin_y:h-margin_y, margin_x:w-margin_x]
        resized = cv2.resize(cropped, target_size, interpolation=cv2.INTER_AREA)
        return True, resized, quality, "Fallback face detection applied."

    # Pick the largest face detected
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    x, y, w, h = faces[0]

    # Add 20% contextual margin around face
    pad_x = int(w * 0.15)
    pad_y = int(h * 0.15)
    img_h, img_w = image.shape[:2]

    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(img_w, x + w + pad_x)
    y2 = min(img_h, y + h + pad_y)

    cropped = image[y1:y2, x1:x2]
    resized = cv2.resize(cropped, target_size, interpolation=cv2.INTER_AREA)
    return True, resized, quality, "Face detected successfully."


def extract_face_embedding(face_img: np.ndarray) -> np.ndarray:
    """
    Extract a normalized 128-dimensional biometric descriptor from cropped face image
    combining multi-scale spatial histogram & gradient patterns (zero heavy GPU dependencies).
    """
    gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY) if len(face_img.shape) == 3 else face_img
    resized = cv2.resize(gray, (64, 64), interpolation=cv2.INTER_AREA)

    # 1. Multi-block mean & standard deviation features (4x4 grid = 16 blocks * 2 = 32 values)
    block_feats = []
    for r in range(4):
        for c in range(4):
            block = resized[r * 16 : (r + 1) * 16, c * 16 : (c + 1) * 16]
            block_feats.append(float(np.mean(block)))
            block_feats.append(float(np.std(block)))

    # 2. Horizontal & vertical gradient projections (32 + 32 = 64 values)
    grad_x = cv2.Sobel(resized, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(resized, cv2.CV_32F, 0, 1, ksize=3)
    
    # 8x4 pooled gradient energies (32 values)
    pooled_gx = cv2.resize(np.abs(grad_x), (8, 4), interpolation=cv2.INTER_AREA).flatten()
    # 8x4 pooled vertical gradient energies (32 values)
    pooled_gy = cv2.resize(np.abs(grad_y), (8, 4), interpolation=cv2.INTER_AREA).flatten()

    combined = np.concatenate([
        np.array(block_feats, dtype=np.float32),
        pooled_gx.astype(np.float32),
        pooled_gy.astype(np.float32),
    ])

    # Ensure exactly 128 dimensions
    if len(combined) > 128:
        combined = combined[:128]
    elif len(combined) < 128:
        combined = np.pad(combined, (0, 128 - len(combined)))

    # L2 normalize vector for fast cosine similarity via dot product
    norm = np.linalg.norm(combined)
    if norm > 1e-6:
        combined /= norm

    return combined.astype(np.float32)


def compress_embedding(vector: np.ndarray) -> str:
    """Compress numpy float32 vector into zlib base64 string (~350 bytes)."""
    raw_bytes = vector.astype(np.float32).tobytes()
    compressed = zlib.compress(raw_bytes, level=9)
    return base64.b64encode(compressed).decode("utf-8")


def decompress_embedding(compressed_str: str) -> np.ndarray:
    """Decompress zlib base64 string back into normalized numpy float32 vector."""
    raw_compressed = base64.b64decode(compressed_str.encode("utf-8"))
    raw_bytes = zlib.decompress(raw_compressed)
    vector = np.frombuffer(raw_bytes, dtype=np.float32)
    return vector


def compute_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Compute cosine similarity between two normalized vectors.
    Returns float score between 0.0 and 1.0 (or mapped to 0% - 100%).
    """
    if vec_a is None or vec_b is None or len(vec_a) != len(vec_b):
        return 0.0

    dot_prod = float(np.dot(vec_a, vec_b))
    # Clip between 0.0 and 1.0
    similarity = max(0.0, min(1.0, (dot_prod + 1.0) / 2.0 if dot_prod < 0 else dot_prod))
    return round(similarity, 4)


def save_compressed_thumbnail(
    face_img: np.ndarray,
    storage_dir: str,
    filename: str
) -> Tuple[str, int]:
    """
    Compress cropped face into WebP format with 75% quality (~6-10 KB)
    and save to disk. Returns (relative_file_path, file_size_bytes).
    """
    os.makedirs(storage_dir, exist_ok=True)
    full_path = os.path.join(storage_dir, filename)
    
    # Save as WebP
    cv2.imwrite(full_path, face_img, [cv2.IMWRITE_WEBP_QUALITY, 75])
    file_size = os.path.getsize(full_path)
    return full_path, file_size
