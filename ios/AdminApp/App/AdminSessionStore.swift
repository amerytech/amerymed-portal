import Foundation

struct AdminUploadRecord: Codable {
    let id: String
    let fileName: String
    let filePath: String?
    let previewUrl: String?
    let fileSize: Int?
    let fileType: String?
    let clinicName: String?
    let category: String?
    let patientReference: String?
    let notes: String?
    let status: String?
    let createdAt: String
}

struct AdminDashboard: Codable {
    let userEmail: String
    let totalUploads: Int
    let receivedCount: Int
    let inReviewCount: Int
    let processedCount: Int
    let uploads: [AdminUploadRecord]
}

struct AdminSession: Codable {
    let accessToken: String
    let refreshToken: String
    let dashboard: AdminDashboard
}

enum AdminSessionStore {
    private static let sessionKey = "amerymed.admin.native.session"

    static func load() -> AdminSession? {
        guard let data = UserDefaults.standard.data(forKey: sessionKey) else {
            return nil
        }

        return try? JSONDecoder().decode(AdminSession.self, from: data)
    }

    static func save(_ session: AdminSession) {
        guard let data = try? JSONEncoder().encode(session) else {
            return
        }

        UserDefaults.standard.set(data, forKey: sessionKey)
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: sessionKey)
    }
}
