import XCTest
import SwiftUI
@testable import BatCaverna

@MainActor final class MobileAppearanceTests: XCTestCase {
    private func capture<V:View>(_ name:String,_ view:V) throws {
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
        let window = UIWindow(windowScene:scene)
        window.frame = scene.screen.bounds
        window.windowLevel = .alert + 1
        window.rootViewController = UIHostingController(rootView:view.preferredColorScheme(.dark).tint(Caverna.accent))
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        window.layoutIfNeeded()
        RunLoop.main.run(until:Date().addingTimeInterval(0.5))
        let image = UIGraphicsImageRenderer(bounds:window.bounds).image { _ in window.drawHierarchy(in:window.bounds,afterScreenUpdates:true) }
        let attachment = XCTAttachment(image:image); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
        let directory = FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("mobile-previews")
        try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
        try XCTUnwrap(image.pngData()).write(to:directory.appendingPathComponent(name+".png"))
    }
    func testLibraryAndEditorAppearance() throws {
        // Synthetic collection; previews never authenticate or write remote data.
        let data = Data(#"[{"id":1,"nome":"Black","categoria":"jogos","status":"🎮 Em Progresso","horas":2.5},{"id":2,"nome":"Horizon Zero Dawn","categoria":"jogos","status":"📌 Backlog"}]"#.utf8)
        let rows = try JSONDecoder().decode([BatCaverna.LibraryItem].self,from:data)
        let config = URLSessionConfiguration.ephemeral
        let session = try JSONDecoder().decode(AppSession.self,from:Data(#"{"access_token":"preview","refresh_token":"preview","expires_at":4000000000,"user":{"id":"00000000-0000-4000-8000-000000000001"}}"#.utf8))
        let backend = Backend(network:URLSession(configuration:config),initialSession:session)
        try capture("biblioteca-ios",NavigationStack { LibraryView(items:rows,media:false,busy:false,error:nil,reload:{}) }.environmentObject(backend))
        try capture("cadastro-ios",NavigationStack { AccountAccessView(flow:.register) }.environmentObject(backend))
        try capture("recuperacao-ios",NavigationStack { AccountAccessView(flow:.recovery) }.environmentObject(backend))
        try capture("editor-ios",NavigationStack { LibraryEditorView(media:false,item:rows[0],onSaved:{}) }.environmentObject(backend))
    }
}
