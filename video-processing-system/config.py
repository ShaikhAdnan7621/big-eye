import os
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()

CCTV_EMAIL = os.getenv("CCTV_EMAIL", "")
CCTV_PASSWORD = os.getenv("CCTV_PASSWORD", "")
EMAIL_ENC = quote(CCTV_EMAIL, safe="")
PASSWORD_ENC = quote(CCTV_PASSWORD, safe="")

HLS_HOST = os.getenv("HLS_HOST", "https://cctv.corp8.cloud")
RTSP_HOST = os.getenv("RTSP_HOST", "103.250.160.189:8554")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BUCKET_NAME = os.getenv("BUCKET_NAME", "vehicle-thumbnails")
DEFAULT_CAM = os.getenv("DEFAULT_CAM", "cam01")