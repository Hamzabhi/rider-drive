// build.rs: compile the proto at `cargo build` time using tonic-build.
// As a fallback if protoc is missing in the toolchain, the generated
// module is committed under src/proto and used as-is.
fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed=proto/indrive.proto");

    // We try tonic-build; if it fails (protoc not installed), we fall back
    // to committed source under src/proto so `cargo build` still works in
    // minimal sandboxes. Docker images run buf generate to populate it.
    match tonic_build::configure()
        .build_server(true)
        .build_client(false)
        .out_dir("src/proto")
        .compile_protos(&["proto/indrive.proto"], &["proto"])
    {
        Ok(_) => println!("cargo:warning=tonic-build: compiled proto to src/proto"),
        Err(e) => println!("cargo:warning=tonic-build skipped ({e}); relying on committed stub"),
    }
    Ok(())
}
