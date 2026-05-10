#!/usr/bin/env python3
import argparse
import subprocess
from pathlib import Path

def get_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Error getting duration: {result.stderr}")
    return float(result.stdout.strip())

def split_in_two(file_path):
    path = Path(file_path)
    if not path.exists():
        print(f"Error: File '{file_path}' does not exist.")
        return

    print("Analyzing file duration...")
    duration = get_duration(path)
    half_time = duration / 2.0

    part1_path = path.parent / f"{path.stem}_part1{path.suffix}"
    part2_path = path.parent / f"{path.stem}_part2{path.suffix}"

    print(f"Total duration: {duration:.2f} seconds. Splitting at {half_time:.2f} seconds.")

    print(f"Extracting part 1 -> {part1_path.name}")
    # Split part 1 (from start to half_time)
    subprocess.run([
        "ffmpeg", "-y", "-i", str(path), "-t", str(half_time),
        "-map", "0:a?", "-map", "0:v?", "-c", "copy", str(part1_path)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print(f"Extracting part 2 -> {part2_path.name}")
    # Split part 2 (from half_time to end)
    subprocess.run([
        "ffmpeg", "-y", "-i", str(path), "-ss", str(half_time),
        "-map", "0:a?", "-map", "0:v?", "-c", "copy", str(part2_path)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("\nSuccess! Created:")
    print(f"- {part1_path}")
    print(f"- {part2_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Split an audio/video file in two equal halves.")
    parser.add_argument("file", help="Path to the media file")
    args = parser.parse_args()
    split_in_two(args.file)
