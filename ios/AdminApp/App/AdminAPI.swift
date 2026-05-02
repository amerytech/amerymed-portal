import Foundation

enum AdminAPIError: LocalizedError {
    case invalidResponse
    case server(message: String)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "The AmeryMed admin service returned an invalid response."
        case .server(let message):
            return message
        case .transport(let error):
            return error.localizedDescription
        }
    }
}

private struct EmptyResponse: Decodable {}

final class AdminAPI {
    static let shared = AdminAPI()

    private let baseURL = URL(string: "https://amerymed-portal.vercel.app")!
    private let session = URLSession.shared

    private init() {}

    func login(email: String, password: String) async throws -> AdminSession {
        let requestURL = baseURL.appendingPathComponent("api/mobile/admin/login")
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "password": password,
        ])

        return try await send(request: request, decode: AdminSession.self)
    }

    func refreshDashboard(accessToken: String) async throws -> AdminDashboard {
        let requestURL = baseURL.appendingPathComponent("api/mobile/admin/dashboard")
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "accessToken": accessToken,
        ])

        struct DashboardEnvelope: Decodable {
            let dashboard: AdminDashboard
        }

        return try await send(request: request, decode: DashboardEnvelope.self).dashboard
    }

    func updateStatus(accessToken: String, uploadId: String, status: String) async throws -> AdminDashboard {
        let requestURL = baseURL.appendingPathComponent("api/mobile/admin/dashboard")
        var request = URLRequest(url: requestURL)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "accessToken": accessToken,
            "uploadId": uploadId,
            "status": status,
        ])

        struct DashboardEnvelope: Decodable {
            let dashboard: AdminDashboard
        }

        return try await send(request: request, decode: DashboardEnvelope.self).dashboard
    }

    func downloadPreviewFile(url: URL) async throws -> URL {
        do {
            let (temporaryURL, response) = try await session.download(from: url)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200 ... 299).contains(httpResponse.statusCode)
            else {
                throw AdminAPIError.invalidResponse
            }

            let destination = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(url.pathExtension.isEmpty ? "dat" : url.pathExtension)
            if FileManager.default.fileExists(atPath: destination.path) {
                try FileManager.default.removeItem(at: destination)
            }
            try FileManager.default.moveItem(at: temporaryURL, to: destination)
            return destination
        } catch let error as AdminAPIError {
            throw error
        } catch {
            throw AdminAPIError.transport(error)
        }
    }

    private func send<T: Decodable>(request: URLRequest, decode: T.Type) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw AdminAPIError.invalidResponse
            }

            if !(200 ... 299).contains(httpResponse.statusCode) {
                if let serverError = try? JSONDecoder().decode(ServerErrorResponse.self, from: data) {
                    throw AdminAPIError.server(message: serverError.error)
                }
                if let plainText = String(data: data, encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines),
                   !plainText.isEmpty
                {
                    throw AdminAPIError.server(message: plainText)
                }
                throw AdminAPIError.invalidResponse
            }

            return try JSONDecoder().decode(T.self, from: data)
        } catch let error as AdminAPIError {
            throw error
        } catch {
            throw AdminAPIError.transport(error)
        }
    }
}

private struct ServerErrorResponse: Decodable {
    let error: String
}
