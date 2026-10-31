use std::process::Command;
use std::io::{BufRead, BufReader};
use tauri::{AppHandle, Emitter, Manager, path::BaseDirectory};
use regex::Regex;
use std::path::Path;

fn build_filter(fps: u32, resolution: &str, crop_mode: &str, crop_left: f64, crop_right: f64, crop_top: f64, crop_bottom: f64, rotation: u32, flip: bool, is_image: bool, colors: u32, dithering: bool) -> String {
    let mut filters = Vec::new();

    if crop_mode == "1:1" {
        filters.push("crop='min(iw,ih)':'min(iw,ih)'".to_string());
    } else if crop_mode == "16:9" {
        filters.push("crop='if(gt(iw/ih,16/9),ih*16/9,iw)':'if(gt(iw/ih,16/9),ih,iw*9/16)'".to_string());
    } else if crop_mode == "free" && (crop_left > 0.0 || crop_right > 0.0 || crop_top > 0.0 || crop_bottom > 0.0) {
        let w = format!("floor(iw*(1-{}-{}))", crop_left, crop_right);
        let h = format!("floor(ih*(1-{}-{}))", crop_top, crop_bottom);
        let x = format!("floor(iw*{})", crop_left);
        let y = format!("floor(ih*{})", crop_top);
        filters.push(format!("crop={}:{}:{}:{}", w, h, x, y));
    }

    if rotation == 90 {
        filters.push("transpose=1".to_string());
    } else if rotation == 180 {
        filters.push("transpose=2,transpose=2".to_string());
    } else if rotation == 270 {
        filters.push("transpose=2".to_string());
    }

    if flip {
        filters.push("hflip".to_string());
    }

    if resolution != "original" {
        filters.push(format!("scale=-2:{}:flags=lanczos", resolution));
    }

    if is_image {
        filters.push("format=rgb24".to_string());
        return filters.join(",");
    }

    filters.push(format!("fps={}", fps));
    let base_filter = filters.join(",");
    
    let dither_str = if dithering { "sierra2_4a" } else { "none" };
    
    format!(
        "{},split[s0][s1];[s0]palettegen=max_colors={}[p];[s1][p]paletteuse=dither={}", 
        base_filter, colors, dither_str
    )
}

#[tauri::command]
async fn convert_all(
    app: AppHandle,
    input_paths: Vec<String>,
    output_dir: String,
    custom_name: Option<String>,
    start_time: f64,
    duration: f64,
    fps: u32,
    resolution: String,
    crop_mode: String,
    crop_left: f64,
    crop_right: f64,
    crop_top: f64,
    crop_bottom: f64,
    rotation: u32,
    flip: bool,
    colors: u32,
    dithering: bool,
) -> Result<(), String> {
    let ffmpeg_path = app
        .path()
        .resolve("ffmpeg.exe", BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;

    let total_files = input_paths.len() as f64;

    for (index, input_path) in input_paths.iter().enumerate() {
        let is_image = Path::new(input_path)
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| {
                let lower = s.to_lowercase();
                lower == "png" || lower == "jpg" || lower == "jpeg"
            })
            .unwrap_or(false);

        let output_name = if let Some(ref name) = custom_name {
            if total_files == 1.0 {
                name.clone()
            } else {
                format!("{}.gif", Path::new(input_path).file_stem().and_then(|s| s.to_str()).unwrap_or("output"))
            }
        } else {
            format!("{}.gif", Path::new(input_path).file_stem().and_then(|s| s.to_str()).unwrap_or("output"))
        };

        let output_path = format!("{}/{}", output_dir, output_name);
        let filter_complex = build_filter(fps, &resolution, &crop_mode, crop_left, crop_right, crop_top, crop_bottom, rotation, flip, is_image, colors, dithering);

        let mut args = vec!["-y".to_string()];

        if is_image {
            args.extend(["-loop".to_string(), "1".to_string(), "-i".to_string(), input_path.clone()]);
            args.extend(["-t".to_string(), "1".to_string()]);
        } else {
            args.extend(["-ss".to_string(), start_time.to_string()]);
            args.extend(["-t".to_string(), duration.to_string()]);
            args.extend(["-i".to_string(), input_path.clone()]);
        }

        args.extend(["-vf".to_string(), filter_complex]);
        args.push(output_path);

        let mut child = Command::new(&ffmpeg_path)
            .args(&args)
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        let stderr = child.stderr.take().ok_or("Failed to take stderr")?;
        let reader = BufReader::new(stderr);
        let time_regex = Regex::new(r"time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})").unwrap();

        for line in reader.lines() {
            if let Ok(line_str) = line {
                if let Some(caps) = time_regex.captures(&line_str) {
                    let h: f64 = caps[1].parse().unwrap_or(0.0);
                    let m: f64 = caps[2].parse().unwrap_or(0.0);
                    let s: f64 = caps[3].parse().unwrap_or(0.0);
                    let ms: f64 = caps[4].parse().unwrap_or(0.0);
                    
                    let current_file_time = h * 3600.0 + m * 60.0 + s + ms / 100.0;
                    let file_duration = if is_image { 1.0 } else { duration };
                    
                    let file_progress = (current_file_time / file_duration).min(1.0);
                    let total_progress = ((index as f64 + file_progress) / total_files) * 100.0;

                    let _ = app.emit("conversion-progress", total_progress);
                }
            }
        }

        let status = child.wait().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("FFmpeg failed on file: {}", output_name));
        }
    }

    let _ = app.emit("conversion-progress", 100.0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![convert_all])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}