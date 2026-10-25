import Foundation
import Combine
import Security

enum SessionVault {
    static func query(account: String) -> [String: Any] { [kSecClass as String:kSecClassGenericPassword, kSecAttrService as String:"dev.gamersclt.batcaverna.session", kSecAttrAccount as String:account] }
    static func read(account: String = "current") throws -> Data? {
        var q = query(account: account); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var value: CFTypeRef?; let status = SecItemCopyMatching(q as CFDictionary, &value)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw BackendError.storage }
        return value as? Data
    }
    static func save(_ data: Data, account: String = "current") throws {
        let attributes: [String:Any] = [kSecValueData as String:data, kSecAttrAccessible as String:kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let status = SecItemUpdate(query(account: account) as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var q = query(account: account); attributes.forEach { q[$0.key] = $0.value }
            guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw BackendError.storage }
        } else if status != errSecSuccess { throw BackendError.storage }
    }
    static func clear(account: String = "current") throws {
        let status = SecItemDelete(query(account: account) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw BackendError.storage }
    }
}
enum BackendError: LocalizedError {
    case http(Int), storage, missingRetro, tooLarge, noMatch, conflict, duplicate, invalidInput(String)
    var errorDescription: String? {
        switch self {
        case .http(401): return "Sessão inválida ou usuário e senha incorretos. Entre novamente."
        case .http(429): return "Muitas solicitações. Aguarde um minuto e tente novamente."
        case .http: return "Não foi possível concluir a solicitação. Tente novamente."
        case .conflict: return "O título mudou em outro dispositivo. Feche esta janela e atualize a biblioteca antes de tentar novamente."
        case .duplicate: return "Este título já está na sua biblioteca."
        case .invalidInput(let message): return message
        case .storage: return "Não foi possível acessar a sessão protegida neste dispositivo."
        case .missingRetro: return "Conecte seu usuário RetroAchievements nas integrações do desktop."
        case .tooLarge: return "A coleção ultrapassou o limite de sincronização. Nenhum resumo parcial foi exibido."
        case .noMatch: return "Descrição indisponível para este título no catálogo."
        }
    }
}
private final class NoRedirect: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
@MainActor final class Backend: ObservableObject {
    @Published private(set) var session: AppSession?
    @Published var startupError: String?
    private let origin = "https://luoqlhgfmixvfqbfcdoc.supabase.co"
    // Publishable key only. Privileged keys stay in Supabase Edge Functions.
    private let publicKey = "sb_publishable_g_dTf0TrTXy_p8PjjHip2Q_ByqI2r_e"
    private let network: URLSession
    private var refreshTask: Task<AppSession, Error>?
    init(network suppliedNetwork: URLSession? = nil, initialSession: AppSession? = nil) {
        let config = URLSessionConfiguration.ephemeral
        config.httpCookieStorage = nil; config.urlCache = nil; config.timeoutIntervalForRequest = 30
        network = suppliedNetwork ?? URLSession(configuration: config, delegate: NoRedirect(), delegateQueue: nil)
        if let initialSession { session = initialSession; return }
        do { if let data = try SessionVault.read() { session = try JSONDecoder().decode(AppSession.self, from: data) } }
        catch { startupError = "Não foi possível restaurar a sessão. Entre novamente." }
    }
    private func send(_ path: String, query: [URLQueryItem] = [], body: [String:Any]? = nil, token: String? = nil, method: String? = nil, representation: Bool = false) async throws -> Data {
        var parts = URLComponents(string: origin + path)!; parts.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: parts.url!); request.httpMethod = method ?? (body == nil ? "GET" : "POST")
        if representation { request.setValue("return=representation",forHTTPHeaderField:"Prefer") }
        request.setValue(publicKey, forHTTPHeaderField: "apikey")
        if let token { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        if let body { request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await network.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw BackendError.http(503) }
        if response.statusCode == 409 && path == "/rest/v1/itens" { throw BackendError.duplicate }
        guard (200..<300).contains(response.statusCode) else { throw BackendError.http(response.statusCode) }
        return data
    }
    func login(username: String, password: String) async throws {
        let data = try await send("/functions/v1/login-username", body: ["username":username.trimmingCharacters(in:.whitespacesAndNewlines),"password":password])
        let next = try JSONDecoder().decode(AppSession.self, from: data)
        try SessionVault.save(try JSONEncoder().encode(next)); session = next
    }
    private func token() async throws -> String {
        guard let current = session else { throw BackendError.http(401) }
        if current.expiresAt > Date().timeIntervalSince1970 + 60 { return current.accessToken }
        if let refreshTask { return try await refreshTask.value.accessToken }
        let task = Task<AppSession, Error> {
            let data = try await self.send("/auth/v1/token", query:[.init(name:"grant_type",value:"refresh_token")],body:["refresh_token":current.refreshToken])
            let next = try JSONDecoder().decode(AppSession.self, from:data)
            try SessionVault.save(try JSONEncoder().encode(next)); self.session = next; return next
        }
        refreshTask = task
        defer { refreshTask = nil }
        do { return try await task.value.accessToken }
        catch BackendError.http(let code) where code == 400 || code == 401 { try SessionVault.clear(); session = nil; throw BackendError.http(401) }
    }
    func logout() async throws {
        let access = try await token()
        _ = try await send("/auth/v1/logout",query:[.init(name:"scope",value:"local")],body:[:],token:access)
        try SessionVault.clear(); session = nil
    }
    private func get<T:Decodable>(_ type: T.Type, _ path: String, query: [URLQueryItem] = []) async throws -> T {
        let access = try await token()
        return try JSONDecoder().decode(type,from: await send(path,query:query,token:access))
    }
    private func bright<T:Decodable>(_ type:T.Type, _ body:[String:Any]) async throws -> T {
        let access = try await token()
        return try JSONDecoder().decode(type,from: await send("/functions/v1/bright-api",body:body,token:access))
    }
    func library() async throws -> [LibraryItem] {
        guard let user = session?.user.id.uuidString else { throw BackendError.http(401) }
        var all: [LibraryItem] = []
        for offset in stride(from:0,to:20000,by:250) {
            let rows = try await get([LibraryItem].self,"/rest/v1/itens",query:[.init(name:"select",value:"id,nome,categoria,status,capa,tipo,horas,nota,plataforma,onde,ano,updated_at"),.init(name:"user_id",value:"eq."+user),.init(name:"order",value:"id.asc"),.init(name:"limit",value:"250"),.init(name:"offset",value:String(offset))])
            all += rows; if rows.count < 250 { return all }
        }
        throw BackendError.tooLarge
    }
    func saveLibrary(_ draft:LibraryDraft,media:Bool,item:LibraryItem? = nil) async throws {
        if let item,item.categoria != (media ? "filmes":"jogos") { throw BackendError.invalidInput("Tipo de biblioteca inválido.") }
        let fields = try draft.fields(media:media,original:item)
        guard let user = session?.user.id else { throw BackendError.http(401) }
        let access = try await token()
        guard session?.user.id == user else { throw BackendError.http(401) }
        var body = fields
        let query:[URLQueryItem]
        if let item { query = try LibraryWriteTarget.query(item:item,user:user) }
        else { body["user_id"] = user.uuidString; body["categoria"] = media ? "filmes":"jogos"; body["generos"] = []; query = [.init(name:"select",value:"id")] }
        let data = try await send("/rest/v1/itens",query:query,body:body,token:access,method:item == nil ? "POST":"PATCH",representation:true)
        guard session?.user.id == user else { throw BackendError.http(401) }
        guard let rows = try JSONSerialization.jsonObject(with:data) as? [[String:Any]],rows.count == 1 else { throw BackendError.conflict }
    }
    func removeLibrary(_ item:LibraryItem) async throws {
        guard let user = session?.user.id else { throw BackendError.http(401) }
        let query = try LibraryWriteTarget.query(item:item,user:user),access = try await token()
        guard session?.user.id == user else { throw BackendError.http(401) }
        let data = try await send("/rest/v1/itens",query:query,token:access,method:"DELETE",representation:true)
        guard session?.user.id == user else { throw BackendError.http(401) }
        guard let rows = try JSONSerialization.jsonObject(with:data) as? [[String:Any]],rows.count == 1 else { throw BackendError.conflict }
    }
    func searchCatalogue(_ query:String,media:Bool,type:String) async throws -> [CatalogueTitle] {
        let text = query.trimmingCharacters(in:.whitespacesAndNewlines)
        guard (2...160).contains(text.count) else { throw BackendError.invalidInput("Digite entre 2 e 160 caracteres.") }
        let tv = StatusPolicyKey.type(type) != "Filmes"
        let path = "/functions/v1/native-api/api/catalog/" + (media ? "tmdb/search/"+(tv ? "tv":"movie") : "igdb/games")
        let result = try await get(CatalogueResult.self,path,query:[.init(name:media ? "query":"search",value:text),.init(name:"language",value:"pt-BR"),.init(name:"page_size",value:"20")])
        return type == "🍥 Anime" && media ? result.results.filter { $0.genre_ids?.contains(16) == true } : result.results
    }
    func setRetroStatus(game:Int,status:String) async throws {
        guard game > 0,["progress","backlog","finished","platinum","paused","abandoned"].contains(status) else { throw BackendError.invalidInput("Status inválido.") }
        _ = try await bright(RetroCollection.self,["op":"raSaveCollection","statusGameId":game,"status":status])
    }
    func removeRetro(game:Int) async throws {
        guard game > 0 else { throw BackendError.invalidInput("Jogo inválido.") }
        _ = try await bright(RetroCollection.self,["op":"raSaveCollection","removeGameId":game])
    }
    func retro() async throws -> (RetroProfile,[RetroGame],[String:String]) {
        struct Profile:Decodable { let retroachievements_user: String? }
        guard let user = session?.user.id.uuidString else { throw BackendError.http(401) }
        let rows = try await get([Profile].self,"/rest/v1/perfis",query:[.init(name:"select",value:"retroachievements_user"),.init(name:"id",value:"eq."+user),.init(name:"limit",value:"1")])
        guard let name = rows.first?.retroachievements_user, !name.isEmpty else { throw BackendError.missingRetro }
        let profile = try await bright(RetroProfile.self,["op":"raPerfil","usuario":name])
        let collection = try await bright(RetroCollection.self,["op":"raCollection"])
        var games: [RetroGame] = []
        for offset in stride(from:0,through:5000,by:500) {
            let page = try await bright(RetroPage.self,["op":"raJogos","usuario":name,"offset":offset])
            games += page.jogos
            if games.count >= page.total { break }
            if offset == 5000 || page.jogos.isEmpty { throw BackendError.tooLarge }
        }
        let known = Set(games.map(\.gameId))
        for id in collection.game_ids ?? [] where !known.contains(id) {
            let detail = try await achievements(game:id,user:name)
            games.append(RetroGame(gameId:id,nome:detail.nome,console:detail.console,capa:detail.capa,total:detail.lista.count,desbloqueadas:detail.lista.filter(\.got).count,hardcore:detail.lista.filter(\.hardcore).count,premio:nil))
        }
        let hidden = Set(collection.hidden_game_ids ?? [])
        return (profile,games.filter { !hidden.contains($0.gameId) },collection.statuses ?? [:])
    }
    func achievements(game:Int,user:String) async throws -> GameAchievements { try await bright(GameAchievements.self,["op":"raConquistas","gameId":game,"usuario":user]) }
    func description(name:String,media:Bool,tv:Bool = false) async throws -> String {
        let kind = tv ? "tv" : "movie"
        let base = "/functions/v1/native-api/api/catalog/" + (media ? "tmdb/" : "igdb/")
        let result = try await get(CatalogueResult.self,base + (media ? "search/"+kind : "games"),query:[.init(name:media ? "query":"search",value:name),.init(name:"language",value:"pt-BR")])
        let key = { (s:String) in s.folding(options:[.diacriticInsensitive,.caseInsensitive],locale:Locale(identifier:"pt_BR")).filter { $0.isLetter || $0.isNumber } }
        guard let hit = result.results.first(where:{key($0.name ?? $0.title ?? "") == key(name)}) else { throw BackendError.noMatch }
        let detail = try await get(CatalogueTitle.self,base + (media ? kind : "games") + "/" + String(hit.id),query:[.init(name:"language",value:"pt-BR")])
        return detail.description_raw ?? detail.overview ?? "Sem descrição disponível."
    }
}

