import Foundation

struct ClientSession: Codable {
    let accessToken: String
    let refreshToken: String
    let summary: ClientDashboardSummary
}

enum ClientSessionStore {
    private static let sessionKey = "amerymed.client.native.session"

    static func load() -> ClientSession? {
        guard let data = UserDefaults.standard.data(forKey: sessionKey) else {
            return nil
        }

        return try? JSONDecoder().decode(ClientSession.self, from: data)
    }

    static func save(_ session: ClientSession) {
        guard let data = try? JSONEncoder().encode(session) else {
            return
        }

        UserDefaults.standard.set(data, forKey: sessionKey)
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: sessionKey)
    }
}
