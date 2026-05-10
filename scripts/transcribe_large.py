import os
import sys
import subprocess
from pathlib import Path

def parse_time(ts):
    h, m, s = ts.split(':')
    s, ms = s.split(',')
    return int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000.0

def format_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def load_env():
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

def process_verbose_json(data, offset_seconds, subtitle_index_offset):
    segments = data.get("segments", [])
    new_blocks = []
    
    for i, seg in enumerate(segments):
        start = seg.get("start", 0) + offset_seconds
        end = seg.get("end", start + 1) + offset_seconds
        text = seg.get("text", "").strip()
        
        idx = subtitle_index_offset + i + 1
        
        new_lines = [
            str(idx),
            f"{format_time(start)} --> {format_time(end)}",
            text
        ]
        new_blocks.append("\n".join(new_lines))
        
    return "\n\n".join(new_blocks), len(segments)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/transcribe_large.py <audio_file>")
        sys.exit(1)
        
    load_env()
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        print("Error: GROQ_API_KEY not found in .env.local")
        sys.exit(1)
        
    try:
        from openai import OpenAI
    except ImportError:
        print("Error: openai package not installed. Run: pip3 install openai --break-system-packages")
        sys.exit(1)
        
    client = OpenAI(
        api_key=groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )
        
    audio_path = Path(sys.argv[1])
    if not audio_path.exists():
        print(f"File not found: {audio_path}")
        sys.exit(1)
        
    print(f"Splitting {audio_path.name} into 15-minute chunks...")
    
    temp_dir = audio_path.parent / f"{audio_path.stem}_chunks"
    temp_dir.mkdir(exist_ok=True)
    
    chunk_pattern = temp_dir / "chunk_%03d.mp3"
    
    try:
        subprocess.run([
            "ffmpeg", "-y", "-i", str(audio_path),
            "-f", "segment", "-segment_time", "900",
            "-c", "copy", str(chunk_pattern)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        print("Error: ffmpeg is not installed or not in PATH.")
        sys.exit(1)
    
    chunks = sorted(temp_dir.glob("chunk_*.mp3"))
    print(f"Created {len(chunks)} chunks.")
    
    combined_srt = []
    subtitle_index_offset = 0
    
    for i, chunk in enumerate(chunks):
        print(f"Transcribing chunk {i+1}/{len(chunks)} using Groq...")
        
        with open(chunk, "rb") as f:
            try:
                response = client.audio.transcriptions.create(
                    model="whisper-large-v3",
                    file=f,
                    response_format="verbose_json",
                )
            except Exception as e:
                print(f"Error on chunk {i+1}: {e}")
                sys.exit(1)
                
        raw_data = response.model_dump() if hasattr(response, "model_dump") else dict(response)
        
        offset_seconds = i * 900
        processed_srt, count = process_verbose_json(raw_data, offset_seconds, subtitle_index_offset)
        
        combined_srt.append(processed_srt)
        subtitle_index_offset += count
        
    final_srt_path = audio_path.with_suffix(".srt")
    with open(final_srt_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(combined_srt))
        f.write("\n")
        
    print(f"\nFinal transcription saved to {final_srt_path}")
    
if __name__ == "__main__":
    main()
