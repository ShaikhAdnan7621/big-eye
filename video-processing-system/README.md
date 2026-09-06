# 1. Clone or enter project directory
cd sentinel-ai

# 2. Add dependencies
uv add ultralytics opencv-python requests huggingface-hub pillow supabase pyyaml pandas python-dotenv lapx

# 3. Install CUDA-accelerated PyTorch
uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124 --force-reinstall

# 4. Run Pre-flight Check (downloads UVH-26 model weights & verifies Supabase)
uv run setup.py


# Run real-time detection on cam01 with desktop GUI window for 60 seconds
uv run main.py --cam cam01 --duration 60 --display

# Run on Paldi Circle (cam04) for 120 seconds in headless server mode
uv run main.py --cam cam04 --duration 120