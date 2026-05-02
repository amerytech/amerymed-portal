import QuickLook
import UIKit

final class AdminDashboardViewController: UIViewController {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let accentTeal = UIColor(red: 15 / 255, green: 118 / 255, blue: 110 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)

    private var dashboard: AdminDashboard
    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private var previewFileURL: URL?

    init(dashboard: AdminDashboard) {
        self.dashboard = dashboard
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Dashboard"
        view.backgroundColor = pageBackground
        navigationItem.largeTitleDisplayMode = .always
        configureNavigation()
        configureLayout()
        render()
    }

    private func configureNavigation() {
        navigationItem.rightBarButtonItems = [
            UIBarButtonItem(title: "Sign Out", style: .plain, target: self, action: #selector(handleSignOut)),
            UIBarButtonItem(barButtonSystemItem: .refresh, target: self, action: #selector(handleRefresh)),
        ]

        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = pageBackground
        appearance.titleTextAttributes = [.foregroundColor: primaryBlue]
        appearance.largeTitleTextAttributes = [.foregroundColor: primaryBlue]
        navigationController?.navigationBar.standardAppearance = appearance
        navigationController?.navigationBar.scrollEdgeAppearance = appearance
    }

    private func configureLayout() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        contentStack.axis = .vertical
        contentStack.spacing = 18
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.layoutMargins = UIEdgeInsets(top: 18, left: 20, bottom: 32, right: 20)
        contentStack.isLayoutMarginsRelativeArrangement = true

        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            contentStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            contentStack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
        ])
    }

    private func render() {
        contentStack.arrangedSubviews.forEach {
            contentStack.removeArrangedSubview($0)
            $0.removeFromSuperview()
        }

        contentStack.addArrangedSubview(makeHeroCard())
        contentStack.addArrangedSubview(makeStatsCard())

        if dashboard.uploads.isEmpty {
            contentStack.addArrangedSubview(makeInfoCard(title: "No uploads yet", body: "Client submissions will appear here after files are uploaded."))
        } else {
            for upload in dashboard.uploads {
                contentStack.addArrangedSubview(makeUploadCard(upload))
            }
        }
    }

    private func makeHeroCard() -> UIView {
        let card = makeCard(backgroundColor: primaryBlue)
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 22, left: 20, bottom: 22, right: 20), spacing: 12)
        stack.addArrangedSubview(makeLabel(text: "AMERYMED ADMIN WORKSPACE", font: .systemFont(ofSize: 13, weight: .bold), color: UIColor.white.withAlphaComponent(0.84)))
        stack.addArrangedSubview(makeLabel(text: "Review intake and move documents through billing action.", font: .systemFont(ofSize: 28, weight: .bold), color: .white))
        stack.addArrangedSubview(makeLabel(text: "Signed in as \(dashboard.userEmail). Preview submissions, confirm patient references, and update document status without leaving the app.", font: .systemFont(ofSize: 15, weight: .regular), color: UIColor.white.withAlphaComponent(0.9)))
        pin(stack, to: card)
        return card
    }

    private func makeStatsCard() -> UIView {
        let card = makeCard()
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 18, left: 18, bottom: 18, right: 18), spacing: 14)
        stack.addArrangedSubview(makeLabel(text: "Operations Snapshot", font: .systemFont(ofSize: 22, weight: .bold), color: primaryBlue))

        let topRow = UIStackView(arrangedSubviews: [
            makeStatTile(title: "Total", value: "\(dashboard.totalUploads)", color: primaryBlue),
            makeStatTile(title: "Received", value: "\(dashboard.receivedCount)", color: primaryBlue),
        ])
        topRow.axis = .horizontal
        topRow.spacing = 12
        topRow.distribution = .fillEqually

        let bottomRow = UIStackView(arrangedSubviews: [
            makeStatTile(title: "In Review", value: "\(dashboard.inReviewCount)", color: UIColor(red: 180 / 255, green: 83 / 255, blue: 9 / 255, alpha: 1)),
            makeStatTile(title: "Processed", value: "\(dashboard.processedCount)", color: UIColor(red: 25 / 255, green: 135 / 255, blue: 84 / 255, alpha: 1)),
        ])
        bottomRow.axis = .horizontal
        bottomRow.spacing = 12
        bottomRow.distribution = .fillEqually

        stack.addArrangedSubview(topRow)
        stack.addArrangedSubview(bottomRow)
        pin(stack, to: card)
        return card
    }

    private func makeUploadCard(_ upload: AdminUploadRecord) -> UIView {
        let card = makeCard()
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 18, left: 18, bottom: 18, right: 18), spacing: 12)

        let title = makeLabel(text: upload.fileName, font: .systemFont(ofSize: 19, weight: .bold), color: primaryBlue)
        stack.addArrangedSubview(title)
        stack.addArrangedSubview(makePill(text: statusText(upload.status), status: upload.status))
        stack.addArrangedSubview(makeLabel(text: uploadMetadata(upload), font: .systemFont(ofSize: 14, weight: .regular), color: secondaryText))

        if let notes = upload.notes, !notes.isEmpty {
            stack.addArrangedSubview(makeLabel(text: "Notes: \(notes)", font: .systemFont(ofSize: 14, weight: .regular), color: secondaryText))
        }

        let actionRow = UIStackView(arrangedSubviews: [
            makeActionButton(title: "Review", color: primaryBlue, action: #selector(handleReview(_:)), uploadId: upload.id),
            makeActionButton(title: "In Review", color: UIColor(red: 180 / 255, green: 83 / 255, blue: 9 / 255, alpha: 1), action: #selector(handleMarkInReview(_:)), uploadId: upload.id),
            makeActionButton(title: "Processed", color: accentTeal, action: #selector(handleMarkProcessed(_:)), uploadId: upload.id),
        ])
        actionRow.axis = .vertical
        actionRow.spacing = 8
        stack.addArrangedSubview(actionRow)

        pin(stack, to: card)
        return card
    }

    private func makeActionButton(title: String, color: UIColor, action: Selector, uploadId: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = color
        button.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
        button.layer.cornerRadius = 12
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14)
        button.accessibilityIdentifier = uploadId
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    @objc private func handleRefresh() {
        refreshDashboard()
    }

    @objc private func handleSignOut() {
        AdminSessionStore.clear()
        navigationController?.setViewControllers([AdminLoginViewController()], animated: true)
    }

    @objc private func handleReview(_ sender: UIButton) {
        guard let upload = upload(for: sender),
              let previewUrl = upload.previewUrl,
              let url = URL(string: previewUrl)
        else {
            showAlert(title: "Preview Unavailable", message: "This upload does not have a review link yet.")
            return
        }

        Task { [weak self] in
            guard let self else { return }
            do {
                let fileURL = try await AdminAPI.shared.downloadPreviewFile(url: url)
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

    @objc private func handleMarkInReview(_ sender: UIButton) {
        updateStatus(sender: sender, status: "in_review")
    }

    @objc private func handleMarkProcessed(_ sender: UIButton) {
        updateStatus(sender: sender, status: "processed")
    }

    private func updateStatus(sender: UIButton, status: String) {
        guard let upload = upload(for: sender),
              let session = AdminSessionStore.load()
        else { return }

        sender.isEnabled = false
        sender.alpha = 0.6

        Task { [weak self] in
            guard let self else { return }
            do {
                let dashboard = try await AdminAPI.shared.updateStatus(accessToken: session.accessToken, uploadId: upload.id, status: status)
                await MainActor.run {
                    let updatedSession = AdminSession(accessToken: session.accessToken, refreshToken: session.refreshToken, dashboard: dashboard)
                    AdminSessionStore.save(updatedSession)
                    self.dashboard = dashboard
                    self.render()
                }
            } catch {
                await MainActor.run {
                    sender.isEnabled = true
                    sender.alpha = 1
                    self.showAlert(title: "Unable to Update Status", message: error.localizedDescription)
                }
            }
        }
    }

    private func refreshDashboard() {
        guard let session = AdminSessionStore.load() else {
            navigationController?.setViewControllers([AdminLoginViewController()], animated: true)
            return
        }

        Task { [weak self] in
            guard let self else { return }
            do {
                let dashboard = try await AdminAPI.shared.refreshDashboard(accessToken: session.accessToken)
                await MainActor.run {
                    let updatedSession = AdminSession(accessToken: session.accessToken, refreshToken: session.refreshToken, dashboard: dashboard)
                    AdminSessionStore.save(updatedSession)
                    self.dashboard = dashboard
                    self.render()
                }
            } catch {
                await MainActor.run {
                    self.showAlert(title: "Unable to Refresh", message: error.localizedDescription)
                }
            }
        }
    }

    private func upload(for sender: UIButton) -> AdminUploadRecord? {
        guard let id = sender.accessibilityIdentifier else { return nil }
        return dashboard.uploads.first { $0.id == id }
    }

    private func uploadMetadata(_ upload: AdminUploadRecord) -> String {
        [
            upload.clinicName?.isEmpty == false ? "Clinic: \(upload.clinicName!)" : nil,
            upload.category?.isEmpty == false ? "Category: \(categoryText(upload.category))" : nil,
            upload.patientReference?.isEmpty == false ? "Patient: \(upload.patientReference!)" : nil,
            "Size: \(formattedSize(upload.fileSize))",
            "Uploaded: \(formattedDate(upload.createdAt))",
        ].compactMap { $0 }.joined(separator: "\n")
    }

    private func statusText(_ status: String?) -> String {
        (status ?? "unknown").replacingOccurrences(of: "_", with: " ").capitalized
    }

    private func categoryText(_ category: String?) -> String {
        switch category {
        case "FaceSheet": return "Face Sheet"
        case "InsuranceCard": return "Insurance ID"
        case let value? where !value.isEmpty: return value
        default: return "Unknown"
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

    private func makeCard(backgroundColor: UIColor = .white) -> UIView {
        let card = UIView()
        card.backgroundColor = backgroundColor
        card.layer.cornerRadius = 24
        return card
    }

    private func makeVerticalStack(margins: UIEdgeInsets, spacing: CGFloat) -> UIStackView {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = spacing
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = margins
        stack.isLayoutMarginsRelativeArrangement = true
        return stack
    }

    private func makeStatTile(title: String, value: String, color: UIColor) -> UIView {
        let tile = makeCard(backgroundColor: UIColor(red: 248 / 255, green: 250 / 255, blue: 253 / 255, alpha: 1))
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 14, left: 14, bottom: 14, right: 14), spacing: 6)
        stack.addArrangedSubview(makeLabel(text: title.uppercased(), font: .systemFont(ofSize: 12, weight: .bold), color: secondaryText))
        stack.addArrangedSubview(makeLabel(text: value, font: .systemFont(ofSize: 28, weight: .bold), color: color))
        pin(stack, to: tile)
        return tile
    }

    private func makePill(text: String, status: String?) -> UILabel {
        let label = makeLabel(text: text, font: .systemFont(ofSize: 13, weight: .bold), color: primaryBlue)
        label.textAlignment = .center
        label.backgroundColor = status == "processed"
            ? UIColor(red: 226 / 255, green: 246 / 255, blue: 236 / 255, alpha: 1)
            : UIColor(red: 233 / 255, green: 240 / 255, blue: 251 / 255, alpha: 1)
        label.layer.cornerRadius = 12
        label.clipsToBounds = true
        label.heightAnchor.constraint(equalToConstant: 34).isActive = true
        return label
    }

    private func makeInfoCard(title: String, body: String) -> UIView {
        let card = makeCard()
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 20, left: 18, bottom: 20, right: 18), spacing: 10)
        stack.addArrangedSubview(makeLabel(text: title, font: .systemFont(ofSize: 22, weight: .bold), color: primaryBlue))
        stack.addArrangedSubview(makeLabel(text: body, font: .systemFont(ofSize: 15, weight: .regular), color: secondaryText))
        pin(stack, to: card)
        return card
    }

    private func makeLabel(text: String, font: UIFont, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = font
        label.textColor = color
        label.numberOfLines = 0
        return label
    }

    private func pin(_ view: UIView, to container: UIView) {
        container.addSubview(view)
        NSLayoutConstraint.activate([
            view.topAnchor.constraint(equalTo: container.topAnchor),
            view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            view.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])
    }

    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    private func presentPreview(url: URL) {
        previewFileURL = url
        let previewController = QLPreviewController()
        previewController.dataSource = self
        present(previewController, animated: true)
    }
}

extension AdminDashboardViewController: QLPreviewControllerDataSource {
    func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        previewFileURL == nil ? 0 : 1
    }

    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        previewFileURL! as NSURL
    }
}
