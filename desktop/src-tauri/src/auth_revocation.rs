use std::time::Duration;

pub async fn revoke(client: &reqwest::Client, base: &str, key: &str, token: &str, scope: &str) -> Result<(), String> {
    if !matches!(scope, "local" | "others" | "global") { return Err("Escopo de sessão inválido.".into()); }
    let response = client.post(format!("{base}/auth/v1/logout?scope={scope}"))
        .header("apikey", key).bearer_auth(token).timeout(Duration::from_secs(15)).send().await
        .map_err(|_| "Não foi possível encerrar a sessão no servidor. Verifique a conexão e tente novamente.".to_string())?;
    if response.status().is_success() { return Ok(()); }
    Err("O servidor não confirmou o encerramento da sessão. Entre novamente ou tente sair mais tarde.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{io::{Read, Write}, net::TcpListener, thread};

    #[tokio::test(flavor = "current_thread")]
    async fn sends_authenticated_post_with_explicit_scope_and_checks_status() {
        for scope in ["local", "others", "global"] {
            for status in [204, 401, 403, 429, 500] {
                let listener=TcpListener::bind("127.0.0.1:0").unwrap();
                let base=format!("http://{}",listener.local_addr().unwrap());
                let server=thread::spawn(move || {
                    let (mut socket,_)=listener.accept().unwrap();
                    socket.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
                    let mut raw=Vec::new();let mut buffer=[0;1024];
                    while !raw.windows(4).any(|w|w==b"\r\n\r\n") {
                        let n=socket.read(&mut buffer).unwrap();assert!(n>0);raw.extend_from_slice(&buffer[..n]);
                    }
                    write!(socket,"HTTP/1.1 {status} Test\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").unwrap();
                    String::from_utf8(raw).unwrap().to_lowercase()
                });
                let result=revoke(&reqwest::Client::builder().no_proxy().build().unwrap(),&base,"public-test-key","test-jwt",scope).await;
                let request=server.join().unwrap();
                assert!(request.starts_with(&format!("post /auth/v1/logout?scope={scope} ")));
                assert!(request.contains("authorization: bearer test-jwt\r\n"));
                assert!(request.contains("apikey: public-test-key\r\n"));
                assert_eq!(result.is_ok(),status==204);
            }
        }
    }

    #[tokio::test(flavor = "current_thread")]
    async fn offline_and_invalid_scope_do_not_report_success() {
        let client=reqwest::Client::builder().no_proxy().build().unwrap();
        let listener=TcpListener::bind("127.0.0.1:0").unwrap();
        let base=format!("http://{}",listener.local_addr().unwrap());drop(listener);
        assert!(revoke(&client,&base,"key","token","local").await.is_err());
        assert!(revoke(&client,&base,"key","token","invalid").await.is_err());
    }
}
