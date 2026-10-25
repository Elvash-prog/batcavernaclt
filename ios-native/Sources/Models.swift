import Foundation

struct AppSession: Codable {
    struct User: Codable { let id: UUID }
    let accessToken: String
    let refreshToken: String
    let expiresAt: Double
    let user: User
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token", refreshToken = "refresh_token"
        case expiresAt = "expires_at", expiresIn = "expires_in", user
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        accessToken = try c.decode(String.self, forKey: .accessToken)
        refreshToken = try c.decode(String.self, forKey: .refreshToken)
        expiresAt = try c.decodeIfPresent(Double.self, forKey: .expiresAt)
            ?? (Date().timeIntervalSince1970 + c.decode(Double.self, forKey: .expiresIn))
        user = try c.decode(User.self, forKey: .user)
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(accessToken, forKey: .accessToken)
        try c.encode(refreshToken, forKey: .refreshToken)
        try c.encode(expiresAt, forKey: .expiresAt)
        try c.encode(user, forKey: .user)
    }
}
struct LibraryItem: Decodable, Identifiable {
    let id: String
    let nome: String
    let categoria: String
    let status: String?
    let capa: String?
    let tipo: String?
    let horas: Double?
    let nota: String?
    let plataforma: String?
    let onde: String?
    let updatedAt: String?
    let ano: Int?
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let number = try? c.decode(Int64.self, forKey: .id) { id = String(number) }
        else { id = try c.decode(String.self, forKey: .id) }
        nome = try c.decode(String.self, forKey: .nome)
        categoria = try c.decode(String.self, forKey: .categoria)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        capa = try c.decodeIfPresent(String.self, forKey: .capa)
        tipo = try c.decodeIfPresent(String.self, forKey: .tipo)
        nota = try c.decodeIfPresent(String.self,forKey:.nota)
        plataforma = try c.decodeIfPresent(String.self,forKey:.plataforma)
        onde = try c.decodeIfPresent(String.self,forKey:.onde)
        updatedAt = try c.decodeIfPresent(String.self,forKey:.updatedAt)
        if let number = try? c.decode(Int.self,forKey:.ano) { ano = number } else { ano = (try? c.decode(String.self,forKey:.ano)).flatMap(Int.init) }
        if let number = try? c.decode(Double.self, forKey: .horas) { horas = number }
        else { horas = (try? c.decode(String.self, forKey: .horas)).flatMap(Double.init) }
    }
    enum CodingKeys: String, CodingKey { case id, nome, categoria, status, capa, tipo, horas, nota, plataforma, onde, ano; case updatedAt = "updated_at" }
    var group: String { StatusPolicy.group(status ?? "", media: categoria != "jogos") }
}
enum StatusPolicy {
    static func group(_ value: String, media: Bool) -> String {
        let s = value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "pt_BR"))
        if media {
            if s.contains("favorit") { return "Favoritos" }
            if s.contains("assistido") || s.contains("concluid") { return "Assistidos" }
            if s.contains("assistindo") || s.contains("maraton") { return "Assistindo" }
            if ["para assistir", "pretendo", "backlog"].contains(where: s.contains) { return "Para assistir" }
        } else {
            if s.contains("platina") || s.contains("100%") { return "Platinados" }
            if s.contains("zerado") || s.contains("finalizado") { return "Zerados" }
            if s.contains("jogando agora") { return "Jogando agora" }
            if s.contains("progresso") || s.contains("jogando") { return "Em progresso" }
            if s.contains("backlog") || s.contains("pretendo") { return "Backlog" }
            if s.contains("wishlist") { return "Wishlist" }
            if s.contains("biblioteca steam") { return "Biblioteca Steam" }
        }
        if s.contains("pausad") { return "Pausados" }
        if s.contains("abandon") { return "Abandonados" }
        return "Outros"
    }
    static func order(media: Bool) -> [String] {
        media ? ["Assistindo", "Para assistir", "Assistidos", "Favoritos", "Pausados", "Abandonados", "Outros"]
            : ["Jogando agora", "Em progresso", "Backlog", "Zerados", "Platinados", "Wishlist", "Biblioteca Steam", "Pausados", "Abandonados", "Outros"]
    }
}
struct RetroProfile: Decodable { let usuario: String; let pontos: Int; let pontosHardcore: Int; let avatar: String? }
struct RetroGame: Decodable, Identifiable {
    let gameId: Int
    let nome: String
    let console: String?
    let capa: String?
    let total: Int
    let desbloqueadas: Int
    let hardcore: Int
    let premio: String?
    var id: Int { gameId }
    func group(_ saved: String?) -> String {
        let labels = ["progress":"Em progresso", "backlog":"Backlog", "finished":"Zerados", "platinum":"Platinados", "paused":"Pausados", "abandoned":"Abandonados"]
        if let saved, let label = labels[saved] { return label }
        if total > 0 && desbloqueadas >= total { return "Platinados" }
        if !(premio ?? "").isEmpty { return "Zerados" }
        return desbloqueadas > 0 ? "Em progresso" : "Backlog"
    }
}
struct RetroPage: Decodable { let total: Int; let jogos: [RetroGame] }
struct RetroCollection: Decodable { let game_ids: [Int]?; let hidden_game_ids: [Int]?; let statuses: [String:String]? }
struct GameAchievements: Decodable {
    struct Achievement: Decodable, Identifiable {
        let id: Int; let nome: String; let desc: String; let pontos: Int; let got: Bool; let hardcore: Bool; let icon: String?
    }
    let gameId: Int; let nome: String; let console: String?; let capa: String?; let lista: [Achievement]
}
struct CatalogueResult: Decodable { let results: [CatalogueTitle] }
struct CatalogueTitle: Decodable, Identifiable {
    let id: Int; let name: String?; let title: String?; let description_raw: String?; let overview: String?
    let cover_image: String?; let background_image: String?; let poster_path: String?
    let released: String?; let release_date: String?; let first_air_date: String?
    let genre_ids: [Int]?
    var displayName: String { title ?? name ?? "Título" }
    var cover: String { if let value = cover_image ?? background_image { return value }; if let poster_path,poster_path.hasPrefix("/") { return "https://image.tmdb.org/t/p/w500"+poster_path }; return "" }
    var year: String { String((released ?? release_date ?? first_air_date ?? "").prefix(4)) }
}

