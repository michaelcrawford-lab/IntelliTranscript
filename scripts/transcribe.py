#!/usr/bin/env python3
"""
Transcribe audio/video files using OpenAI gpt-4o-transcribe-diarize.

Usage:
  python scripts/transcribe.py path/to/recording.mp4
  python scripts/transcribe.py path/to/recording.mp4 --format srt
  python scripts/transcribe.py path/to/recording.mp4 --model gpt-4o-transcribe

Requires:
  pip install openai
  OPENAI_API_KEY set in environment (or .env.local in project root)

Output: .srt file alongside the input file by default, or stdout with --stdout.
File size limit: 25 MB.
"""
import argparse
import os
import sys
from pathlib import Path


def load_env():
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())


def seconds_to_srt_ts(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def diarized_json_to_srt(data: dict) -> str:
    segments = data.get("segments", [])
    lines = []
    for i, seg in enumerate(segments, 1):
        start = seconds_to_srt_ts(seg.get("start", 0))
        end = seconds_to_srt_ts(seg.get("end", seg.get("start", 0) + 1))
        speaker = seg.get("speaker", "")
        text = seg.get("text", "").strip()
        prefix = f"[{speaker}] " if speaker else ""
        lines.append(f"{i}\n{start} --> {end}\n{prefix}{text}\n")
    return "\n".join(lines)


def transcribe(audio_path: str, model: str, output_format: str, stdout: bool):
    load_env()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    try:
        from openai import OpenAI
    except ImportError:
        print("ERROR: openai package not installed. Run: pip install openai", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    path = Path(audio_path)

    if not path.exists():
        print(f"ERROR: File not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    size_mb = path.stat().st_size / 1_048_576
    if size_mb > 25:
        print(f"WARNING: File is {size_mb:.1f} MB — OpenAI limit is 25 MB. May fail.", file=sys.stderr)

    print(f"Transcribing {path.name} with {model}…", file=sys.stderr)

    with open(path, "rb") as f:
        if model == "gpt-4o-transcribe-diarize":
            response = client.audio.transcriptions.create(
                model=model,
                file=f,
                response_format="diarized_json",
            )
            raw = response.model_dump() if hasattr(response, "model_dump") else dict(response)
            result_text = diarized_json_to_srt(raw)
        else:
            fmt = "srt" if output_format == "srt" else "text"
            response = client.audio.transcriptions.create(
                model=model,
                file=f,
                response_format=fmt,
            )
            result_text = response if isinstance(response, str) else str(response)

    if stdout:
        print(result_text)
        return

    out_path = path.with_suffix(f".{output_format}")
    out_path.write_text(result_text, encoding="utf-8")
    print(f"Saved: {out_path}", file=sys.stderr)
    print("Upload via /uploads in the IntelliTranscript dashboard.", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe audio/video with OpenAI")
    parser.add_argument("audio", help="Path to audio/video file (≤25 MB)")
    parser.add_argument(
        "--model",
        default="gpt-4o-transcribe-diarize",
        choices=["gpt-4o-transcribe-diarize", "gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"],
        help="OpenAI transcription model (default: gpt-4o-transcribe-diarize)",
    )
    parser.add_argument(
        "--format",
        default="srt",
        choices=["srt", "txt"],
        help="Output format (default: srt)",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Print result to stdout instead of saving a file",
    )
    args = parser.parse_args()
    transcribe(args.audio, args.model, args.format, args.stdout)
