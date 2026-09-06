import os, sys, cv2, time, math, hashlib, sqlite3, argparse, yaml, glob, torch
import numpy as np
import pandas as pd
from ultralytics import YOLO
from supabase import create_client
from config import (
    EMAIL_ENC, PASSWORD_ENC, RTSP_HOST, HLS_HOST,
    SUPABASE_URL, SUPABASE_KEY, BUCKET_NAME, DEFAULT_CAM
)

parser = argparse.ArgumentParser(description="Sentinel GPU AI Engine")
parser.add_argument("--cam", type=str, default=DEFAULT_CAM, help="Camera ID (e.g. cam01)")
parser.add_argument("--duration", type=int, default=60, help="Stream duration in seconds")
parser.add_argument("--display", action="store_true", help="Show live desktop GUI window")
args = parser.parse_args()

CAM_ID = args.cam
PROCESS_SECONDS = args.duration
TARGET_PTS_MS = PROCESS_SECONDS * 1000.0

DB_FILE = f"{CAM_ID}_lifecycle_analytics.db"
CSV_FILE = f"{CAM_ID}_lifecycle_analytics.csv"
ANNOTATED_RAW = f"{CAM_ID}_live_annotated_raw.mp4"
ANNOTATED_WEB = f"{CAM_ID}_live_web.mp4"

# 1. Custom Tracker Memory Config
TRACKER_CFG = "bytetrack_custom.yaml"
with open(TRACKER_CFG, "w") as f:
    yaml.dump({
        "tracker_type": "bytetrack",
        "track_high_thresh": 0.38,
        "track_low_thresh": 0.12,
        "new_track_thresh": 0.48,
        "track_buffer": 60,
        "match_thresh": 0.78,
        "fuse_score": True
    }, f)

# 2. Hardware & Model Load
use_cuda = torch.cuda.is_available()
device = "cuda:0" if use_cuda else "cpu"

model_candidates = glob.glob("./uvh_weights/**/UVH-26-MV-YOLOv11-S.pt", recursive=True)
model_path = model_candidates[0] if (model_candidates and os.path.exists(model_candidates[0])) else "yolo11n.pt"

yolo_engine = YOLO(model_path)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

if use_cuda:
    print(f"🚀 Tensor Core Acceleration: {torch.cuda.get_device_name(0)} (FP16 Active)")
else:
    print("⚠️ Running on CPU mode.")

# 3. Extraction & Padded Cropping Utilities
def get_padded_vehicle_crop(frame, x1, y1, x2, y2, pad_pct=0.18):
    h_img, w_img, _ = frame.shape
    bw, bh = x2 - x1, y2 - y1
    px1, py1 = max(0, x1 - int(bw * pad_pct)), max(0, y1 - int(bh * pad_pct))
    px2, py2 = min(w_img, x2 + int(bw * pad_pct)), min(h_img, y2 + int(bh * pad_pct))
    return frame[py1:py2, px1:px2]

def extract_vehicle_color(crop_bgr):
    if crop_bgr is None or crop_bgr.size == 0 or crop_bgr.shape[0] < 10 or crop_bgr.shape[1] < 10:
        return "unknown"
    h, w, _ = crop_bgr.shape
    inner = crop_bgr[int(h*0.2):int(h*0.8), int(w*0.2):int(w*0.8)]
    hsv = cv2.cvtColor(inner, cv2.COLOR_BGR2HSV)
    s_chan, v_chan, h_chan = hsv[:,:,1], hsv[:,:,2], hsv[:,:,0]
    valid = (v_chan >= 45) & ~((v_chan > 225) & (s_chan < 35))
    if np.sum(valid) < 20:
        mean_v = np.mean(v_chan)
        return "white" if mean_v > 165 else ("black" if mean_v < 55 else "silver/gray")
    mean_s, mean_v, mean_h = np.mean(s_chan[valid]), np.mean(v_chan[valid]), np.mean(h_chan[valid])
    if mean_v < 55: return "black"
    if mean_s < 38 and mean_v > 145: return "white"
    if mean_s < 45: return "silver/gray"
    if (0 <= mean_h <= 10) or (165 <= mean_h <= 180): return "red"
    elif 11 <= mean_h <= 25: return "orange/brown"
    elif 26 <= mean_h <= 36: return "yellow"
    elif 37 <= mean_h <= 85: return "green"
    elif 86 <= mean_h <= 130: return "blue"
    return "other"

