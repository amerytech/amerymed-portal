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

struct ClientUploadRecord: Decodable {
    let id: String
    let fileName: String
    let fileSize: Int?
    let fileType: String?
    let clinicName: String?
    let category: String?
    let patientReference: String?
    let notes: String?
    let status: String?
    let createdAt: String
}

struct ClientUploadDraft {
    let fileName: String
    let mimeType: String
    let data: Data
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

private struct EmptyResponse: Decodable {}

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

    func fetchUploadHistory(accessToken: String) async throws -> [ClientUploadRecord] {
        let requestURL = baseURL.appendingPathComponent("api/mobile/client/history")
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode([
            "accessToken": accessToken,
        ])

        struct HistoryEnvelope: Decodable {
            let uploads: [ClientUploadRecord]
        }

        let envelope = try await send(request: request, decode: HistoryEnvelope.self)
        return envelope.uploads
    }

    func uploadDocuments(
        accessToken: String,
        category: String,
        patientReference: String,
        notes: String,
        files: [ClientUploadDraft]
    ) async throws {
        guard !files.isEmpty else { return }

        for file in files {
            try await uploadSingleDocument(
                accessToken: accessToken,
                category: category,
                patientReference: patientReference,
                notes: notes,
                file: file
            )
        }
    }

    private func uploadSingleDocument(
        accessToken: String,
        category: String,
        patientReference: String,
        notes: String,
        file: ClientUploadDraft
    ) async throws {
        let requestURL = baseURL.appendingPathComponent("api/mobile/client/upload")
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = createMultipartBody(
            boundary: boundary,
            accessToken: accessToken,
            category: category,
            patientReference: patientReference,
            notes: notes,
            files: [file]
        )

        _ = try await send(request: request, decode: EmptyResponse.self)
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
                if let plainText = String(data: data, encoding: .utf8)?
                    .trimmingCharacters(in: .whitespacesAndNewlines),
                   !plainText.isEmpty
                {
                    throw ClientAPIError.server(message: plainText)
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

    private func createMultipartBody(
        boundary: String,
        accessToken: String,
        category: String,
        patientReference: String,
        notes: String,
        files: [ClientUploadDraft]
    ) -> Data {
        var body = Data()

        func appendField(name: String, value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        appendField(name: "accessToken", value: accessToken)
        appendField(name: "category", value: category)
        appendField(name: "patientReference", value: patientReference)
        appendField(name: "notes", value: notes)

        for file in files {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append(
                "Content-Disposition: form-data; name=\"files\"; filename=\"\(file.fileName)\"\r\n".data(using: .utf8)!
            )
            body.append("Content-Type: \(file.mimeType)\r\n\r\n".data(using: .utf8)!)
            body.append(file.data)
            body.append("\r\n".data(using: .utf8)!)
        }

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        return body
    }
}

private struct ServerErrorResponse: Decodable {
    let error: String
}
