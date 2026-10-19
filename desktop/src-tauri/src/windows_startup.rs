//! Per-user Windows startup. Never invokes a shell or requests elevation.
#[cfg(windows)]
mod platform {
    use std::{os::windows::ffi::OsStrExt, path::Path};
    use windows_sys::Win32::System::Registry::*;
    const RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const NAME: &str = "BatCavernaCLT";
    fn wide(value: &str) -> Vec<u16> { value.encode_utf16().chain(Some(0)).collect() }
    struct Key(HKEY);
    impl Drop for Key { fn drop(&mut self) { unsafe { RegCloseKey(self.0); } } }
    fn open(path: &str) -> Result<Key, String> {
        let mut key=std::ptr::null_mut();
        let status=unsafe { RegCreateKeyExW(HKEY_CURRENT_USER,wide(path).as_ptr(),0,std::ptr::null(),0,KEY_QUERY_VALUE|KEY_SET_VALUE,std::ptr::null(),&mut key,std::ptr::null_mut()) };
        if status!=0 { return Err("Não foi possível acessar a inicialização do Windows.".into()); }
        Ok(Key(key))
    }
    fn read(path: &str, name: &str) -> Result<Option<Vec<u16>>, String> {
        let key=open(path)?; let mut size=0; let mut kind=0;
        let status=unsafe { RegQueryValueExW(key.0,wide(name).as_ptr(),std::ptr::null(),&mut kind,std::ptr::null_mut(),&mut size) };
        if status==2 { return Ok(None); }
        if status!=0 || kind!=REG_SZ || size>32768 || size%2!=0 { return Err("Configuração de inicialização inválida.".into()); }
        let mut value=vec![0u16;size as usize/2];
        let status=unsafe { RegQueryValueExW(key.0,wide(name).as_ptr(),std::ptr::null(),&mut kind,value.as_mut_ptr().cast(),&mut size) };
        if status!=0 { return Err("Não foi possível ler a inicialização do Windows.".into()); }
        Ok(Some(value))
    }
    fn write(path: &str,name: &str,value: Option<&[u16]>) -> Result<(),String> {
        let key=open(path)?;
        let status=unsafe { match value {
            Some(value)=>RegSetValueExW(key.0,wide(name).as_ptr(),0,REG_SZ,value.as_ptr().cast(),(value.len()*2) as u32),
            None=>RegDeleteValueW(key.0,wide(name).as_ptr())
        }};
        if status!=0 && !(value.is_none()&&status==2) { return Err("Não foi possível alterar a inicialização do Windows.".into()); }
        Ok(())
    }
    fn command(exe: &Path) -> Vec<u16> {
        let mut value=vec![b'"' as u16];value.extend(exe.as_os_str().encode_wide());value.extend("\" --autostart".encode_utf16());value.push(0);value
    }
    pub fn enabled() -> Result<bool,String> { Ok(read(RUN,NAME)?.is_some()) }
    pub fn snapshot() -> Result<Option<Vec<u16>>,String> { read(RUN,NAME) }
    pub fn restore(value: Option<&[u16]>) -> Result<(),String> { write(RUN,NAME,value) }
    pub fn set(enabled: bool) -> Result<(),String> {
        if enabled { let exe=std::env::current_exe().map_err(|_|"Executável indisponível.")?;write(RUN,NAME,Some(&command(&exe))) }
        else { write(RUN,NAME,None) }
    }
    #[cfg(test)] mod tests {
        use super::*;
        #[test] fn startup_command_quotes_spaces_and_unicode() {
            assert_eq!(String::from_utf16_lossy(&command(Path::new(r"C:\Users\José Santos\BatCaverna.exe"))),"\"C:\\Users\\José Santos\\BatCaverna.exe\" --autostart\0");
        }
        #[test] fn registry_roundtrip_uses_an_isolated_test_key() {
            let path=format!(r"Software\BatCavernaCLT-CI-{}",std::process::id());
            let value=command(Path::new(r"C:\Test Folder\app.exe"));
            let result=(||->Result<(),String>{write(&path,"StartupTest",Some(&value))?;assert_eq!(read(&path,"StartupTest")?,Some(value));write(&path,"StartupTest",None)?;assert_eq!(read(&path,"StartupTest")?,None);Ok(())})();
            unsafe { RegDeleteKeyW(HKEY_CURRENT_USER,wide(&path).as_ptr()); }
            result.unwrap();
        }
    }
}
#[cfg(windows)] pub use platform::*;
#[cfg(not(windows))] pub fn enabled()->Result<bool,String>{Ok(false)}
#[cfg(not(windows))] pub fn snapshot()->Result<Option<Vec<u16>>,String>{Ok(None)}
#[cfg(not(windows))] pub fn restore(_:Option<&[u16]>)->Result<(),String>{Ok(())}
#[cfg(not(windows))] pub fn set(enabled:bool)->Result<(),String>{if enabled{Err("Inicialização automática disponível no Windows.".into())}else{Ok(())}}