enum DescriptionAttribution {
    static let notice = "\n\nTradução automática por DeepL.com — https://www.deepl.com"
    static func isTranslated(_ text:String) -> Bool { text.hasSuffix(notice) }
    static func body(_ text:String) -> String { isTranslated(text) ? String(text.dropLast(notice.count)) : text }
}

struct LibraryDraft {
    static let gameStatuses = ["📌 Backlog","🎮 Em Progresso","✅ Zerado","🏆 100% (Platina)","⏸️ Pausado","❌ Abandonado","🧪 Simulando","⌛ Wishlist","🟦 Biblioteca Steam"]
    static let mediaStatuses = ["⏳ Para Assistir","📺 Assistindo","✅ Assistido","❤️ Favorito","⏸️ Pausado","❌ Abandonado","🍿 Maratonando"]
    static let ratings = ["Sem avaliação","💎 Lenda (GOTY)","⭐⭐⭐⭐⭐ Obra-prima","⭐⭐⭐⭐½ Excelente","⭐⭐⭐⭐ Muito bom","⭐⭐⭐½ Bom","⭐⭐⭐ Ok","⭐⭐ Fraco","⭐ Ruim","🤔 A considerar"]
    static let mediaTypes = ["🎬 Filme","📺 Série","🍥 Anime"]
    var name = ""
    var status: String
    var rating = "Sem avaliação"
    var hours = ""
    var platform = "💻 PC"
    var service = ""
    var mediaType = "🎬 Filme"
    var cover = ""
    var year = ""
    init(media:Bool,item:LibraryItem? = nil) {
        name = item?.nome ?? ""; status = item?.status ?? (media ? Self.mediaStatuses[0]:Self.gameStatuses[0])
        rating = item?.nota ?? "Sem avaliação"; cover = item?.capa ?? ""
        platform = item?.plataforma ?? "💻 PC"; service = item?.onde ?? ""
        mediaType = item?.tipo ?? "🎬 Filme"
        hours = item?.horas.map { String($0) } ?? ""
        year = item?.ano.map { String($0) } ?? ""
    }
    func fields(media:Bool,original:LibraryItem? = nil) throws -> [String:Any] {
        let title = name.trimmingCharacters(in:.whitespacesAndNewlines)
        guard !title.isEmpty && title.count <= 160 else { throw BackendError.invalidInput("O nome deve ter entre 1 e 160 caracteres.") }
        guard title.range(of:"\\b(hentai|pornografia|pornography|nsfw|sex simulator)\\b",options:[.regularExpression,.caseInsensitive]) == nil else { throw BackendError.invalidInput("Este conteúdo não é permitido.") }
        let statuses = media ? Self.mediaStatuses:Self.gameStatuses
        guard statuses.contains(status) || original?.status == status else { throw BackendError.invalidInput("Selecione um status válido.") }
        guard Self.ratings.contains(rating) || original?.nota == rating else { throw BackendError.invalidInput("Selecione uma avaliação válida.") }
        guard service.count <= 80 && !platform.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty && platform.count <= 80 else { throw BackendError.invalidInput("Plataforma e serviço aceitam até 80 caracteres.") }
        var result:[String:Any] = ["nome":title,"status":status,"nota":rating == "Sem avaliação" ? NSNull():rating as Any]
        if cover != (original?.capa ?? "") || original == nil {
            guard cover.isEmpty || Caverna.safeImage(cover) != nil else { throw BackendError.invalidInput("Selecione uma capa do catálogo.") }
            result["capa"] = cover
        }
        if media {
            guard Self.mediaTypes.contains(mediaType) || original?.tipo == mediaType else { throw BackendError.invalidInput("Selecione filme, série ou anime.") }
            result["tipo"] = mediaType; result["onde"] = service
        } else {
            result["plataforma"] = platform
            if hours.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty { result["horas"] = original == nil ? 0 as Any:NSNull() }
            else {
                guard let number = Double(hours.replacingOccurrences(of:",",with:".")),number.isFinite,number >= 0,number <= 100000 else { throw BackendError.invalidInput("Informe horas entre 0 e 100.000.") }
                result["horas"] = number
            }
        }
        if !year.isEmpty { guard year.count == 4, let number = Int(year), (1900...2200).contains(number) else { throw BackendError.invalidInput("Informe um ano válido.") }; result["ano"] = number } else if original?.ano != nil { result["ano"] = NSNull() }
        return result
    }
}
enum LibraryWriteTarget {
    static func query(item:LibraryItem,user:UUID) throws -> [URLQueryItem] {
        guard let number = Int64(item.id),number > 0,let stamp = item.updatedAt,stamp.count <= 48,
              stamp.range(of:"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{1,9})?(Z|[+-][0-9]{2}:[0-9]{2})$",options:.regularExpression) != nil else { throw BackendError.conflict }
        return [.init(name:"id",value:"eq."+item.id),.init(name:"user_id",value:"eq."+user.uuidString),.init(name:"categoria",value:"eq."+item.categoria),.init(name:"updated_at",value:"eq."+stamp),.init(name:"select",value:"id,nome,categoria,status,capa,tipo,horas,nota,plataforma,onde,updated_at")]
    }
}