def resolve_traffic_flow(path_points, frame_width, frame_height):
    if len(path_points) < 5: return "Stationary", "Parked / Holding", 0.0
    dx = path_points[-1][0] - path_points[0][0]
    dy = path_points[-1][1] - path_points[0][1]
    net_dist = math.hypot(dx, dy)
    avg_x = np.mean([p[0] for p in path_points])
    if avg_x < (frame_width * 0.25) and net_dist < 40.0:
        return "Stationary", "Auto-Stand / Parking", round(net_dist, 1)
    if net_dist < 35.0:
        return "Stationary", "Parked / Waiting", round(net_dist, 1)
    if dy < -40.0: flow = "Inbound (Towards Bridge)"
    elif dy > 40.0: flow = "Outbound (Exiting Bridge)"
    elif dx < -40.0: flow = "Turning Left / Service Lane"
    else: flow = "Crossing / Turning Right"
    return "Moving", flow, round(net_dist, 1)

def push_record_to_supabase(record_dict, thumb_local_path):
    thumb_url = ""
    if thumb_local_path and os.path.exists(thumb_local_path):
        fname = os.path.basename(thumb_local_path)
        try:
            with open(thumb_local_path, "rb") as f:
                supabase.storage.from_(BUCKET_NAME).upload(
                    path=fname, file=f.read(),
                    file_options={"content-type": "image/jpeg", "upsert": "true"}
                )
            thumb_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{fname}"
        except Exception:
            thumb_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{fname}"

    payload = {
        "camera_id": str(record_dict["camera_id"]),
        "track_id": int(record_dict["track_id"]),
        "vehicle_class": str(record_dict["vehicle_class"]),
        "dominant_color": str(record_dict["dominant_color"]),
        "motion_state": str(record_dict["motion_state"]),
        "traffic_flow": str(record_dict["traffic_flow"]),
        "net_displacement_px": float(record_dict["net_displacement_px"]),
        "entry_sec": float(record_dict["entry_sec"]),
        "exit_sec": float(record_dict["exit_sec"]),
        "dwell_sec": float(record_dict["dwell_sec"]),
        "thumbnail_url": str(thumb_url),
        "tamper_hash": str(record_dict["tamper_hash"])
    }
    try:
        supabase.table("vehicle_events").insert(payload).execute()
    except Exception as e:
        print(f"\n⚠️ [Supabase Insert Notice]: {e}")

# 4. Stream Handler with Auto-Reconnect Watchdog
def open_stream():
    rtsp_url = f"rtsp://{EMAIL_ENC}:{PASSWORD_ENC}@{RTSP_HOST}/stream/{CAM_ID}"
    hls_url = f"{HLS_HOST}/{CAM_ID}/index.m3u8"
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|stimeout;3000000|max_delay;500000"
    
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    proto = "RTSP"
    if not cap.isOpened():
        os.environ.pop("OPENCV_FFMPEG_CAPTURE_OPTIONS", None)
        cap = cv2.VideoCapture(hls_url, cv2.CAP_FFMPEG)
        proto = "HLS"
    return cap, proto

cap, protocol = open_stream()
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
fps = 25.0
out_writer = cv2.VideoWriter(ANNOTATED_RAW, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height))

for _ in range(5): cap.read()

start_pts, accumulated_ms, last_valid_pts = None, 0.0, None
frame_idx, active_tracks, verified_records = 0, {}, []
consecutive_drops = 0

print(f"🎬 Processing [{CAM_ID}] via {protocol} on GPU for {PROCESS_SECONDS}s...")