// Verification credentials are transient: they never replace or persist the normal session.
extension Backend {
    private struct EmailVerification:Decodable {
        struct User:Decodable { let email:String? }
        let access_token:String?
        let user:User?
    }
    func register(name:String,username:String,email:String,password:String,confirmation:String) async throws -> EmailActionOutcome {
        let body = try AccountInput.registration(name:name,username:username,email:email,password:password,confirmation:confirmation)
        let data = try await send("/auth/v1/signup",body:body)
        let response = try JSONDecoder().decode(EmailVerification.self,from:data)
        if let token = response.access_token,!token.isEmpty {
            do { _ = try await send("/auth/v1/logout",query:[.init(name:"scope",value:"local")],body:[:],token:token) }
            catch { return EmailActionOutcome(message:"Cadastro recebido. A sessão temporária não foi encerrada no servidor. Entre com seu usuário e senha para conferir a conta.",warning:true) }
        }
        return EmailActionOutcome(message:"Cadastro recebido. Confira seu e-mail para confirmar a conta e depois entre com seu usuário e senha.")
    }
    func sendAccountEmail(_ email:String,recovery:Bool) async throws {
        let address = try AccountInput.email(email)
        var body:[String:Any] = ["email":address]
        if !recovery { body["type"] = "signup" }
        _ = try await send(recovery ? "/auth/v1/recover":"/auth/v1/resend",body:body)
    }
    func finishAccountEmail(email:String,proof:String,recovery:Bool,password:String = "",confirmation:String = "") async throws -> EmailActionOutcome {
        let address = try AccountInput.email(email),credential = try EmailProof(proof,recovery:recovery)
        if recovery { try AccountInput.password(password,confirmation:confirmation) }
        let data:Data
        do { data = try await send("/auth/v1/verify",body:credential.payload(email:address)) }
        catch BackendError.http(let code) where [400,401,403,422].contains(code) { throw BackendError.invalidInput("Código ou link inválido, expirado ou já utilizado. Solicite outro e-mail.") }
        let response = try JSONDecoder().decode(EmailVerification.self,from:data)
        guard let token = response.access_token,!token.isEmpty else { throw BackendError.invalidInput("Não foi possível validar o e-mail. Solicite outro código.") }
        do {
            guard response.user?.email?.lowercased() == address else { throw BackendError.invalidInput("Este código ou link não pertence ao e-mail informado.") }
            if recovery { _ = try await send("/auth/v1/user",body:["password":password],token:token,method:"PUT") }
        } catch {
            _ = try? await send("/auth/v1/logout",query:[.init(name:"scope",value:"local")],body:[:],token:token)
            throw error
        }
        do { _ = try await send("/auth/v1/logout",query:[.init(name:"scope",value:recovery ? "global":"local")],body:[:],token:token) }
        catch {
            if recovery { _ = try? await send("/auth/v1/logout",query:[.init(name:"scope",value:"local")],body:[:],token:token) }
            return EmailActionOutcome(message:recovery ? "A senha foi alterada, mas o encerramento das outras sessões não foi confirmado. Entre com a nova senha e altere-a novamente pelo desktop para tentar encerrá-las.":"E-mail confirmado. O encerramento da sessão temporária não foi confirmado no servidor. Você já pode entrar com seu usuário e senha.",warning:true)
        }
        return EmailActionOutcome(message:recovery ? "Senha atualizada. Entre com sua nova senha.":"E-mail confirmado. Você já pode entrar.")
    }
}
