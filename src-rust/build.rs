fn main() {
    // Set OUT_DIR for tauri context generation
    println!("cargo:rerun-if-changed=tauri.conf.json");

    // For development, create a dummy OUT_DIR if it doesn't exist
    if std::env::var("OUT_DIR").is_err() {
        let out_dir = std::env::current_dir()
            .unwrap()
            .join("target")
            .join("debug")
            .join("build")
            .join("narraleaf-host-out");
        std::fs::create_dir_all(&out_dir).ok();
        println!("cargo:rustc-env=OUT_DIR={}", out_dir.display());
    }
}
