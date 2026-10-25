import SwiftUI

struct EmailProof {
    let token:String
    let type:String
    let hashed:Bool
    init(_ value:String,recovery:Bool) throws {
        let raw = value.trimmingCharacters(in:.whitespacesAndNewlines)
        guard raw.count <= 4096 else { throw BackendError.invalidInput("O código ou link é muito longo.") }
        if raw.range(of:"^[0-9]{6,10}$",options:.regularExpression) != nil {
            token = raw; type = recovery ? "recovery":"email"; hashed = false; return
        }
        guard let url = URLComponents(string:raw),url.scheme == "https",url.host == "luoqlhgfmixvfqbfcdoc.supabase.co",url.port == nil,url.user == nil,url.password == nil,url.fragment == nil,url.percentEncodedPath == "/auth/v1/verify",let items = url.queryItems else { throw Self.invalid }
        var params:[String:String] = [:]
        for item in items { guard params[item.name] == nil,let value = item.value else { throw Self.invalid }; params[item.name] = value }
        guard !(params["token"] != nil && params["token_hash"] != nil),let value = params["token_hash"] ?? params["token"],value.range(of:"^[A-Za-z0-9_-]{20,256}$",options:.regularExpression) != nil,let kind = params["type"],recovery ? kind == "recovery":["signup","email"].contains(kind) else { throw Self.invalid }
        token = value; type = kind; hashed = true
    }
    private static var invalid:BackendError { .invalidInput("Informe o código ou copie o link original do e-mail, sem abri-lo.") }
    func payload(email:String) -> [String:Any] {
        hashed ? ["type":type,"token_hash":token]:["type":type,"email":email,"token":token]
    }
}
enum AccountInput {
    static func email(_ value:String) throws -> String {
        let address = value.trimmingCharacters(in:.whitespacesAndNewlines).lowercased()
        guard address.count <= 254,address.range(of:"^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",options:.regularExpression) != nil else { throw BackendError.invalidInput("Informe um e-mail válido.") }
        return address
    }
    static func password(_ value:String,confirmation:String) throws {
        guard (12...256).contains(value.count) else { throw BackendError.invalidInput("Use uma senha de 12 a 256 caracteres.") }
        guard value == confirmation else { throw BackendError.invalidInput("As senhas não conferem.") }
    }
    static func registration(name:String,username:String,email:String,password:String,confirmation:String) throws -> [String:Any] {
        let name = name.trimmingCharacters(in:.whitespacesAndNewlines),user = username.trimmingCharacters(in:.whitespacesAndNewlines)
        guard !name.isEmpty,name.count <= 40 else { throw BackendError.invalidInput("Informe um nome de perfil de até 40 caracteres.") }
        guard user.range(of:"^[A-Za-z0-9_.-]{1,24}$",options:.regularExpression) != nil else { throw BackendError.invalidInput("O usuário aceita até 24 letras, números, pontos, hífens ou sublinhados.") }
        let address = try Self.email(email); try Self.password(password,confirmation:confirmation)
        return ["email":address,"password":password,"data":["username":user,"nome":name]]
    }
}
struct EmailActionOutcome {
    let message:String
    var warning = false
    var confirmationRequired = false
}
enum AccountAccessFlow:String,Identifiable { case register,confirm,recovery; var id:String { rawValue } }
struct AccountAccessView:View {
    let flow:AccountAccessFlow
    @EnvironmentObject private var backend:Backend
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmation = ""
    @State private var proof = ""
    @State private var registered = false
    @State private var completed = false
    @State private var busy = false
    @State private var lastSent:Date?
    @State private var message:String?
    @State private var warning = false
    @State private var error:String?
    private var registering:Bool { flow == .register && !registered }
    private var recovering:Bool { flow == .recovery }
    private var title:String { registering ? "Criar meu perfil":recovering ? "Recuperar senha":"Confirmar cadastro" }
    var body:some View {
        Form {
            if completed {
                Section { Label(message ?? "Concluído",systemImage:warning ? "exclamationmark.circle":"checkmark.circle").foregroundStyle(warning ? Color.orange:Color.green); Button("Voltar para entrar") { dismiss() } }.listRowBackground(Caverna.panel)
            } else {
                Section(registering ? "Seu perfil":"Seu e-mail") {
                    if registering {
                        field("Nome do perfil",text:$name).textContentType(.name)
                        field("Usuário",text:$username).textContentType(.username).textInputAutocapitalization(.never).autocorrectionDisabled()
                    }
                    field("E-mail",text:$email).keyboardType(.emailAddress).textContentType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                }.listRowBackground(Caverna.panel)
                if !registering {
                    Section {
                        TimelineView(.periodic(from:.now,by:1)) { context in
                            let remaining = max(0,Int(ceil(60-context.date.timeIntervalSince(lastSent ?? .distantPast))))
                            Button(remaining > 0 ? "Aguarde \(remaining)s":recovering ? "Enviar e-mail de recuperação":"Reenviar confirmação") { sendEmail() }.disabled(busy || remaining > 0 || email.isEmpty)
                        }
                        SecureField("Código ou link original do e-mail",text:$proof).textContentType(.oneTimeCode).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Text("Use o código recebido ou copie o link original do e-mail sem abri-lo.").font(.caption).foregroundStyle(.secondary)
                    }.listRowBackground(Caverna.panel)
                }
                if registering || recovering {
                    Section(recovering ? "Nova senha":"Senha") {
                        SecureField("Senha · mínimo de 12 caracteres",text:$password).textContentType(.newPassword)
                        SecureField("Confirmar senha",text:$confirmation).textContentType(.newPassword)
                    }.listRowBackground(Caverna.panel)
                }
                if let message { Section { Text(message).foregroundStyle(.secondary) }.listRowBackground(Caverna.panel) }
                if let error { Section { Text(error).foregroundStyle(.red) }.listRowBackground(Caverna.panel) }
                Section {
                    Button(action:submit) { HStack { Spacer(); if busy { ProgressView() }; Text(registering ? "Criar perfil":recovering ? "Salvar nova senha":"Confirmar e-mail").bold(); Spacer() } }.disabled(busy || email.isEmpty || (!registering && proof.isEmpty))
                }.listRowBackground(Caverna.accent.opacity(0.28))
            }
        }.disabled(busy).scrollContentBackground(.hidden).background(Caverna.gradient).navigationTitle(title).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement:.topBarLeading) { Button(completed ? "Fechar":"Cancelar") { dismiss() }.disabled(busy) } }.interactiveDismissDisabled(busy)
            .onDisappear { proof = ""; password = ""; confirmation = "" }
    }
    private func field(_ label:String,text:Binding<String>) -> some View {
        VStack(alignment:.leading,spacing:6) { Text(label).font(.caption).foregroundStyle(.secondary); TextField("",text:text).accessibilityLabel(label) }
    }
    private func sendEmail() {
        guard !busy else { return }; busy = true; error = nil; message = nil
        Task {
            defer { busy = false }
            do { try await backend.sendAccountEmail(email,recovery:recovering); lastSent = Date(); message = recovering ? "Se o e-mail estiver cadastrado, você receberá a recuperação de senha.":"Se houver confirmação pendente, um novo e-mail será enviado." }
            catch { self.error = error is BackendError ? error.localizedDescription:"Não foi possível enviar o e-mail. Tente novamente."; if case BackendError.http(429) = error { lastSent = Date() } }
        }
    }
    private func submit() {
        guard !busy else { return }; busy = true; error = nil; message = nil
        Task {
            defer { busy = false }
            do {
                if registering {
                    let result = try await backend.register(name:name,username:username,email:email,password:password,confirmation:confirmation)
                    message = result.message; warning = result.warning; registered = true; completed = !result.confirmationRequired; lastSent = Date()
                } else {
                    let result = try await backend.finishAccountEmail(email:email,proof:proof,recovery:recovering,password:password,confirmation:confirmation)
                    message = result.message; warning = result.warning; completed = true
                }
                password = ""; confirmation = ""; proof = ""
            } catch { self.error = error is BackendError ? error.localizedDescription:"Não foi possível concluir. Verifique a conexão e solicite outro e-mail se necessário." }
        }
    }
}
