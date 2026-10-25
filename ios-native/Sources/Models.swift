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
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let number = try? c.decode(Int64.self, forKey: .id) { id = String(number) }
        else { id = try c.decode(String.self, forKey: .id) }
        nome = try c.decode(String.self, forKey: .nome)
        categoria = try c.decode(String.self, forKey: .categoria)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        capa = try c.decodeIfPresent(String.self, forKey: .capa)
        tipo = try c.decodeIfPresent(String.self, forKey: .tipo)
        if let number = try? c.decode(Double.self, forKey: .horas) { horas = number }
        else { horas = (try? c.decode(String.self, forKey: .horas)).flatMap(Double.init) }
    }
    enum CodingKeys: String, CodingKey { case id, nome, categoria, status, capa, tipo, horas }
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
struct CatalogueTitle: Decodable {
    let id: Int; let name: String?; let title: String?; let description_raw: String?; let overview: String?
}

enum DescriptionAttribution {
    static let notice = "\n\nTradução automática por DeepL.com — https://www.deepl.com"
    static func isTranslated(_ text:String) -> Bool { text.hasSuffix(notice) }
    static func body(_ text:String) -> String { isTranslated(text) ? String(text.dropLast(notice.count)) : text }
}
