import UIKit

final class ClientUploadHistoryViewController: UIViewController {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)

    private var uploads: [ClientUploadRecord] = []
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private let refreshControl = UIRefreshControl()
    private let emptyLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Upload History"
        view.backgroundColor = pageBackground
        navigationItem.largeTitleDisplayMode = .always
        configureTableView()
        loadUploads()
    }

    private func configureTableView() {
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.backgroundColor = pageBackground
        tableView.separatorStyle = .none
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "UploadCell")
        tableView.dataSource = self
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 120
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        tableView.refreshControl = refreshControl
        view.addSubview(tableView)

        emptyLabel.text = "No uploads yet. Your submitted files will appear here once you send them."
        emptyLabel.font = .systemFont(ofSize: 17, weight: .medium)
        emptyLabel.textColor = secondaryText
        emptyLabel.numberOfLines = 0
        emptyLabel.textAlignment = .center
        emptyLabel.isHidden = true
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            emptyLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            emptyLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 28),
            emptyLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -28),
        ])
    }

    @objc private func handleRefresh() {
        loadUploads()
    }

    private func loadUploads() {
        guard let session = ClientSessionStore.load() else {
            navigationController?.setViewControllers([ClientLoginViewController()], animated: true)
            return
        }

        refreshControl.beginRefreshing()

        Task { [weak self] in
            guard let self else { return }

            do {
                let uploads = try await ClientAPI.shared.fetchUploadHistory(accessToken: session.accessToken)
                await MainActor.run {
                    self.uploads = uploads
                    self.emptyLabel.isHidden = !uploads.isEmpty
                    self.tableView.reloadData()
                    self.refreshControl.endRefreshing()
                }
            } catch {
                await MainActor.run {
                    self.refreshControl.endRefreshing()
                    self.showAlert(title: "Unable to Load History", message: error.localizedDescription)
                }
            }
        }
    }

    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    private func statusText(for status: String?) -> String {
        let normalized = (status ?? "unknown").replacingOccurrences(of: "_", with: " ")
        return normalized.capitalized
    }

    private func categoryText(for category: String?) -> String {
        switch category {
        case "EOB":
            return "EOB"
        case "ERA":
            return "ERA"
        case "FaceSheet":
            return "Face Sheet"
        case "InsuranceCard":
            return "Insurance ID"
        case "Claims":
            return "Claims"
        case "Other":
            return "Other Documents"
        case let value? where !value.isEmpty:
            return value
        default:
            return "Unknown"
        }
    }

    private func formattedDate(_ value: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: value) else { return value }
        return DateFormatter.localizedString(from: date, dateStyle: .medium, timeStyle: .short)
    }

    private func formattedSize(_ value: Int?) -> String {
        guard let value else { return "Unknown size" }
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(value))
    }
}

extension ClientUploadHistoryViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        uploads.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "UploadCell", for: indexPath)
        let upload = uploads[indexPath.row]

        var content = UIListContentConfiguration.subtitleCell()
        content.text = upload.fileName
        content.textProperties.color = primaryBlue
        content.textProperties.font = .systemFont(ofSize: 18, weight: .semibold)
        content.secondaryTextProperties.color = secondaryText
        content.secondaryTextProperties.numberOfLines = 0

        let metadata = [
            upload.category?.isEmpty == false ? "Category: \(categoryText(for: upload.category))" : nil,
            upload.patientReference?.isEmpty == false ? "Patient: \(upload.patientReference!)" : nil,
            "Status: \(statusText(for: upload.status))",
            "Size: \(formattedSize(upload.fileSize))",
            "Uploaded: \(formattedDate(upload.createdAt))",
        ]
            .compactMap { $0 }
            .joined(separator: "\n")

        content.secondaryText = metadata
        cell.contentConfiguration = content
        cell.backgroundConfiguration = UIBackgroundConfiguration.clear()
        cell.selectionStyle = .none
        return cell
    }
}
