import SwiftUI

@main struct BatCavernaApp: App {
    @StateObject private var backend = Backend()
    var body: some Scene { WindowGroup { RootView().environmentObject(backend).preferredColorScheme(.dark).tint(Caverna.accent) } }
}
enum Caverna {
    static let accent = Color(red:0.596,green:0.412,blue:0.957)
    static let background = Color(red:0.051,green:0.063,blue:0.098)
    static let panel = Color(red:0.173,green:0.149,blue:0.235)
    static let gradient = LinearGradient(colors:[Color(red:0.094,green:0.071,blue:0.145),background],startPoint:.topLeading,endPoint:.bottomTrailing)
    static func safeImage(_ value:String?) -> URL? {
        guard let value, let u = URL(string:value),u.scheme == "https",let host = u.host?.lowercased(),u.user == nil,u.password == nil else { return nil }
        let domains = ["igdb.com","steamstatic.com","tmdb.org","retroachievements.org","luoqlhgfmixvfqbfcdoc.supabase.co"]
        return domains.contains(where:{host == $0 || host.hasSuffix("."+$0)}) ? u : nil
    }
}
struct RootView: View {
    @EnvironmentObject private var backend: Backend
    var body: some View {
        Group { if backend.session == nil { LoginView() } else { LibraryTabs().id(backend.session?.user.id) } }
            .background(Caverna.gradient.ignoresSafeArea())
    }
}
struct LoginView: View {
    @EnvironmentObject private var backend: Backend
    @State private var username = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:22) {
                Image("AppLogo").resizable().scaledToFit().frame(width:88,height:88).accessibilityHidden(true)
                Text("BatCaverna").font(.largeTitle.bold())
                Text("Sua biblioteca. Suas conquistas.").foregroundStyle(.secondary)
                VStack(spacing:16) {
                    TextField("Usuário",text:$username).textContentType(.username).textInputAutocapitalization(.never).autocorrectionDisabled()
                    SecureField("Senha",text:$password).textContentType(.password).onSubmit { login() }
                }.padding(20).background(Caverna.panel,in:RoundedRectangle(cornerRadius:20)).textFieldStyle(.plain)
                if let error { Text(error).foregroundStyle(.red).accessibilityAddTraits(.updatesFrequently) }
                Button(action:login) { HStack { Spacer(); if busy { ProgressView() }; Text(busy ? "Entrando…":"Entrar").bold(); Spacer() }.padding(10) }
                    .buttonStyle(.borderedProminent).disabled(busy || username.isEmpty || password.isEmpty)
            }.padding(24).frame(maxWidth:520).frame(maxWidth:.infinity).padding(.top,60)
        }.background { Image("LoginBackground").resizable().scaledToFill().overlay(Caverna.background.opacity(0.72)).ignoresSafeArea() }.onAppear { error = backend.startupError }
    }
    private func login() {
        guard !busy else { return }; busy = true; error = nil
        Task { do { try await backend.login(username:username,password:password); password = "" } catch { self.error = error is BackendError ? error.localizedDescription : "Não foi possível conectar. Verifique sua conexão." }; busy = false }
    }
}
struct LibraryTabs: View {
    @EnvironmentObject private var backend: Backend
    @State private var items: [LibraryItem] = []
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        TabView {
            library(media:false).tabItem { Label("Jogos",systemImage:"gamecontroller") }
            library(media:true).tabItem { Label("Filmes e séries",systemImage:"film") }
            NavigationStack { RetroView().toolbar { ToolbarItem(placement:.topBarLeading) { NavigationLink("Créditos") { ProviderCreditsView() } }; ToolbarItem(placement:.topBarTrailing) { logoutButton } } }.tabItem { Label("Meu Retrô",systemImage:"trophy") }
        }.task { await load() }
    }
    private func library(media:Bool) -> some View {
        NavigationStack {
            LibraryView(items:items,media:media,busy:busy,error:error,reload:{await load()})
                .toolbar { ToolbarItem(placement:.topBarLeading) { NavigationLink("Créditos") { ProviderCreditsView() } }; ToolbarItem(placement:.topBarTrailing) { logoutButton } }
        }
    }
    private var logoutButton: some View {
        Button("Sair",systemImage:"rectangle.portrait.and.arrow.right") {
            guard !busy else { return }; busy = true
            Task { do { try await backend.logout() } catch { self.error = "Não foi possível encerrar a sessão no servidor. Tente novamente." }; busy = false }
        }.disabled(busy)
    }
    private func load() async {
        guard !busy else { return }; busy = true; error = nil
        do { items = try await backend.library() } catch { self.error = error is BackendError ? error.localizedDescription : "Não foi possível carregar a biblioteca." }
        busy = false
    }
}
private enum SummaryFilter { case all, finished, platinum, progress, backlog, hours }
struct LibraryView: View {
    let items: [LibraryItem]; let media: Bool; let busy: Bool; let error: String?; let reload: () async -> Void
    @State private var query = ""
    @State private var filter: SummaryFilter = .all
    @State private var selection: LibraryItem?
    @State private var kind = "Todos"
    private var own: [LibraryItem] { items.filter { ($0.categoria != "jogos") == media && (kind == "Todos" || StatusPolicyKey.type($0.tipo ?? "") == kind) } }
    private var filtered: [LibraryItem] {
        own.filter { item in
            guard query.isEmpty || item.nome.localizedCaseInsensitiveContains(query) else { return false }
            switch filter {
            case .all: return true
            case .finished: return (media ? ["Assistidos","Favoritos"]:["Zerados","Platinados"]).contains(item.group)
            case .platinum: return item.group == "Platinados"
            case .progress: return ["Assistindo","Em progresso","Jogando agora"].contains(item.group)
            case .backlog: return ["Backlog","Para assistir"].contains(item.group)
            case .hours: return (item.horas ?? 0).isFinite && (item.horas ?? 0) > 0
            }
        }.sorted { filter == .hours ? ($0.horas ?? 0) > ($1.horas ?? 0) : $0.nome.localizedStandardCompare($1.nome) == .orderedAscending }
    }
    var body: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:20) {
                Text(media ? "🎬 Seu acervo de histórias":"🎮 Sua biblioteca gamer").font(.title2.bold())
                if media { Picker("Tipo de título",selection:$kind) { ForEach(["Todos","Filmes","Séries","Animes"],id:\.self) { Text($0) } }.pickerStyle(.segmented).onChange(of:kind) { _,_ in filter = .all } }
                LazyVGrid(columns:[GridItem(.flexible()),GridItem(.flexible())],spacing:10) {
                    summary(media ? "Títulos":"Jogos",value:String(own.count),color:.purple,key:.all)
                    summary(media ? "Assistidos":"Finalizados",value:String(own.filter{(media ? ["Assistidos","Favoritos"]:["Zerados","Platinados"]).contains($0.group)}.count),color:.green,key:.finished)
                    summary(media ? "Assistindo":"Platinados",value:String(own.filter{$0.group == (media ? "Assistindo":"Platinados")}.count),color:.cyan,key:media ? .progress:.platinum)
                    summary(media ? "Para assistir":"Horas jogadas",value:media ? String(own.filter{$0.group == "Para assistir"}.count):String(format:"%.0fh",own.reduce(0){$0 + (($1.horas ?? 0).isFinite ? max(0,$1.horas ?? 0):0)}),color:.orange,key:media ? .backlog:.hours)
                }
                if !media {
                    HStack { summary("Em progresso",value:String(own.filter{["Em progresso","Jogando agora"].contains($0.group)}.count),color:.blue,key:.progress); summary("Backlog",value:String(own.filter{$0.group == "Backlog"}.count),color:.purple,key:.backlog) }
                }
                if filter != .all { Button("← Mostrar todos os títulos") { filter = .all } }
                if busy { ProgressView("Carregando biblioteca…") }
                if let error { Text(error).foregroundStyle(.red); Button("Tentar novamente") { Task { await reload() } } }
                ForEach(StatusPolicy.order(media:media),id:\.self) { group in
                    let rows = filtered.filter{$0.group == group}
                    if !rows.isEmpty {
                        Text(group + " · " + String(rows.count)).font(.title3.bold()).foregroundStyle(Caverna.accent)
                        LazyVGrid(columns:[GridItem(.adaptive(minimum:145),alignment:.top)],spacing:14) {
                            ForEach(rows) { item in Button { selection = item } label: { CoverCard(name:item.nome,subtitle:item.status ?? "",image:item.capa) }.buttonStyle(.plain) }
                        }
                    }
                }
                if !busy && error == nil && filtered.isEmpty { ContentUnavailableView("Nenhum título encontrado",systemImage:"books.vertical",description:Text("Seus títulos sincronizados aparecerão aqui.")) }
            }.padding(16)
        }.background(Caverna.gradient).navigationTitle(media ? "Filmes, séries e animes":"Meus jogos").navigationBarTitleDisplayMode(.inline)
            .searchable(text:$query,prompt:"Buscar na sua biblioteca").refreshable { await reload() }
            .sheet(item:$selection) { item in NavigationStack { DescriptionView(name:item.nome,image:item.capa,status:item.status ?? "",media:media,tv:StatusPolicyKey.type(item.tipo ?? "") != "Filmes",retro:nil) } }
    }
    private func summary(_ title:String,value:String,color:Color,key:SummaryFilter) -> some View {
        Button { filter = key } label: { VStack(alignment:.leading,spacing:8) { Text(title).font(.caption).foregroundStyle(.secondary); Text(value).font(.title.bold()).foregroundStyle(color) }.frame(maxWidth:.infinity,alignment:.leading).padding(16).background(LinearGradient(colors:[color.opacity(0.22),Caverna.panel],startPoint:.topLeading,endPoint:.bottomTrailing),in:RoundedRectangle(cornerRadius:16)).overlay(RoundedRectangle(cornerRadius:16).stroke(color.opacity(filter == key ? 0.8:0.25))) }.buttonStyle(.plain).accessibilityLabel("\(title), \(value). Ver títulos")
    }
}
enum StatusPolicyKey {
    static func type(_ value:String) -> String {
        let key = value.folding(options:[.diacriticInsensitive,.caseInsensitive],locale:Locale(identifier:"pt_BR"))
        if key.contains("anime") || key.contains("🍥") { return "Animes" }
        if key.contains("serie") || key.contains("📺") { return "Séries" }
        return "Filmes"
    }
}
struct CoverCard: View {
    let name:String; let subtitle:String; let image:String?
    var body: some View {
        VStack(alignment:.leading,spacing:0) {
            CoverImage(source:image).aspectRatio(0.72,contentMode:.fit).clipped()
            VStack(alignment:.leading,spacing:6) { Text(name).font(.headline).lineLimit(2); Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2) }.padding(12)
        }.background(Caverna.panel,in:RoundedRectangle(cornerRadius:16)).clipShape(RoundedRectangle(cornerRadius:16))
    }
}
struct CoverImage: View {
    let source:String?
    var body: some View {
        GeometryReader { geometry in
            AsyncImage(url:Caverna.safeImage(source)) { image in image.resizable().scaledToFill() } placeholder: { ZStack { Caverna.panel; Image(systemName:"gamecontroller").font(.largeTitle).foregroundStyle(Caverna.accent) } }.frame(width:geometry.size.width,height:geometry.size.height).clipped()
        }.accessibilityHidden(true)
    }
}
struct RetroView: View {
    @EnvironmentObject private var backend: Backend
    @State private var profile: RetroProfile?
    @State private var games: [RetroGame] = []
    @State private var statuses: [String:String] = [:]
    @State private var query = ""
    @State private var error: String?
    @State private var busy = false
    @State private var selected: RetroGame?
    var body: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:20) {
                if let profile {
                    HStack(spacing:16) { CoverImage(source:profile.avatar).frame(width:64,height:64).clipShape(Circle()); VStack(alignment:.leading,spacing:5) { Text("RETROACHIEVEMENTS").font(.caption).foregroundStyle(Caverna.accent); Text(profile.usuario).font(.title2.bold()); Text("\(profile.pontos) pontos · \(profile.pontosHardcore) true points").font(.caption).foregroundStyle(.secondary) } }.padding(16).frame(maxWidth:.infinity,alignment:.leading).background(Caverna.panel,in:RoundedRectangle(cornerRadius:20))
                    HStack { retroStat("Jogos",String(games.count)); retroStat("Conquistas","\(games.reduce(0){$0+$1.desbloqueadas})/\(games.reduce(0){$0+$1.total})"); retroStat("Hardcore",String(games.reduce(0){$0+$1.hardcore})) }
                    Text("Na sua coleção visível").font(.caption).foregroundStyle(.secondary)
                }
                if busy { ProgressView("Sincronizando RetroAchievements…") }
                if let error { Text(error).foregroundStyle(.red); Button("Tentar novamente") { Task { await load() } } }
                ForEach(["Em progresso","Backlog","Zerados","Platinados","Pausados","Abandonados"],id:\.self) { group in
                    let rows = games.filter { $0.group(statuses[String($0.id)]) == group && (query.isEmpty || $0.nome.localizedCaseInsensitiveContains(query)) }.sorted{$0.nome.localizedStandardCompare($1.nome) == .orderedAscending}
                    if !rows.isEmpty {
                        Text(group + " · " + String(rows.count)).font(.title3.bold()).foregroundStyle(Caverna.accent)
                        LazyVGrid(columns:[GridItem(.adaptive(minimum:145),alignment:.top)],spacing:14) {
                            ForEach(rows) { game in Button { selected = game } label: { CoverCard(name:game.nome,subtitle:"\(game.desbloqueadas)/\(game.total) conquistas",image:game.capa) }.buttonStyle(.plain) }
                        }
                    }
                }
                if profile != nil && !busy && games.isEmpty { Text("Nenhum jogo encontrado na coleção.").foregroundStyle(.secondary) }
            }.padding(16)
        }.background(Caverna.gradient).navigationTitle("Meu Retrô").navigationBarTitleDisplayMode(.inline).searchable(text:$query,prompt:"Buscar no Meu Retrô")
            .task { if profile == nil { await load() } }.refreshable { await load() }
            .sheet(item:$selected) { game in NavigationStack { DescriptionView(name:game.nome,image:game.capa,status:game.group(statuses[String(game.id)]),media:false,tv:false,retro:(game.id,profile?.usuario ?? "")) } }
    }
    private func retroStat(_ label:String,_ value:String) -> some View { VStack(alignment:.leading,spacing:8) { Text(value).font(.title3.bold()).foregroundStyle(Caverna.accent); Text(label).font(.caption).foregroundStyle(.secondary) }.frame(maxWidth:.infinity,alignment:.leading).padding(12).background(Caverna.panel,in:RoundedRectangle(cornerRadius:14)) }
    private func load() async {
        guard !busy else { return }; busy = true; error = nil
        do { let result = try await backend.retro(); profile = result.0; games = result.1; statuses = result.2 }
        catch { self.error = error is BackendError ? error.localizedDescription : "Não foi possível sincronizar o Meu Retrô." }
        busy = false
    }
}
struct DescriptionView: View {
    let name:String; let image:String?; let status:String; let media:Bool; let tv:Bool; let retro:(Int,String)?
    @EnvironmentObject private var backend: Backend
    @Environment(\.dismiss) private var dismiss
    @State private var description: String?
    @State private var error: String?
    @State private var achievements: GameAchievements?
    @State private var achievementsError: String?
    @State private var loadingAchievements = false
    var body: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:20) {
                CoverImage(source:image).frame(height:230).clipShape(RoundedRectangle(cornerRadius:20))
                Text(name).font(.title.bold()); Text(status).foregroundStyle(Caverna.accent)
                if let description {
                    Text(DescriptionAttribution.body(description)).textSelection(.enabled)
                    if DescriptionAttribution.isTranslated(description) { Link("Tradução automática por DeepL.com",destination:URL(string:"https://www.deepl.com")!).font(.caption) }
                }
                else if let error { Text(error).foregroundStyle(.secondary); Button("Tentar novamente") { Task { await load() } } }
                else { ProgressView("Buscando descrição…") }
                if let retro {
                    Button("Ver conquistas") { Task { await loadAchievements(retro) } }.buttonStyle(.bordered).disabled(loadingAchievements)
                    if loadingAchievements { ProgressView() }
                    if let achievementsError { Text(achievementsError).foregroundStyle(.red) }
                    if let achievements { ForEach(achievements.lista) { a in HStack(alignment:.top,spacing:12) { CoverImage(source:a.icon).frame(width:48,height:48).saturation(a.got ? 1:0); VStack(alignment:.leading,spacing:5) { Text((a.got ? "✓ ":"")+a.nome).bold(); Text(a.desc).font(.subheadline); Text("\(a.pontos) pontos · \(a.got ? "Adquirida":"Não adquirida")").font(.caption) }.foregroundStyle(a.got ? Color.primary:Color.gray) } } }
                }
                if media { Image("TMDBLogo").resizable().scaledToFit().frame(width:120,height:22).accessibilityLabel("TMDB"); Link("Dados de filmes e séries: TMDB",destination:URL(string:"https://www.themoviedb.org")!); Text("This product uses the TMDB API but is not endorsed or certified by TMDB.").font(.caption).foregroundStyle(.secondary) }
                else { Link("Dados e mídia dos jogos: IGDB.com",destination:URL(string:"https://www.igdb.com")!) }
                if retro != nil { Link("Conquistas: RetroAchievements",destination:URL(string:"https://retroachievements.org")!) }
            }.padding(20)
        }.background(Caverna.gradient).navigationTitle("Detalhes").navigationBarTitleDisplayMode(.inline).toolbar { ToolbarItem(placement:.topBarTrailing) { Button("Fechar") { dismiss() } } }.task { await load() }
    }
    private func load() async { error = nil; do { description = try await backend.description(name:name,media:media,tv:tv) } catch { self.error = error is BackendError ? error.localizedDescription : "Descrição indisponível no momento." } }
    private func loadAchievements(_ game:(Int,String)) async { guard !loadingAchievements else { return }; loadingAchievements = true; achievementsError = nil; do { achievements = try await backend.achievements(game:game.0,user:game.1) } catch { achievementsError = "Não foi possível carregar as conquistas." }; loadingAchievements = false }
}

struct ProviderCreditsView: View {
    var body: some View {
        List {
            Section("Jogos e conquistas") {
                Link("Dados e mídia: IGDB.com",destination:URL(string:"https://www.igdb.com")!)
                Link("Conquistas: RetroAchievements",destination:URL(string:"https://retroachievements.org")!)
            }
            Section("Filmes e séries") {
                Image("TMDBLogo").resizable().scaledToFit().frame(width:120,height:24)
                Link("TMDB",destination:URL(string:"https://www.themoviedb.org")!)
                Text("This product uses the TMDB API but is not endorsed or certified by TMDB.").font(.caption)
            }
            Section("Tradução") {
                Link("DeepL.com",destination:URL(string:"https://www.deepl.com")!)
                Text("Tradução automática de descrições públicas do catálogo, quando disponível. Aplicativo independente, sem endosso do DeepL.").font(.caption)
            }
            Section("Infraestrutura") { Link("Supabase",destination:URL(string:"https://supabase.com")!) }
        }.scrollContentBackground(.hidden).background(Caverna.gradient).navigationTitle("Créditos e serviços").navigationBarTitleDisplayMode(.inline)
    }
}
