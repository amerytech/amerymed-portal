import QuickLook
import UIKit

final class ClientUploadHistoryViewController: UIViewController {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)

    private var uploads: [ClientUploadRecord] = []
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private let refreshControl = UIRefreshControl()
    private let emptyLabel = UILabel()
    private var previewFileURL: URL?

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
        let metadata = [
            upload.category?.isEmpty == false ? "Category: \(categoryText(for: upload.category))" : nil,
            upload.patientReference?.isEmpty == false ? "Patient: \(upload.patientReference!)" : nil,
            "Status: \(statusText(for: upload.status))",
            "Size: \(formattedSize(upload.fileSize))",
            "Uploaded: \(formattedDate(upload.createdAt))",
        ]
            .compactMap { $0 }
            .joined(separator: "\n")
        let titleLabel = UILabel()
        titleLabel.font = .systemFont(ofSize: 18, weight: .semibold)
        titleLabel.textColor = primaryBlue
        titleLabel.numberOfLines = 0
        titleLabel.text = upload.fileName

        let metadataLabel = UILabel()
        metadataLabel.font = .systemFont(ofSize: 14, weight: .regular)
        metadataLabel.textColor = secondaryText
        metadataLabel.numberOfLines = 0
        metadataLabel.text = metadata

        let reviewButton = UIButton(type: .system)
        reviewButton.setTitle("Review", for: .normal)
        reviewButton.setTitleColor(primaryBlue, for: .normal)
        reviewButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        reviewButton.backgroundColor = UIColor(red: 233 / 255, green: 240 / 255, blue: 251 / 255, alpha: 1)
        reviewButton.layer.cornerRadius = 12
        reviewButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 14, bottom: 10, right: 14)
        reviewButton.tag = indexPath.row
        reviewButton.addTarget(self, action: #selector(handleReviewUpload(_:)), for: .touchUpInside)

        let deleteButton = UIButton(type: .system)
        deleteButton.setTitle("Delete Upload", for: .normal)
        deleteButton.setTitleColor(.white, for: .normal)
        deleteButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        deleteButton.backgroundColor = .systemRed
        deleteButton.layer.cornerRadius = 12
        deleteButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 14, bottom: 10, right: 14)
        deleteButton.contentHorizontalAlignment = .center
        deleteButton.tag = indexPath.row
        deleteButton.addTarget(self, action: #selector(handleDeleteUpload(_:)), for: .touchUpInside)

        let actionStack = UIStackView(arrangedSubviews: [reviewButton, deleteButton])
        actionStack.axis = .horizontal
        actionStack.spacing = 10
        actionStack.distribution = .fillEqually

        let stack = UIStackView(arrangedSubviews: [titleLabel, metadataLabel, actionStack])
        stack.axis = .vertical
        stack.spacing = 10

        let container = UIView()
        container.backgroundColor = .white
        container.layer.cornerRadius = 18

        let inset = UIStackView(arrangedSubviews: [stack])
        inset.axis = .vertical
        inset.translatesAutoresizingMaskIntoConstraints = false
        inset.layoutMargins = UIEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
        inset.isLayoutMarginsRelativeArrangement = true
        container.addSubview(inset)

        NSLayoutConstraint.activate([
            inset.topAnchor.constraint(equalTo: container.topAnchor),
            inset.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            inset.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            inset.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            reviewButton.heightAnchor.constraint(equalToConstant: 40),
            deleteButton.heightAnchor.constraint(equalToConstant: 40),
        ])

        cell.contentConfiguration = nil
        cell.accessoryView = nil
        cell.backgroundView = nil
        cell.contentView.subviews.forEach { $0.removeFromSuperview() }
        container.translatesAutoresizingMaskIntoConstraints = false
        cell.contentView.addSubview(container)
        NSLayoutConstraint.activate([
            container.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 6),
            container.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 2),
            container.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -2),
            container.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -6),
        ])
        cell.backgroundConfiguration = UIBackgroundConfiguration.clear()
        cell.selectionStyle = .none
        return cell
    }
}

extension ClientUploadHistoryViewController {
    @objc private func handleReviewUpload(_ sender: UIButton) {
        guard sender.tag < uploads.count else { return }
        let upload = uploads[sender.tag]

        guard let previewUrl = upload.previewUrl,
              let url = URL(string: previewUrl)
        else {
            showAlert(title: "Preview Unavailable", message: "This upload does not have a review link yet.")
            return
        }

        Task { [weak self] in
            guard let self else { return }

            do {
                let fileURL = try await ClientAPI.shared.downloadPreviewFile(url: url)
                await MainActor.run {
                    self.presentPreview(url: fileURL)
                }
            } catch {
                await MainActor.run {
                    self.showAlert(title: "Unable to Review", message: error.localizedDescription)
                }
            }
        }
    }

    @objc private func handleDeleteUpload(_ sender: UIButton) {
        guard sender.tag < uploads.count else { return }
        let upload = uploads[sender.tag]

        let alert = UIAlertController(
            title: "Delete Upload",
            message: "Remove \(upload.fileName) from your upload history?",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            self?.confirmDelete(upload: upload)
        })
        present(alert, animated: true)
    }

    private func confirmDelete(upload: ClientUploadRecord) {
        guard let session = ClientSessionStore.load() else {
            navigationController?.setViewControllers([ClientLoginViewController()], animated: true)
            return
        }

        Task { [weak self] in
            guard let self else { return }
            do {
                try await ClientAPI.shared.deleteUpload(accessToken: session.accessToken, uploadId: upload.id)
                await MainActor.run {
                    self.uploads.removeAll { $0.id == upload.id }
                    self.emptyLabel.isHidden = !self.uploads.isEmpty
                    self.tableView.reloadData()
                }
            } catch {
                await MainActor.run {
                    self.showAlert(title: "Unable to Delete", message: error.localizedDescription)
                }
            }
        }
    }

    private func presentPreview(url: URL) {
        previewFileURL = url
        let previewController = QLPreviewController()
        previewController.dataSource = self
        present(previewController, animated: true)
    }
}

extension ClientUploadHistoryViewController: QLPreviewControllerDataSource {
    func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        previewFileURL == nil ? 0 : 1
    }

    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        previewFileURL! as NSURL
    }
}
