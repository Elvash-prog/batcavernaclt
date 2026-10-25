import XCTest
@testable import BatCaverna

private final class AccountProtocol:URLProtocol {
    static var handler:((URLRequest) throws -> (Int,Data))?
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
    static func body(_ request:URLRequest) throws -> [String:Any] {
        var data = request.httpBody ?? Data()
        if data.isEmpty,let stream = request.httpBodyStream {
            stream.open(); defer { stream.close() }; var buffer = [UInt8](repeating:0,count:1024)
            while stream.hasBytesAvailable { let count = stream.read(&buffer,maxLength:buffer.count); if count <= 0 { break }; data.append(contentsOf:buffer.prefix(count)) }
        }
        return try JSONSerialization.jsonObject(with:data) as! [String:Any]
    }
}
@MainActor final class AccountAccessTests:XCTestCase {
    private func backend() throws -> Backend {
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [AccountProtocol.self]
        let session = try JSONDecoder().decode(AppSession.self,from:Data(#"{"access_token":"regular-session","refresh_token":"regular-refresh","expires_at":4000000000,"user":{"id":"00000000-0000-4000-8000-000000000001"}}"#.utf8))
        return Backend(network:URLSession(configuration:config),initialSession:session)
    }
    private var verified:Data { Data(#"{"access_token":"email-proof-session","refresh_token":"never-persist-this","user":{"email":"person@example.com"}}"#.utf8) }
    func testRegistrationRejectsInvalidFields() throws {
        XCTAssertEqual(try AccountInput.email(" Person@Example.com "),"person@example.com")
        XCTAssertThrowsError(try AccountInput.email("person@"))
        XCTAssertThrowsError(try AccountInput.password("short",confirmation:"short"))
        XCTAssertThrowsError(try AccountInput.password("twelve-characters",confirmation:"different"))
        XCTAssertThrowsError(try AccountInput.registration(name:"Name",username:"bad user",email:"person@example.com",password:"twelve-characters",confirmation:"twelve-characters"))
        XCTAssertThrowsError(try AccountInput.registration(name:"",username:"user",email:"person@example.com",password:"twelve-characters",confirmation:"twelve-characters"))
    }
    func testProofParserRejectsWrongOriginDuplicateKeysAndWrongPurpose() throws {
        let token = String(repeating:"a",count:40),base = "https://luoqlhgfmixvfqbfcdoc.supabase.co/auth/v1/verify"
        XCTAssertFalse(try EmailProof("123456",recovery:true).hashed)
        XCTAssertEqual(try EmailProof("123456",recovery:true).type,"recovery")
        XCTAssertTrue(try EmailProof(base+"?type=signup&token="+token,recovery:false).hashed)
        for link in ["http://luoqlhgfmixvfqbfcdoc.supabase.co/auth/v1/verify?type=recovery&token="+token,base.replacingOccurrences(of:".co/",with:".co.evil.test/")+"?type=recovery&token="+token,base+"?type=recovery&type=recovery&token="+token,base+"?type=signup&token="+token,base+"?type=recovery&token="+token+"&token_hash="+token,base+"?type=recovery&token="+token+"#access_token=bad",base.replacingOccurrences(of:"https://",with:"https://user@")+"?type=recovery&token="+token] {
            XCTAssertThrowsError(try EmailProof(link,recovery:true))
        }
    }
    func testRegistrationAndEmailRequestsNeverReplaceNormalSession() async throws {
        let api = try backend(); var paths:[String] = []
        AccountProtocol.handler = { request in
            let path = request.url!.path,body = try AccountProtocol.body(request); paths.append(path)
            XCTAssertNil(request.value(forHTTPHeaderField:"Authorization"))
            XCTAssertEqual(body["email"] as? String,"person@example.com")
            if path.hasSuffix("signup") {
                let metadata = body["data"] as! [String:String]
                XCTAssertEqual(metadata,["nome":"Person","username":"person"])
                XCTAssertNil(body["app_metadata"])
                return (200,Data(#"{"id":"synthetic-user","email":"person@example.com"}"#.utf8))
            }
            if path.hasSuffix("resend") { XCTAssertEqual(body["type"] as? String,"signup") }
            else { XCTAssertNil(body["type"]) }
            return (200,Data("{}".utf8))
        }
        defer { AccountProtocol.handler = nil }
        let result = try await api.register(name:" Person ",username:"person",email:" Person@Example.com ",password:"long-test-password",confirmation:"long-test-password")
        XCTAssertTrue(result.confirmationRequired)
        try await api.sendAccountEmail("person@example.com",recovery:false)
        try await api.sendAccountEmail("person@example.com",recovery:true)
        XCTAssertEqual(paths,["/auth/v1/signup","/auth/v1/resend","/auth/v1/recover"])
        XCTAssertEqual(api.session?.accessToken,"regular-session")
    }
    func testConfirmationUsesTemporarySessionAndOnlyLocalLogout() async throws {
        let api = try backend(),response = verified; var paths:[String] = []
        AccountProtocol.handler = { request in
            let path = request.url!.path; paths.append(path)
            if path.hasSuffix("verify") {
                let body = try AccountProtocol.body(request)
                XCTAssertEqual(body["type"] as? String,"email"); XCTAssertEqual(body["token"] as? String,"123456")
                return (200,response)
            }
            XCTAssertEqual(request.value(forHTTPHeaderField:"Authorization"),"Bearer email-proof-session")
            XCTAssertEqual(URLComponents(url:request.url!,resolvingAgainstBaseURL:false)?.queryItems?.first?.value,"local")
            return (204,Data())
        }
        defer { AccountProtocol.handler = nil }
        let result = try await api.finishAccountEmail(email:"person@example.com",proof:"123456",recovery:false)
        XCTAssertFalse(result.warning); XCTAssertEqual(paths,["/auth/v1/verify","/auth/v1/logout"])
        XCTAssertEqual(api.session?.accessToken,"regular-session")
    }
    func testRecoveryBindsEmailUpdatesPasswordAndRevokesGlobalSessions() async throws {
        let api = try backend(),response = verified; var paths:[String] = []
        AccountProtocol.handler = { request in
            XCTAssertEqual(request.url?.scheme,"https"); XCTAssertEqual(request.url?.host,"luoqlhgfmixvfqbfcdoc.supabase.co")
            let path = request.url!.path; paths.append(path)
            if path.hasSuffix("verify") { XCTAssertEqual(try AccountProtocol.body(request)["type"] as? String,"recovery"); return (200,response) }
            XCTAssertEqual(request.value(forHTTPHeaderField:"Authorization"),"Bearer email-proof-session")
            if path.hasSuffix("user") { XCTAssertEqual(request.httpMethod,"PUT"); XCTAssertEqual(try AccountProtocol.body(request)["password"] as? String,"new-long-password") }
            else { XCTAssertEqual(URLComponents(url:request.url!,resolvingAgainstBaseURL:false)?.queryItems?.first?.value,"global") }
            return (200,Data("{}".utf8))
        }
        defer { AccountProtocol.handler = nil }
        let result = try await api.finishAccountEmail(email:"person@example.com",proof:"123456",recovery:true,password:"new-long-password",confirmation:"new-long-password")
        XCTAssertFalse(result.warning); XCTAssertEqual(paths,["/auth/v1/verify","/auth/v1/user","/auth/v1/logout"])
        XCTAssertEqual(api.session?.accessToken,"regular-session")
    }
    func testEmailMismatchNeverChangesPasswordAndDiscardsVerificationSession() async throws {
        let api = try backend(),response = verified; var paths:[String] = []
        AccountProtocol.handler = { request in paths.append(request.url!.path); return request.url!.path.hasSuffix("verify") ? (200,response):(204,Data()) }
        defer { AccountProtocol.handler = nil }
        do { _ = try await api.finishAccountEmail(email:"another@example.com",proof:"123456",recovery:true,password:"new-long-password",confirmation:"new-long-password"); XCTFail("Wrong email must fail") }
        catch { XCTAssertTrue(error.localizedDescription.contains("não pertence")) }
        XCTAssertEqual(paths,["/auth/v1/verify","/auth/v1/logout"])
        XCTAssertEqual(api.session?.accessToken,"regular-session")
    }
    func testPasswordUpdateFailureCleansUpWithoutReportingSuccess() async throws {
        let api = try backend(),response = verified; var paths:[String] = []
        AccountProtocol.handler = { request in
            let path = request.url!.path; paths.append(path)
            if path.hasSuffix("verify") { return (200,response) }
            return path.hasSuffix("user") ? (500,Data("private SQL detail".utf8)):(204,Data())
        }
        defer { AccountProtocol.handler = nil }
        do { _ = try await api.finishAccountEmail(email:"person@example.com",proof:"123456",recovery:true,password:"new-long-password",confirmation:"new-long-password"); XCTFail("Failed update must fail") }
        catch { XCTAssertFalse(error.localizedDescription.contains("SQL")) }
        XCTAssertEqual(paths,["/auth/v1/verify","/auth/v1/user","/auth/v1/logout"])
    }
    func testRevocationFailureReportsThatPasswordAlreadyChanged() async throws {
        let api = try backend(),response = verified; var scopes:[String] = []
        AccountProtocol.handler = { request in
            if request.url!.path.hasSuffix("verify") { return (200,response) }
            if request.url!.path.hasSuffix("logout") {
                let scope = URLComponents(url:request.url!,resolvingAgainstBaseURL:false)!.queryItems!.first!.value!; scopes.append(scope)
                return scope == "global" ? (503,Data()):(204,Data())
            }
            return (200,Data("{}".utf8))
        }
        defer { AccountProtocol.handler = nil }
        let result = try await api.finishAccountEmail(email:"person@example.com",proof:"123456",recovery:true,password:"new-long-password",confirmation:"new-long-password")
        XCTAssertTrue(result.warning); XCTAssertTrue(result.message.contains("A senha foi alterada")); XCTAssertEqual(scopes,["global","local"])
        XCTAssertEqual(api.session?.accessToken,"regular-session")
    }
    func testInvalidProofDoesNotMakeNetworkRequest() async throws {
        let api = try backend()
        AccountProtocol.handler = { _ in XCTFail("Invalid proof must not reach the network"); return (500,Data()) }
        defer { AccountProtocol.handler = nil }
        do { _ = try await api.finishAccountEmail(email:"person@example.com",proof:"https://evil.test",recovery:false); XCTFail("Expected rejection") } catch {}
    }
    func testAutoConfirmedSignupRevokesTemporarySessionAndReturnsToLogin() async throws {
        let api = try backend(),response = verified; var paths:[String] = []
        AccountProtocol.handler = { request in
            paths.append(request.url!.path)
            if request.url!.path.hasSuffix("signup") { return (200,response) }
            XCTAssertEqual(request.value(forHTTPHeaderField:"Authorization"),"Bearer email-proof-session")
            return (204,Data())
        }
        defer { AccountProtocol.handler = nil }
        let result = try await api.register(name:"Person",username:"person",email:"person@example.com",password:"long-test-password",confirmation:"long-test-password")
        XCTAssertFalse(result.confirmationRequired); XCTAssertFalse(result.warning)
        XCTAssertEqual(paths,["/auth/v1/signup","/auth/v1/logout"])
        XCTAssertEqual(api.session?.accessToken,"regular-session")
    }
    func testOriginalLinkIsParsedLocallyAndNeverFollowed() async throws {
        let api = try backend(),response = verified,token = String(repeating:"a",count:40)
        let link = "https://luoqlhgfmixvfqbfcdoc.supabase.co/auth/v1/verify?type=signup&token="+token+"&redirect_to=https%3A%2F%2Fevil.test"
        AccountProtocol.handler = { request in
            XCTAssertEqual(request.url?.host,"luoqlhgfmixvfqbfcdoc.supabase.co")
            XCTAssertNil(URLComponents(url:request.url!,resolvingAgainstBaseURL:false)?.queryItems?.first{$0.name == "redirect_to"})
            if request.url!.path.hasSuffix("verify") {
                let body = try AccountProtocol.body(request)
                XCTAssertEqual(body["token_hash"] as? String,token); XCTAssertNil(body["token"])
                return (200,response)
            }
            return (204,Data())
        }
        defer { AccountProtocol.handler = nil }
        _ = try await api.finishAccountEmail(email:"person@example.com",proof:link,recovery:false)
        XCTAssertEqual(api.session?.accessToken,"regular-session")
    }
    func testExpiredProofIsNotAcceptedAndDoesNotChangeTheSession() async throws {
        let api = try backend(); var paths:[String] = []
        AccountProtocol.handler = { request in paths.append(request.url!.path); return (403,Data("internal provider detail".utf8)) }
        defer { AccountProtocol.handler = nil }
        do { _ = try await api.finishAccountEmail(email:"person@example.com",proof:"123456",recovery:true,password:"new-long-password",confirmation:"new-long-password"); XCTFail("Expired proof must fail") }
        catch { XCTAssertTrue(error.localizedDescription.contains("expirado")); XCTAssertFalse(error.localizedDescription.contains("provider")) }
        XCTAssertEqual(paths,["/auth/v1/verify"])
        XCTAssertEqual(api.session?.accessToken,"regular-session")
    }

}
