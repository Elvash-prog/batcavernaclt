import XCTest
@testable import BatCaverna
final class MobilePresentationTests:XCTestCase {
    func testDecimalHoursRemainDecimalHours() {
        XCTAssertEqual(MobilePresentation.hours(3.717),"3,7 h")
        XCTAssertEqual(MobilePresentation.hours(3717),"3.717,0 h")
        XCTAssertEqual(MobilePresentation.hours(0),"0,0 h")
        XCTAssertEqual(MobilePresentation.hours(nil),"—")
        XCTAssertEqual(MobilePresentation.hours(.nan),"—")
        XCTAssertEqual(MobilePresentation.hours(-1),"—")
    }
    func testSteamArtworkIsIndependentOfDesktopCover() throws {
        let data = #"{"id":1,"nome":"Biped","categoria":"jogos","steam_appid":1071870,"capa":"https://images.igdb.com/desktop.jpg","horas":"3.717"}"#.data(using:.utf8)!
        let item = try JSONDecoder().decode(LibraryItem.self,from:data)
        XCTAssertEqual(item.steamAppId,"1071870")
        XCTAssertEqual(MobilePresentation.hours(item.horas),"3,7 h")
        XCTAssertTrue(MobilePresentation.steamCover(item.steamAppId,vertical:false)!.hasSuffix("/header.jpg"))
        XCTAssertTrue(MobilePresentation.steamCover(item.steamAppId,vertical:true)!.hasSuffix("/library_600x900.jpg"))
        XCTAssertEqual(item.capa,"https://images.igdb.com/desktop.jpg")
        XCTAssertNil(MobilePresentation.steamCover("../evil",vertical:false))
    }
    func testCatalogueFormatUsesDifferentArtwork() throws {
        let data = #"{"id":1,"name":"Biped","cover_image":"https://images.igdb.com/poster.jpg","background_image":"https://images.igdb.com/landscape.jpg"}"#.data(using:.utf8)!
        let title = try JSONDecoder().decode(CatalogueTitle.self,from:data)
        XCTAssertEqual(MobilePresentation.catalogueCover(title,vertical:true),"https://images.igdb.com/poster.jpg")
        XCTAssertEqual(MobilePresentation.catalogueCover(title,vertical:false),"https://images.igdb.com/landscape.jpg")
        XCTAssertNotEqual(MobilePresentation.gamesKey,MobilePresentation.mediaKey)
        XCTAssertNotEqual(MobilePresentation.gamesKey,MobilePresentation.retroKey)
    }
    func testAmbiguousTitlesKeepTheOriginalFallback() throws {
        let data = #"{"id":1,"name":"Biped","released":"2020-03-27","background_image":"https://images.igdb.com/landscape.jpg"}"#.data(using:.utf8)!
        let title = try JSONDecoder().decode(CatalogueTitle.self,from:data)
        XCTAssertNil(MobilePresentation.selectArtwork([title,title],name:"Biped",year:nil,vertical:false))
        XCTAssertNil(MobilePresentation.selectArtwork([title],name:"Biped",year:2021,vertical:false))
        XCTAssertEqual(MobilePresentation.selectArtwork([title],name:"Biped",year:2020,vertical:false),"https://images.igdb.com/landscape.jpg")
    }
}
