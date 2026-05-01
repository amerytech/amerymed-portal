import Foundation

struct ClientDashboardSummary: Codable {
    let userEmail: String
    let clientId: String
    let clinicName: String
    let practiceName: String
    let displayName: String
    let providerNpi: String
    let providerAddress: String
    let providerContactEmail: String
    let totalUploads: Int
    let receivedCount: Int
    let inReviewCount: Int
    let processedCount: Int
}

enum ClientAPIError: LocalizedError {
    case invalidResponse
    case server(message: String)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "The AmeryMed service returned an invalid response."
        case .server(let message):
            return message
        case .transport(let error):
            return error.localizedDescription
        }
    }
}

final class ClientAPI {
    static let shared = ClientAPI()

    private let baseURL = URL(string: "https://amerymed-portal.vercel.app")!
    private let session = URLSession.shared

    private init() {}

    func login(email: String, password: String) async throws -> ClientSession {
        let requestURL = baseURL.appendingPathComponent("api/mobile/client/login")
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            "password": password,
        ])

        return try await send(request: request, decode: ClientSession.self)
    }

    func refreshSummary(accessToken: String) async throws -> ClientDashboardSummary {
        let requestURL = baseURL.appendingPathComponent("api/mobile/client/summary")
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "accessToken": accessToken,
        ])

        struct SummaryEnvelope: Decodable {
            let summary: ClientDashboardSummary
        }

        let envelope = try await send(request: request, decode: SummaryEnvelope.self)
        return envelope.summary
    }

    private func send<T: Decodable>(request: URLRequest, decode: T.Type) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw ClientAPIError.invalidResponse
            }

            if !(200 ... 299).contains(httpResponse.statusCode) {
                if let serverError = try? JSONDecoder().decode(ServerErrorResponse.self, from: data) {
                    throw ClientAPIError.server(message: serverError.error)
                }
                throw ClientAPIError.invalidResponse
            }

            return try JSONDecoder().decode(T.self, from: data)
        } catch let error as ClientAPIError {
            throw error
        } catch {
            throw ClientAPIError.transport(error)
        }
    }
}

private struct ServerErrorResponse: Decodable {
    let error: String
}
