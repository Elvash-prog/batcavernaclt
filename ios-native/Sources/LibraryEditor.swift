import SwiftUI

struct LibraryEditorView: View {
    let media: Bool
    let item: LibraryItem?
    let onSaved: () -> Void
    @EnvironmentObject private var backend: Backend
    @Environment(\.dismiss) private var dismiss
    @State private var draft: LibraryDraft
    @State private var query = ""
    @State private var results: [CatalogueTitle] = []
    @State private var searching = false
    @State private var searched = false
    @State private var saving = false
    @State private var error: String?
    init(media:Bool,item:LibraryItem? = nil,onSaved:@escaping () -> Void) {
        self.media = media; self.item = item; self.onSaved = onSaved
        _draft = State(initialValue:LibraryDraft(media:media,item:item))
    }
    private var statuses:[String] { preserving(media ? LibraryDraft.mediaStatuses:LibraryDraft.gameStatuses,draft.status) }
    private func preserving(_ values:[String],_ value:String) -> [String] { values.contains(value) ? values : values + [value] }
    var body: some View {
        Form {
            if item == nil {
                Section("Buscar no catálogo") {
                    if media { Picker("Tipo",selection:$draft.mediaType) { ForEach(LibraryDraft.mediaTypes,id:\.self) { Text($0) } }.onChange(of:draft.mediaType) { _,_ in results = []; searched = false } }
                    HStack {
                        TextField(media ? "Nome do filme ou série":"Nome do jogo",text:$query).textInputAutocapitalization(.never).autocorrectionDisabled().onSubmit { search() }
                        Button(action:search) { if searching { ProgressView() } else { Image(systemName:"magnifyingglass").accessibilityLabel("Buscar no catálogo") } }.disabled(searching || query.trimmingCharacters(in:.whitespacesAndNewlines).count < 2)
                    }
                    ForEach(results) { result in
                        Button {
                            draft.name = result.displayName; draft.cover = result.cover; draft.year = result.year
                            results = []; searched = false
                        } label: {
                            HStack(spacing:12) { CoverImage(source:result.cover).frame(width:45,height:62).clipShape(RoundedRectangle(cornerRadius:8)); VStack(alignment:.leading,spacing:4) { Text(result.displayName).foregroundStyle(.primary); if !result.year.isEmpty { Text(result.year).font(.caption).foregroundStyle(.secondary) } }; Spacer(); Image(systemName:"plus.circle.fill").foregroundStyle(Caverna.accent) }
                        }.buttonStyle(.plain)
                    }
                    if searched && results.isEmpty && !searching { Text("Nenhum resultado. Você também pode cadastrar pelo nome abaixo.").font(.caption).foregroundStyle(.secondary) }
                }.listRowBackground(Caverna.panel)
            }
            Section("Informações") {
                if !draft.cover.isEmpty { CoverImage(source:draft.cover).frame(height:180).clipShape(RoundedRectangle(cornerRadius:14)).listRowBackground(Color.clear) }
                TextField("Nome do título",text:$draft.name).textInputAutocapitalization(.words)
                Picker("Status",selection:$draft.status) { ForEach(statuses,id:\.self) { Text($0) } }
                Picker("Sua avaliação",selection:$draft.rating) { ForEach(preserving(LibraryDraft.ratings,draft.rating),id:\.self) { Text($0) } }
                TextField("Ano de lançamento",text:$draft.year).keyboardType(.numberPad)
                if media {
                    if item != nil { Picker("Tipo",selection:$draft.mediaType) { ForEach(preserving(LibraryDraft.mediaTypes,draft.mediaType),id:\.self) { Text($0) } } }
                    TextField("Onde assistir",text:$draft.service)
                } else {
                    TextField("Plataforma",text:$draft.platform)
                    TextField("Horas jogadas",text:$draft.hours).keyboardType(.decimalPad)
                }
            }.listRowBackground(Caverna.panel)
            if let error { Section { Text(error).foregroundStyle(.red).accessibilityIdentifier("libraryEditorError") }.listRowBackground(Caverna.panel) }
            Section {
                Button(action:save) { HStack { Spacer(); if saving { ProgressView() }; Text(saving ? "Salvando…":item == nil ? "Adicionar à biblioteca":"Salvar alterações").bold(); Spacer() } }.disabled(draft.name.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty)
            }.listRowBackground(Caverna.accent.opacity(0.28))
        }.disabled(saving).scrollContentBackground(.hidden).background(Caverna.gradient)
            .navigationTitle(item == nil ? "Adicionar título":"Editar título").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement:.topBarLeading) { Button("Cancelar") { dismiss() }.disabled(saving) } }
            .interactiveDismissDisabled(saving)
    }
    private func search() {
        guard !searching else { return }; searching = true; error = nil; searched = false
        let requestedQuery = query,requestedType = draft.mediaType
        Task {
            do { let rows = try await backend.searchCatalogue(requestedQuery,media:media,type:requestedType); if query == requestedQuery && draft.mediaType == requestedType { results = rows; searched = true } }
            catch { self.error = error is BackendError ? error.localizedDescription : "Não foi possível consultar o catálogo." }
            searching = false
        }
    }
    private func save() {
        guard !saving else { return }; saving = true; error = nil
        Task {
            do { try await backend.saveLibrary(draft,media:media,item:item); onSaved(); dismiss() }
            catch { self.error = error is BackendError ? error.localizedDescription : "Não foi possível confirmar a gravação. Atualize a biblioteca antes de reenviar." }
            saving = false
        }
    }
}