try:
    while accumulated_ms < TARGET_PTS_MS:
        ok, frame = cap.read()
        if not ok or frame is None:
            consecutive_drops += 1
            if consecutive_drops > 30:
                print(f"\n🔄 Stream stalled. Resyncing [{CAM_ID}]...")
                cap.release()
                time.sleep(0.5)
                cap, protocol = open_stream()
                consecutive_drops = 0
            time.sleep(0.01)
            continue

        consecutive_drops = 0
        frame_idx += 1
        current_pts = cap.get(cv2.CAP_PROP_POS_MSEC)
        if start_pts is None: start_pts = current_pts; last_valid_pts = current_pts
        if current_pts < last_valid_pts: start_pts = current_pts
        accumulated_ms += max(0.0, current_pts - last_valid_pts) if (current_pts >= last_valid_pts) else 40.0
        last_valid_pts = current_pts

        timestamp_sec = round(accumulated_ms / 1000.0, 2)
        vis_frame = frame.copy()

        # High-Speed GPU Tensor Inference (imgsz=640 + FP16)
        results = yolo_engine.track(
            frame,
            persist=True,
            conf=0.38,
            imgsz=640,
            half=use_cuda,
            device=device,
            tracker=TRACKER_CFG,
            verbose=False
        )[0]

        current_frame_ids = set()
        if results.boxes is not None and len(results.boxes) > 0:
            boxes = results.boxes.xyxy.cpu().numpy()
            confs = results.boxes.conf.cpu().numpy()
            cls_ids = results.boxes.cls.cpu().numpy().astype(int)
            ids = results.boxes.id.cpu().numpy().astype(int) if results.boxes.id is not None else [None] * len(boxes)

            for box, conf, cls_id, trk_id in zip(boxes, confs, cls_ids, ids):
                x1, y1, x2, y2 = [int(v) for v in box]
                w_box, h_box = x2 - x1, y2 - y1
                if (w_box * h_box) > (0.15 * width * height) or (w_box * h_box) < 250 or (w_box / float(h_box)) > 3.2:
                    continue

                v_class = yolo_engine.names[cls_id]
                cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                padded_crop = get_padded_vehicle_crop(frame, x1, y1, x2, y2)
                color = extract_vehicle_color(padded_crop)

                if trk_id is not None:
                    if trk_id in active_tracks and len(active_tracks[trk_id]["path"]) > 0:
                        last_x, last_y = active_tracks[trk_id]["path"][-1]
                        if math.hypot(cx - last_x, cy - last_y) > 130.0:
                            continue

                    current_frame_ids.add(trk_id)
                    if trk_id not in active_tracks:
                        active_tracks[trk_id] = {
                            "classes": [], "colors": [], "path": [],
                            "first_seen": timestamp_sec, "last_seen": timestamp_sec,
                            "best_crop": padded_crop, "best_conf": conf
                        }

                    t = active_tracks[trk_id]
                    t["classes"].append(v_class)
                    if color != "unknown": t["colors"].append(color)
                    t["path"].append((cx, cy))
                    t["last_seen"] = timestamp_sec

                    if conf > t["best_conf"] and padded_crop.size > 0:
                        t["best_crop"] = padded_crop
                        t["best_conf"] = conf

                    v_cls = max(set(t["classes"]), key=t["classes"].count)
                    v_col = max(set(t["colors"]), key=t["colors"].count) if t["colors"] else color
                    _, flow_lbl, _ = resolve_traffic_flow(t["path"], width, height)

                    b_col = (0, 255, 120) if "Three-wheeler" in v_cls else (0, 215, 255)
                    cv2.rectangle(vis_frame, (x1, y1), (x2, y2), b_col, 2)
                    badge = f"#{trk_id} {v_col} {v_cls} | {flow_lbl}"
                    cv2.rectangle(vis_frame, (x1, max(0, y1 - 18)), (x1 + len(badge)*7 + 4, max(0, y1)), b_col, -1)
                    cv2.putText(vis_frame, badge, (x1 + 2, max(12, y1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 0, 0), 1)

        cv2.rectangle(vis_frame, (0, 0), (width, 36), (15, 15, 15), -1)
        hud_msg = f"NVIDIA GPU [{protocol}] | {CAM_ID.upper()} | Active: {len(current_frame_ids)} | Synced: {len(verified_records)} | Time: {timestamp_sec:.1f}s"
        cv2.putText(vis_frame, hud_msg, (16, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 180), 2)
        out_writer.write(vis_frame)

        # Flush completed vehicles (> 2.0s inactive)
        exited = [tid for tid, trk in active_tracks.items() if tid not in current_frame_ids and (timestamp_sec - trk["last_seen"]) > 2.0]
        for tid in exited:
            trk = active_tracks.pop(tid)
            if len(trk["path"]) >= 15:
                b_class = max(set(trk["classes"]), key=trk["classes"].count)
                b_color = max(set(trk["colors"]), key=trk["colors"].count) if trk["colors"] else "unknown"
                m_state, traffic_flow, net_d = resolve_traffic_flow(trk["path"], width, height)
                thumb_path = f"./thumbnails/{CAM_ID}_id{tid}_{b_class}.jpg"
                if trk["best_crop"] is not None and trk["best_crop"].size > 0:
                    cv2.imwrite(thumb_path, cv2.resize(trk["best_crop"], (160, 120)), [cv2.IMWRITE_JPEG_QUALITY, 90])
                rec = {
                    "camera_id": CAM_ID, "track_id": tid, "vehicle_class": b_class,
                    "dominant_color": b_color, "motion_state": m_state, "traffic_flow": traffic_flow,
                    "net_displacement_px": net_d, "entry_sec": trk["first_seen"],
                    "exit_sec": trk["last_seen"], "dwell_sec": round(trk["last_seen"] - trk["first_seen"], 2),
                    "thumbnail_file": thumb_path,
                    "tamper_hash": hashlib.sha256(f"{CAM_ID}:{tid}:{b_class}:{trk['first_seen']}".encode()).hexdigest()[:16]
                }
                verified_records.append(rec)
                push_record_to_supabase(rec, thumb_path)

        if frame_idx % 25 == 0:
            print(f"\r⏱️ GPU Stream Time: {timestamp_sec:.1f}s / {PROCESS_SECONDS}s | Verified Vehicles Synced: {len(verified_records)}", end="")

        if args.display:
            cv2.imshow(f"Sentinel AI Stream - {CAM_ID}", cv2.resize(vis_frame, (960, 540)))
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

finally:
    cap.release()
    out_writer.release()
    if args.display:
        try:
            cv2.destroyAllWindows()
        except Exception:
            pass

# Flush remaining active vehicles
for tid, trk in active_tracks.items():
    if len(trk["path"]) >= 15:
        b_class = max(set(trk["classes"]), key=trk["classes"].count)
        b_color = max(set(trk["colors"]), key=trk["colors"].count) if trk["colors"] else "unknown"
        m_state, traffic_flow, net_d = resolve_traffic_flow(trk["path"], width, height)
        thumb_path = f"./thumbnails/{CAM_ID}_id{tid}_{b_class}.jpg"
        if trk["best_crop"] is not None and trk["best_crop"].size > 0:
            cv2.imwrite(thumb_path, cv2.resize(trk["best_crop"], (160, 120)), [cv2.IMWRITE_JPEG_QUALITY, 90])
        rec = {
            "camera_id": CAM_ID, "track_id": tid, "vehicle_class": b_class,
            "dominant_color": b_color, "motion_state": m_state, "traffic_flow": traffic_flow,
            "net_displacement_px": net_d, "entry_sec": trk["first_seen"],
            "exit_sec": trk["last_seen"], "dwell_sec": round(trk["last_seen"] - trk["first_seen"], 2),
            "thumbnail_file": thumb_path,
            "tamper_hash": hashlib.sha256(f"{CAM_ID}:{tid}:{b_class}:{trk['first_seen']}".encode()).hexdigest()[:16]
        }
        verified_records.append(rec)
        push_record_to_supabase(rec, thumb_path)

# Save local SQLite / CSV backup
df_lifecycle = pd.DataFrame(verified_records)
conn = sqlite3.connect(DB_FILE)
df_lifecycle.to_sql("vehicle_lifecycle", conn, if_exists="replace", index=False)
df_lifecycle.to_csv(CSV_FILE, index=False)

# Transcode to web-safe H.264 video
os.system(f"ffmpeg -y -v error -i {ANNOTATED_RAW} -vcodec libx264 -crf 23 -pix_fmt yuv420p {ANNOTATED_WEB}")

print(f"\n\n🎉 Done! {len(verified_records)} verified vehicle lifecycles synced to Supabase.")
print(f"📁 Local Video: {ANNOTATED_WEB}")
print(f"💾 Local SQLite DB: {DB_FILE}")