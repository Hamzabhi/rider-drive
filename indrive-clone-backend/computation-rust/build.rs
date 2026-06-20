// build.rs: compile the proto at `cargo build` time using tonic-build.
//
// Output goes to the default OUT_DIR, which is exactly where grpc_server.rs
// reads it from: include!(concat!(env!("OUT_DIR"), "/indrive.rs")). Requires
// `protoc` to be available on the build host (the Docker image installs it).
fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed=proto/indrive.proto");

    // Use a vendored protoc so the build doesn't require a system install.
    // Respect an explicit PROTOC override if the host provides one.
    if std::env::var_os("PROTOC").is_none() {
        if let Ok(p) = protoc_bin_vendored::protoc_bin_path() {
            std::env::set_var("PROTOC", p);
        }
    }

    tonic_build::configure()
        .build_server(true)
        .build_client(false)
        .compile(&["proto/indrive.proto"], &["proto"])?;

    Ok(())
}
