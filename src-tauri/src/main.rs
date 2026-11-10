#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use serde_json::Value;
use std::{env, fs, path::{Path, PathBuf}, process::Command};
use sysinfo::{Disks, System};
use walkdir::WalkDir;

#[derive(Serialize)] struct Item { id: String, name: String, bytes: u64, files: u64 }
#[derive(Serialize)] struct NativeInfo { os: String, arch: String, temp: String, windows_temp: String }
#[derive(Serialize)] struct SystemSnapshot { os: Value, cpu: Value, gpu: Vec<Value>, ram: Value, disks: Vec<Value>, processes: Vec<Value>, power: Value, security: Value }

#[tauri::command]
fn system_snapshot() -> Result<SystemSnapshot, String> {
    let mut system = System::new_all().map_err(|e| e.to_string())?;
    system.refresh_all();
    let total_ram = system.total_memory() as f64 / 1073741824.0;
    let used_ram = system.used_memory() as f64 / 1073741824.0;
    let cpu = system.cpus().first();
    let cpu_name = cpu.map(|c| c.brand().to_string()).filter(|s| !s.is_empty()).unwrap_or_else(|| "Processador".into());
    let cpu_freq = cpu.map(|c| format!("{:.1} GHz", c.frequency() as f64 / 1000.0));
    let cpu_usage = system.global_cpu_usage();
    let mut disks = Vec::new();
    let disks_source = Disks::new_with_refreshed_list().map_err(|e| e.to_string())?;
    for disk in &disks_source {
        let total = disk.total_space() as f64 / 1073741824.0;
        let used = (disk.total_space().saturating_sub(disk.available_space())) as f64 / 1073741824.0;
        let mount = disk.mount_point().to_string_lossy().to_string();
        disks.push(serde_json::json!({"id": mount.to_lowercase(), "name": format!("Disco {}", mount), "type": disk.file_system().to_string_lossy(), "total": total, "used": used}));
    }
    let mut process_list: Vec<_> = system.processes().values().collect();
    process_list.sort_by(|a, b| b.memory().cmp(&a.memory()));
    let processes = process_list.into_iter().take(8).map(|p| serde_json::json!({"pid": p.pid().as_u32(), "name": p.name().to_string_lossy(), "cpu": p.cpu_usage(), "ram": p.memory() as f64 / 1073741824.0, "user":"Usuário", "system":false, "protected":false, "path": p.exe().map(|x| x.to_string_lossy().to_string()).unwrap_or_default()})).collect();
    let os_name = System::name().unwrap_or_else(|_| "Windows".into());
    let os_version = System::os_version().unwrap_or_default();
    Ok(SystemSnapshot {
        os: serde_json::json!({"name": os_name, "version": os_version, "arch": env::consts::ARCH, "privileges":"Usuário normal"}),
        cpu: serde_json::json!({"name":cpu_name,"cores":system.cpus().len(),"threads":system.cpus().len(),"usage":cpu_usage,"temp":null,"freq":cpu_freq,"top":null}),
        gpu: Vec::new(),
        ram: serde_json::json!({"total":total_ram,"used":used_ram,"speed":null,"type":null,"sticks":null,"top":null}),
        disks,
        processes,
        power: serde_json::json!({"current":null,"plans":[],"battery":null,"laptop":false}),
        security: serde_json::json!({"defender":null,"firewall":null,"update":null,"pendingReboot":null,"lastRestore":null}),
    })
}

fn bytes_in(path: &Path) -> (u64, u64) {
    if !path.exists() { return (0, 0); }
    let mut total = 0; let mut files = 0;
    for entry in WalkDir::new(path).follow_links(false).into_iter().filter_map(Result::ok) {
        if entry.file_type().is_file() { files += 1; total += entry.metadata().map(|m| m.len()).unwrap_or(0); }
    }
    (total, files)
}

fn safe_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(v) = env::var("TEMP") { roots.push(PathBuf::from(v)); }
    if let Ok(v) = env::var("TMP") { roots.push(PathBuf::from(v)); }
    if cfg!(windows) { roots.push(PathBuf::from(r"C:\Windows\Temp")); }
    roots.sort(); roots.dedup(); roots
}

