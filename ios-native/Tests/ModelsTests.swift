import XCTest
@testable import BatCaverna
final class ModelsTests: XCTestCase {
    func testProtectedSessionRoundTrip() throws {
        let account = "unit-test-" + UUID().uuidString
        defer { try? SessionVault.clear(account:account) }
        XCTAssertNil(try SessionVault.read(account:account))
        let first = Data("synthetic-session-one".utf8)
        try SessionVault.save(first,account:account)
        XCTAssertEqual(try SessionVault.read(account:account),first)
        let rotated = Data("synthetic-session-two".utf8)
        try SessionVault.save(rotated,account:account)
        XCTAssertEqual(try SessionVault.read(account:account),rotated)
        try SessionVault.clear(account:account)
        XCTAssertNil(try SessionVault.read(account:account))
    }
    func testTranslationAttributionIsOnlyShownForTranslatedDescriptions() {
        let original = "Descrição original do catálogo."
        XCTAssertFalse(DescriptionAttribution.isTranslated(original))
        XCTAssertEqual(DescriptionAttribution.body(original),original)
        let translated = "Texto traduzido." + DescriptionAttribution.notice
        XCTAssertTrue(DescriptionAttribution.isTranslated(translated))
        XCTAssertEqual(DescriptionAttribution.body(translated),"Texto traduzido.")
    }
    func testStatusParity() {
        XCTAssertEqual(StatusPolicy.group("🏆 Platinado",media:false),"Platinados")
        XCTAssertEqual(StatusPolicy.group("Em progresso",media:false),"Em progresso")
        XCTAssertEqual(StatusPolicy.group("✅ Assistido",media:true),"Assistidos")
        XCTAssertEqual(StatusPolicy.group("Para assistir",media:true),"Para assistir")
        XCTAssertEqual(StatusPolicy.group("Pausado",media:false),"Pausados")
    }
    func testDatabaseIdentifiersAndHours() throws {
        let json = #"{"id":42,"nome":"Black","categoria":"jogos","horas":"1.5"}"#.data(using:.utf8)!
        let item = try JSONDecoder().decode(LibraryItem.self,from:json)
        XCTAssertEqual(item.id,"42"); XCTAssertEqual(item.horas,1.5)
    }
    func testRetroUsesManualStatusAndActualUnlocks() throws {
        let json = #"{"gameId":1,"nome":"Black","total":30,"desbloqueadas":3,"hardcore":2}"#.data(using:.utf8)!
        let game = try JSONDecoder().decode(RetroGame.self,from:json)
        XCTAssertEqual(game.group(nil),"Em progresso")
        XCTAssertEqual(game.group("paused"),"Pausados")
    }
    func testImagesRejectUntrustedHostsAndPlainHTTP() {
        XCTAssertNil(Caverna.safeImage("http://images.igdb.com/a.jpg"))
        XCTAssertNil(Caverna.safeImage("https://images.igdb.com.evil.test/a.jpg"))
        XCTAssertNotNil(Caverna.safeImage("https://images.igdb.com/a.jpg"))
    }
}
