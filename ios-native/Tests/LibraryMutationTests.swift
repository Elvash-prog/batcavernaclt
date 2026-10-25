import XCTest
@testable import BatCaverna

private final class LibraryProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (Int,Data))?
    override class func canInit(with request:URLRequest) -> Bool { true }
    override class func canonicalRequest(for request:URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (code,data) = try Self.handler!(request)
            client?.urlProtocol(self,didReceive:HTTPURLResponse(url:request.url!,statusCode:code,httpVersion:nil,headerFields:["Content-Type":"application/json"])!,cacheStoragePolicy:.notAllowed)
            client?.urlProtocol(self,didLoad:data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self,didFailWithError:error) }
    }
    override func stopLoading() {}
}
@MainActor final class LibraryMutationTests:XCTestCase {
    private let owner = UUID(uuidString:"00000000-0000-4000-8000-000000000001")!
    private func item(stamp:String = "2026-10-25T10:20:30.123456+00:00") throws -> LibraryItem {
        let json:[String:Any] = ["id":42,"nome":"Black","categoria":"jogos","status":"🎮 Em Progresso","horas":1.5,"updated_at":stamp]
        return try JSONDecoder().decode(LibraryItem.self,from:JSONSerialization.data(withJSONObject:json))
    }
    private func backend() throws -> Backend {
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [LibraryProtocol.self]
        let data = try JSONSerialization.data(withJSONObject:["access_token":"synthetic-test-token","refresh_token":"synthetic-refresh","expires_at":Date().timeIntervalSince1970+3600,"user":["id":owner.uuidString]])
        return Backend(network:URLSession(configuration:config),initialSession:try JSONDecoder().decode(AppSession.self,from:data))
    }
    func testDraftValidationAndDecimalComma() throws {
        var draft = LibraryDraft(media:false)
        XCTAssertThrowsError(try draft.fields(media:false))
        draft.name = "Black"; draft.hours = "2,5"
        XCTAssertEqual(try draft.fields(media:false)["horas"] as? Double,2.5)
        for invalid in ["-1","nan","inf","100001"] { draft.hours = invalid; XCTAssertThrowsError(try draft.fields(media:false)) }
        draft.hours = "1"; draft.cover = "https://evil.test/cover.png"
        XCTAssertThrowsError(try draft.fields(media:false))
        let original = try item(); draft = LibraryDraft(media:false,item:original)
        XCTAssertEqual(draft.hours,"1.5")
        var media = LibraryDraft(media:true); media.name = "Filme"
        XCTAssertNil(try media.fields(media:true)["horas"])
        XCTAssertNil(try media.fields(media:true)["review"])
    }
    func testMutationFiltersRequireOwnerAndOriginalVersion() throws {
        let filters = try LibraryWriteTarget.query(item:item(),user:owner)
        let values = Dictionary(uniqueKeysWithValues:filters.map{($0.name,$0.value ?? "")})
        XCTAssertEqual(values["id"],"eq.42"); XCTAssertEqual(values["user_id"],"eq."+owner.uuidString)
        XCTAssertEqual(values["categoria"],"eq.jogos")
        XCTAssertEqual(values["updated_at"],"eq.2026-10-25T10:20:30.123456+00:00")
        XCTAssertThrowsError(try LibraryWriteTarget.query(item:item(stamp:"*"),user:owner))
    }
    func testPatchAndDeleteSendOwnershipAndConcurrencyFilters() async throws {
        let api = try backend(), original = try item()
        var methods:[String] = []
        LibraryProtocol.handler = { request in
            methods.append(request.httpMethod!)
            let query = URLComponents(url:request.url!,resolvingAgainstBaseURL:false)!.queryItems!
            XCTAssertEqual(query.first{$0.name == "user_id"}?.value,"eq."+self.owner.uuidString)
            XCTAssertEqual(query.first{$0.name == "id"}?.value,"eq.42")
            XCTAssertNotNil(query.first{$0.name == "updated_at"})
            XCTAssertEqual(request.value(forHTTPHeaderField:"Prefer"),"return=representation")
            XCTAssertEqual(request.url?.scheme,"https")
            return (200,Data(#"[{"id":42}]"#.utf8))
        }
        defer { LibraryProtocol.handler = nil }
        try await api.saveLibrary(LibraryDraft(media:false,item:original),media:false,item:original)
        try await api.removeLibrary(original)
        XCTAssertEqual(methods,["PATCH","DELETE"])
    }
    func testChangedRowAndDuplicateAreNotReportedAsSuccess() async throws {
        let api = try backend(), original = try item()
        defer { LibraryProtocol.handler = nil }
        LibraryProtocol.handler = { _ in (200,Data("[]".utf8)) }
        do { try await api.removeLibrary(original); XCTFail("A stale deletion must fail") } catch BackendError.conflict {} catch { XCTFail("Unexpected error") }
        LibraryProtocol.handler = { _ in (409,Data("internal database detail".utf8)) }
        var draft = LibraryDraft(media:false); draft.name = "Black"
        do { try await api.saveLibrary(draft,media:false); XCTFail("A duplicate must fail") } catch BackendError.duplicate {} catch { XCTFail("Unexpected error") }
    }
}
