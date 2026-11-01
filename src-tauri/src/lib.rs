use std::process::{Command, Stdio};
use std::io::Read;
use tauri::{AppHandle, Emitter, Manager, path::BaseDirectory};
use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn build_filter(
    fps: u32, 
    resolution: &str, 
    crop_mode: &str, 
    crop_left: f64, 
    crop_right: f64, 
    crop_top: f64, 
    crop_bottom: f64, 
    rotation: u32, 
    flip: bool, 
    is_image: bool, 
    colors: u32, 
    dithering: bool
) -> String {
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

    if !is_image {
        filters.push(format!("fps={}", fps));
    }

    let mut base_filter = filters.join(",");
    if base_filter.is_empty() {
        base_filter = "null".to_string();
    }

    if is_image {
        format!(
            "{},split[s0][s1];[s0]palettegen=max_colors={}:stats_mode=full[p];[s1][p]paletteuse=dither=none", 
            base_filter, colors
        )
    } else {
        let dither_str = if dithering { "sierra2_4a" } else { "none" };
        format!(
            "{},split[s0][s1];[s0]palettegen=max_colors={}[p];[s1][p]paletteuse=dither={}", 
            base_filter, colors, dither_str
        )
    }
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
                lower == "png" || lower == "jpg" || lower == "jpeg" || lower == "webp" || lower == "bmp"
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

        let output_path = std::path::Path::new(&output_dir).join(&output_name);
        let output_path_str = output_path.to_string_lossy().to_string();
        
        let filter_complex = build_filter(
            fps, &resolution, &crop_mode, 
            crop_left, crop_right, crop_top, crop_bottom, 
            rotation, flip, is_image, colors, dithering
        );

        let mut args = vec!["-y".to_string(), "-hide_banner".to_string()];

        if is_image {
            args.extend([
                "-i".to_string(), input_path.clone(), 
                "-frames:v".to_string(), "1".to_string()
            ]);
        } else {
            args.extend([
                "-ss".to_string(), start_time.to_string(), 
                "-t".to_string(), duration.to_string(), 
                "-i".to_string(), input_path.clone()
            ]);
        }

        args.extend(["-vf".to_string(), filter_complex]);
        args.push(output_path_str);

        let mut command = Command::new(&ffmpeg_path);
        command
            .args(&args)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        command.creation_flags(0x08000000);

        let mut child = command.spawn().map_err(|e| e.to_string())?;

        let mut stderr = child.stderr.take().ok_or("Failed to take stderr")?;
        let stderr_handle = std::thread::spawn(move || {
            let mut buf = Vec::new();
            let _ = stderr.read_to_end(&mut buf);
            String::from_utf8_lossy(&buf).to_string()
        });

        let status = child.wait().map_err(|e| e.to_string())?;
        let err_msg = stderr_handle.join().unwrap_or_default();
        
        if !status.success() {
            return Err(format!("FFmpeg error: {}", err_msg));
        }

        let _ = app.emit("conversion-progress", ((index + 1) as f64 / total_files) * 100.0);
    }

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