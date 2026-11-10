#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use serde_json::Value;
use std::{env, fs, path::{Path, PathBuf}, process::Command};
use walkdir::WalkDir;

#[derive(Serialize)] struct Item { id: String, name: String, bytes: u64, files: u64 }
#[derive(Serialize)] struct NativeInfo { os: String, arch: String, temp: String, windows_temp: String }

fn ps_json(script: &str) -> Result<Value, String> {
    let out = Command::new("powershell").args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script]).output().map_err(|e| e.to_string())?;
    if !out.status.success() { return Err(String::from_utf8_lossy(&out.stderr).trim().to_string()); }
    let output = String::from_utf8_lossy(&out.stdout).trim_start_matches('\u{feff}').trim().to_string();
    serde_json::from_str(&output).map_err(|e| format!("Resposta inválida do Windows: {e}"))
}

fn text(v: &Value, key: &str) -> Option<String> {
    v.get(key).and_then(|x| x.as_str().map(ToString::to_string).or_else(|| Some(x.to_string().trim_matches('"').to_string())))
}
fn number(v: &Value, key: &str) -> Option<f64> {
    v.get(key).and_then(|x| x.as_f64().or_else(|| x.as_u64().map(|n| n as f64)).or_else(|| x.as_str()?.parse().ok()))
}

#[derive(Serialize)] struct SystemSnapshot { os: Value, cpu: Value, gpu: Vec<Value>, ram: Value, disks: Vec<Value>, processes: Vec<Value>, power: Value, security: Value }

#[tauri::command]
fn system_snapshot() -> Result<SystemSnapshot, String> {
    if !cfg!(windows) { return Err("A coleta nativa está disponível somente no Windows".into()); }
    let script = r#"
$OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name,NumberOfCores,NumberOfLogicalProcessors,LoadPercentage,MaxClockSpeed
$cs = Get-CimInstance Win32_ComputerSystem
$os = Get-CimInstance Win32_OperatingSystem
$gpu = @(Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion)
$disks = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,FileSystem,Size,FreeSpace)
$procs = @(Get-Process | Sort-Object CPU -Descending | Select-Object -First 8 Id,ProcessName,CPU,WorkingSet64)
$bat = @(Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining)
$def = Get-MpComputerStatus -ErrorAction SilentlyContinue
$defender = $null
if ($def) { $defender = $def.RealTimeProtectionEnabled }
[pscustomobject]@{ cpu=$cpu; os=$os; gpu=$gpu; disks=$disks; procs=$procs; totalRam=$cs.TotalPhysicalMemory; freeRam=$os.FreePhysicalMemory; battery=$bat; defender=$defender } | ConvertTo-Json -Depth 5 -Compress
"#;
    let raw = ps_json(script)?;
    let cpu = raw.get("cpu").cloned().unwrap_or(Value::Null);
    let osraw = raw.get("os").cloned().unwrap_or(Value::Null);
    let total_ram = number(&raw, "totalRam").unwrap_or(0.0) / 1073741824.0;
    let free_ram = number(&raw, "freeRam").unwrap_or(0.0) / 1048576.0;
    let used_ram = (total_ram - free_ram).max(0.0);
    let cpu_name = text(&cpu, "Name").unwrap_or_else(|| "Processador".into());
    let cpu_usage = number(&cpu, "LoadPercentage").unwrap_or(0.0);
    let gpu = raw.get("gpu").and_then(Value::as_array).cloned().unwrap_or_default().into_iter().map(|g| serde_json::json!({"name": text(&g,"Name").unwrap_or_else(|| "GPU".into()), "vendor":"windows", "vram": number(&g,"AdapterRAM").unwrap_or(0.0)/1073741824.0, "driver": text(&g,"DriverVersion").unwrap_or_default(), "integrated": false})).collect();
    let disks = raw.get("disks").and_then(Value::as_array).cloned().unwrap_or_default().into_iter().filter_map(|d| { let total=number(&d,"Size")? / 1073741824.0; let free=number(&d,"FreeSpace")? / 1073741824.0; Some(serde_json::json!({"id": text(&d,"DeviceID").unwrap_or_default().to_lowercase(), "name": format!("Disco {}", text(&d,"DeviceID").unwrap_or_default()), "type": text(&d,"FileSystem").unwrap_or_else(|| "Windows".into()), "total": total, "used": (total-free).max(0.0)})) }).collect();
    let processes = raw.get("procs").and_then(Value::as_array).cloned().unwrap_or_default().into_iter().map(|p| serde_json::json!({"pid": p.get("Id").cloned().unwrap_or(Value::Null), "name": text(&p,"ProcessName").unwrap_or_default(), "cpu": number(&p,"CPU").unwrap_or(0.0), "ram": number(&p,"WorkingSet64").unwrap_or(0.0)/1073741824.0, "user":"Usuário", "system":false, "protected":false, "path":""})).collect();
    let battery = raw.get("battery").and_then(Value::as_array).and_then(|a| a.first()).and_then(|b| number(b,"EstimatedChargeRemaining"));
    let defender = raw.get("defender").and_then(Value::as_bool);
    Ok(SystemSnapshot { os: serde_json::json!({"name": text(&osraw,"Caption").unwrap_or_else(|| "Windows".into()), "version": text(&osraw,"Version").unwrap_or_default(), "arch": env::consts::ARCH, "privileges":"Usuário normal"}), cpu: serde_json::json!({"name":cpu_name,"cores":number(&cpu,"NumberOfCores"),"threads":number(&cpu,"NumberOfLogicalProcessors"),"usage":cpu_usage,"temp":null,"freq":number(&cpu,"MaxClockSpeed").map(|n| format!("{:.1} GHz",n/1000.0)),"top":null}), gpu, ram: serde_json::json!({"total":total_ram,"used":used_ram,"speed":null,"type":null,"sticks":null,"top":null}), disks, processes, power: serde_json::json!({"current":null,"plans":[],"battery":battery,"laptop":battery.is_some()}), security: serde_json::json!({"defender":defender,"firewall":null,"update":null,"pendingReboot":null,"lastRestore":null}) })
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