fn allowed(path: &Path) -> bool {
    let candidate = match fs::canonicalize(path) { Ok(p) => p, Err(_) => path.to_path_buf() };
    safe_roots().iter().any(|root| { let root = fs::canonicalize(root).unwrap_or_else(|_| root.clone()); candidate.starts_with(&root) && candidate != root })
}

#[tauri::command]
fn system_info() -> NativeInfo { NativeInfo { os: env::consts::OS.to_string(), arch: env::consts::ARCH.to_string(), temp: env::var("TEMP").unwrap_or_default(), windows_temp: if cfg!(windows) { r"C:\Windows\Temp".into() } else { String::new() } } }

#[tauri::command]
fn analyze_cleanup() -> Vec<Item> { safe_roots().into_iter().enumerate().map(|(i, path)| { let (bytes, files) = bytes_in(&path); Item { id: if i == 0 { "temp-user".into() } else { "temp-win".into() }, name: path.display().to_string(), bytes, files } }).collect() }

#[tauri::command]
fn clean_paths(paths: Vec<String>) -> Result<(u64, u64), String> {
    let mut freed = 0; let mut removed = 0;
    for raw in paths { let path = PathBuf::from(raw); if !allowed(&path) { return Err(format!("Caminho não permitido: {}", path.display())); }
        if path.is_file() { let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0); fs::remove_file(&path).map_err(|e| e.to_string())?; freed += size; removed += 1; }
        else if path.is_dir() { for e in WalkDir::new(&path).contents_first(true).into_iter().filter_map(Result::ok) { let p = e.path(); if p == path { continue; } if p.is_file() { let size = fs::metadata(p).map(|m| m.len()).unwrap_or(0); if fs::remove_file(p).is_ok() { freed += size; removed += 1; } } else if p.is_dir() { let _ = fs::remove_dir(p); } } }
    }
    Ok((freed, removed))
}

#[tauri::command]
fn apply_visual_profile(profile: String) -> Result<String, String> {
    if !cfg!(windows) { return Ok("Disponível somente no Windows".into()); }
    let value = match profile.as_str() { "maximo" => "2", "desempenho" => "2", "equilibrado" => "1", _ => return Err("Perfil desconhecido".into()) };
    let out = Command::new("reg").args(["ADD", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects", "/v", "VisualFXSetting", "/t", "REG_DWORD", "/d", value, "/f"]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok("Perfil visual aplicado. Algumas alterações podem exigir novo login.".into()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}

#[tauri::command]
fn create_restore_point() -> Result<String, String> {
    if !cfg!(windows) { return Ok("Pontos de restauração estão disponíveis somente no Windows".into()); }
    let script = "Checkpoint-Computer -Description 'SCANNY' -RestorePointType MODIFY_SETTINGS";
    let out = Command::new("powershell").args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script]).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok("Ponto de restauração solicitado.".into()) } else { Err(String::from_utf8_lossy(&out.stderr).to_string()) }
}

#[tauri::command]
fn run_repair(id: String) -> Result<String, String> {
    if !cfg!(windows) { return Ok("Reparos estão disponíveis somente no Windows".into()); }
    let (program, args): (&str, Vec<&str>) = match id.as_str() { "dns" => ("ipconfig", vec!["/flushdns"]), "sfc" => ("sfc", vec!["/scannow"]), "dism" => ("DISM", vec!["/Online", "/Cleanup-Image", "/RestoreHealth"]), _ => return Err("Reparo não permitido nesta versão".into()) };
    let out = Command::new(program).args(args).output().map_err(|e| e.to_string())?;
    let text = format!("{}\n{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr));
    if out.status.success() { Ok(text) } else { Err(text) }
}

fn main() { tauri::Builder::default().invoke_handler(tauri::generate_handler![system_info, system_snapshot, analyze_cleanup, clean_paths, apply_visual_profile, create_restore_point, run_repair]).run(tauri::generate_context!()).expect("error while running SCANNY"); }
