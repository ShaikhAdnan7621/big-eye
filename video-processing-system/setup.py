import os, torch
from huggingface_hub import hf_hub_download
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY, BUCKET_NAME

os.makedirs("./thumbnails", exist_ok=True)
os.makedirs("./uvh_weights", exist_ok=True)

print("=" * 70)
print("🚀 SENTINEL GPU PRE-FLIGHT CHECK")
print("=" * 70)

# 1. GPU Check
if torch.cuda.is_available():
    print(f"✅ NVIDIA GPU Detected: {torch.cuda.get_device_name(0)} (CUDA {torch.version.cuda})")
else:
    print("⚠️ WARNING: NVIDIA GPU not detected by PyTorch. Falling back to CPU.")

# 2. Supabase Cloud Connection Check
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    supabase.table("vehicle_events").select("id").limit(1).execute()
    print("✅ Supabase PostgreSQL table 'vehicle_events' is active and reachable.")
except Exception as e:
    print(f"⚠️ Supabase check notice: {e}")

# 3. Download IISc Indian Traffic Foundation Model
print("\n📥 Fetching IISc Indian Traffic Model (UVH-26)...")
try:
    model_path = hf_hub_download(
        repo_id="iisc-aim/UVH-26",
        filename="weights/YOLOv11-S/UVH-26-MV-YOLOv11-S.pt",
        local_dir="./uvh_weights"
    )
    print(f"✅ Downloaded weights to: {model_path}")
except Exception as e:
    print(f"⚠️ Download notice: {e}")

print("=" * 70)
print("🎉 Initialization complete. Run: uv run main.py --display")
print("=" * 70)