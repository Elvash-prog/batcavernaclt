//! SHA-1 is used only for the public range lookup, never for password storage.
use sha1::{Digest, Sha1};
use std::time::Duration;

const ENDPOINT: &str = "https://api.pwnedpasswords.com/range/";
const MAX_BYTES: usize = 524_288;
pub const BLOCKED: &str = "Essa senha apareceu em vazamentos. Escolha outra senha.";
pub const UNAVAILABLE: &str = "Não foi possível verificar a segurança da senha. Tente novamente em instantes.";

fn digest(password: &str) -> String { format!("{:X}", Sha1::digest(password.as_bytes())) }

fn compromised(body: &str, suffix: &str) -> Result<bool, String> {
    if body.is_empty() || body.len() > MAX_BYTES { return Err(UNAVAILABLE.into()); }
    let mut found = false;
    let mut real = false;
    for line in body.lines() {
        let (hash, count) = line.split_once(':').ok_or(UNAVAILABLE)?;
        if hash.len() != 35 || !hash.bytes().all(|b| b.is_ascii_hexdigit())
            || count.is_empty() || count.len() > 20 || !count.bytes().all(|b| b.is_ascii_digit()) {
            return Err(UNAVAILABLE.into());
        }
        let positive = count.bytes().any(|b| b != b'0');
        real |= positive;
        found |= positive && hash.eq_ignore_ascii_case(suffix);
    }
    if !real { return Err(UNAVAILABLE.into()); }
    Ok(found)
}

pub async fn check(password: &str) -> Result<(), String> {
    check_at(password, ENDPOINT).await
}

async fn check_at(password: &str, endpoint: &str) -> Result<(), String> {
    let hash = digest(password);
    // Dedicated client: no Auth headers, cookies, redirects or app diagnostics.
    let client = reqwest::Client::builder().redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(5)).timeout(Duration::from_secs(10))
        .build().map_err(|_| UNAVAILABLE.to_string())?;
    let mut response = client.get(format!("{endpoint}{}", &hash[..5]))
        .header("User-Agent", "BatCaverna-Security/1.0")
        .header("Add-Padding", "true").header("Accept", "text/plain")
        .send().await.map_err(|_| UNAVAILABLE.to_string())?;
    if response.status().as_u16() != 200
        || response.content_length().is_some_and(|n| n > MAX_BYTES as u64) { return Err(UNAVAILABLE.into()); }
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| UNAVAILABLE.to_string())? {
        if bytes.len() + chunk.len() > MAX_BYTES { return Err(UNAVAILABLE.into()); }
        bytes.extend_from_slice(&chunk);
    }
    let body = std::str::from_utf8(&bytes).map_err(|_| UNAVAILABLE.to_string())?;
    if compromised(body, &hash[5..])? { Err(BLOCKED.into()) } else { Ok(()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_lookup_ignores_padding_and_rejects_bad_responses() {
        assert_eq!(digest("password"), "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8");
        let suffix = &digest("password")[5..];
        assert!(compromised(&format!("{suffix}:42\r\n{}:0\r\n", "A".repeat(35)), suffix).unwrap());
        assert!(!compromised(&format!("{suffix}:0\r\n{}:1\r\n", "A".repeat(35)), suffix).unwrap());
        for body in ["".to_owned(), "<html>error</html>".into(), format!("{suffix}:0"), format!("{suffix}:-1"), format!("{suffix}:1\ninvalid"), "x".repeat(MAX_BYTES + 1)] {
            assert_eq!(compromised(&body, suffix), Err(UNAVAILABLE.into()));
        }
    }
    #[tokio::test]
    async fn transport_sends_only_prefix_and_never_accepts_http_errors() {
        use std::{io::{Read, Write}, net::TcpListener};
        for status in [200, 302, 429, 500] {
            let server = TcpListener::bind("127.0.0.1:0").unwrap();
            let endpoint = format!("http://{}/range/", server.local_addr().unwrap());
            let worker = std::thread::spawn(move || {
                let (mut socket, _) = server.accept().unwrap();
                socket.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
                let mut raw = Vec::new();
                loop { let mut b = [0u8; 1024]; let n = socket.read(&mut b).unwrap(); if n == 0 { break; } raw.extend_from_slice(&b[..n]); if raw.windows(4).any(|w| w == b"\r\n\r\n") { break; } }
                let body = "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3\r\n";
                write!(socket, "HTTP/1.1 {status} Test\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
                String::from_utf8(raw).unwrap().to_ascii_lowercase()
            });
            let result = check_at("password", &endpoint).await;
            assert_eq!(result, Err(if status == 200 { BLOCKED } else { UNAVAILABLE }.into()));
            let raw = worker.join().unwrap();
            assert!(raw.starts_with("get /range/5baa6 http/1.1\r\n"));
            assert!(raw.contains("add-padding: true\r\n"));
            for secret in ["password", "1e4c9b93", "authorization:", "apikey:", "cookie:"] { assert!(!raw.contains(secret)); }
        }
    }
}
