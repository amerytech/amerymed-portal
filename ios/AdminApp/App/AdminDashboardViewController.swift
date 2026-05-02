import QuickLook
import UIKit

final class AdminDashboardViewController: UIViewController {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let accentTeal = UIColor(red: 15 / 255, green: 118 / 255, blue: 110 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)
    private let warningOrange = UIColor(red: 180 / 255, green: 83 / 255, blue: 9 / 255, alpha: 1)
    private let dangerRed = UIColor(red: 185 / 255, green: 28 / 255, blue: 28 / 255, alpha: 1)

    private var dashboard: AdminDashboard
    private var selectedUploadIds = Set<String>()
    private var searchText = ""
    private var statusFilter = "all"
    private var categoryFilter = "all"
    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private var previewFileURL: URL?

    private var filteredUploads: [AdminUploadRecord] {
        dashboard.uploads.filter { upload in
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let searchable = [
                upload.fileName,
                upload.clinicName ?? "",
                upload.patientReference ?? "",
                upload.notes ?? "",
                categoryText(upload.category),
            ].joined(separator: " ").lowercased()

            let matchesSearch = query.isEmpty || searchable.contains(query)
            let matchesStatus = statusFilter == "all" || (upload.status ?? "") == statusFilter
            let matchesCategory = categoryFilter == "all" || (upload.category ?? "") == categoryFilter
            return matchesSearch && matchesStatus && matchesCategory
        }
    }

    init(dashboard: AdminDashboard) {
        self.dashboard = dashboard
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Admin"
        view.backgroundColor = pageBackground
        navigationItem.largeTitleDisplayMode = .never
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

        contentStack.addArrangedSubview(makeLogoHeader())
        contentStack.addArrangedSubview(makeHeroCard())
        contentStack.addArrangedSubview(makeStatsCard())
        contentStack.addArrangedSubview(makeSearchCard())
        contentStack.addArrangedSubview(makeBulkActionsCard())
        contentStack.addArrangedSubview(makeSectionHeader())

        let uploads = filteredUploads
        if uploads.isEmpty {
            contentStack.addArrangedSubview(makeInfoCard(title: "No matching uploads", body: "Adjust search or filters to review document history."))
        } else {
            uploads.forEach { contentStack.addArrangedSubview(makeUploadCard($0)) }
        }
    }

    private func makeLogoHeader() -> UIView {
        let wrapper = UIView()
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false

        let imageView = UIImageView(image: UIImage(named: "AMedLogo"))
        imageView.contentMode = .scaleAspectFit
        imageView.backgroundColor = .white
        imageView.layer.cornerRadius = 12
        imageView.clipsToBounds = true
        imageView.widthAnchor.constraint(equalToConstant: 54).isActive = true
        imageView.heightAnchor.constraint(equalToConstant: 54).isActive = true

        let label = makeLabel(text: "AmeryMed Admin", font: .systemFont(ofSize: 30, weight: .bold), color: primaryBlue)
        stack.addArrangedSubview(imageView)
        stack.addArrangedSubview(label)
        wrapper.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: wrapper.topAnchor),
            stack.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: wrapper.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor),
        ])

        return wrapper
    }

    private func makeHeroCard() -> UIView {
        let card = makeCard(backgroundColor: primaryBlue)
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 22, left: 20, bottom: 22, right: 20), spacing: 12)
        stack.addArrangedSubview(makeLabel(text: "ADMIN OPERATIONS", font: .systemFont(ofSize: 13, weight: .bold), color: UIColor.white.withAlphaComponent(0.84)))
        stack.addArrangedSubview(makeLabel(text: "Review intake, update notes, export views, and move uploads through billing action.", font: .systemFont(ofSize: 25, weight: .bold), color: .white))
        stack.addArrangedSubview(makeLabel(text: "Signed in as \(dashboard.userEmail). Search by clinic, patient reference, file name, notes, or category without leaving the native app.", font: .systemFont(ofSize: 15, weight: .regular), color: UIColor.white.withAlphaComponent(0.9)))
        pin(stack, to: card)
        return card
    }

    private func makeStatsCard() -> UIView {
        let card = makeCard()
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 18, left: 18, bottom: 18, right: 18), spacing: 14)
        stack.addArrangedSubview(makeLabel(text: "Operations Snapshot", font: .systemFont(ofSize: 22, weight: .bold), color: primaryBlue))

        let rows = [
            [makeStatTile(title: "Total", value: "\(dashboard.totalUploads)", color: primaryBlue),
             makeStatTile(title: "Received", value: "\(dashboard.receivedCount)", color: primaryBlue)],
            [makeStatTile(title: "In Review", value: "\(dashboard.inReviewCount)", color: warningOrange),
             makeStatTile(title: "Processed", value: "\(dashboard.processedCount)", color: UIColor(red: 25 / 255, green: 135 / 255, blue: 84 / 255, alpha: 1))],
        ]

        rows.forEach { rowViews in
            let row = UIStackView(arrangedSubviews: rowViews)
            row.axis = .horizontal
            row.spacing = 12
            row.distribution = .fillEqually
            stack.addArrangedSubview(row)
        }

        pin(stack, to: card)
        return card
    }

    private func makeSearchCard() -> UIView {
        let card = makeCard()
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 18, left: 18, bottom: 18, right: 18), spacing: 12)
        stack.addArrangedSubview(makeLabel(text: "Search Uploads", font: .systemFont(ofSize: 22, weight: .bold), color: primaryBlue))

        let searchField = UITextField()
        searchField.placeholder = "Search file, clinic, patient ref, notes"
        searchField.text = searchText
        searchField.borderStyle = .roundedRect
        searchField.font = .systemFont(ofSize: 16, weight: .semibold)
        searchField.textColor = primaryBlue
        searchField.clearButtonMode = .whileEditing
        searchField.addTarget(self, action: #selector(searchChanged(_:)), for: .editingChanged)
        stack.addArrangedSubview(searchField)

        let statusControl = UISegmentedControl(items: ["All", "Received", "Review", "Processed"])
        statusControl.selectedSegmentIndex = ["all", "received", "in_review", "processed"].firstIndex(of: statusFilter) ?? 0
        statusControl.addTarget(self, action: #selector(statusFilterChanged(_:)), for: .valueChanged)
        stack.addArrangedSubview(statusControl)

        let categoryControl = UISegmentedControl(items: ["All", "EOB", "Face", "Ins.", "Other"])
        categoryControl.selectedSegmentIndex = ["all", "EOB", "FaceSheet", "InsuranceCard", "Other"].firstIndex(of: categoryFilter) ?? 0
        categoryControl.addTarget(self, action: #selector(categoryFilterChanged(_:)), for: .valueChanged)
        stack.addArrangedSubview(categoryControl)

        pin(stack, to: card)
        return card
    }

    private func makeBulkActionsCard() -> UIView {
        let card = makeCard()
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 16, left: 18, bottom: 16, right: 18), spacing: 10)
        stack.addArrangedSubview(makeLabel(text: "\(filteredUploads.count) upload(s) shown • \(selectedUploadIds.count) selected", font: .systemFont(ofSize: 14, weight: .bold), color: secondaryText))

        let selectButton = makePlainButton(title: allFilteredSelected ? "Clear Selection" : "Select Filtered", color: primaryBlue, action: #selector(handleSelectFiltered))
        let exportButton = makePlainButton(title: "Export CSV", color: accentTeal, action: #selector(handleExportCsv))
        let deleteButton = makePlainButton(title: "Bulk Delete", color: dangerRed, action: #selector(handleBulkDelete))
        deleteButton.isEnabled = !selectedUploadIds.isEmpty
        deleteButton.alpha = selectedUploadIds.isEmpty ? 0.45 : 1

        [selectButton, exportButton, deleteButton].forEach { stack.addArrangedSubview($0) }
        pin(stack, to: card)
        return card
    }

    private var allFilteredSelected: Bool {
        let ids = Set(filteredUploads.map(\.id))
        return !ids.isEmpty && ids.isSubset(of: selectedUploadIds)
    }

    private func makeSectionHeader() -> UIView {
        let wrapper = UIView()
        let stack = makeVerticalStack(margins: .zero, spacing: 4)
        stack.addArrangedSubview(makeLabel(text: "Upload History", font: .systemFont(ofSize: 28, weight: .bold), color: primaryBlue))
        stack.addArrangedSubview(makeLabel(text: "Review, edit notes, change status, delete records, or export the current filtered view.", font: .systemFont(ofSize: 14, weight: .regular), color: secondaryText))
        pin(stack, to: wrapper)
        return wrapper
    }

    private func makeUploadCard(_ upload: AdminUploadRecord) -> UIView {
        let card = makeCard()
        let stack = makeVerticalStack(margins: UIEdgeInsets(top: 18, left: 18, bottom: 18, right: 18), spacing: 12)

        let selected = selectedUploadIds.contains(upload.id)
        stack.addArrangedSubview(makeActionButton(title: selected ? "Selected" : "Select", color: selected ? accentTeal : primaryBlue, action: #selector(handleToggleSelection(_:)), uploadId: upload.id))
        stack.addArrangedSubview(makeLabel(text: upload.fileName, font: .systemFont(ofSize: 19, weight: .bold), color: primaryBlue))
        stack.addArrangedSubview(makePill(text: statusText(upload.status), status: upload.status))
        stack.addArrangedSubview(makeLabel(text: uploadMetadata(upload), font: .systemFont(ofSize: 14, weight: .regular), color: secondaryText))

        stack.addArrangedSubview(makeLabel(text: "Notes", font: .systemFont(ofSize: 15, weight: .bold), color: primaryBlue))
        stack.addArrangedSubview(makeLabel(text: upload.notes?.isEmpty == false ? upload.notes! : "No notes recorded.", font: .systemFont(ofSize: 14, weight: .regular), color: secondaryText))

        [
            makeActionButton(title: "Review", color: primaryBlue, action: #selector(handleReview(_:)), uploadId: upload.id),
            makeActionButton(title: "Edit Notes", color: accentTeal, action: #selector(handleEditNotes(_:)), uploadId: upload.id),
            makeActionButton(title: "Mark In Review", color: warningOrange, action: #selector(handleMarkInReview(_:)), uploadId: upload.id),
            makeActionButton(title: "Mark Processed", color: accentTeal, action: #selector(handleMarkProcessed(_:)), uploadId: upload.id),
            makeActionButton(title: "Delete", color: dangerRed, action: #selector(handleDelete(_:)), uploadId: upload.id),
        ].forEach { stack.addArrangedSubview($0) }

        pin(stack, to: card)
        return card
    }

    private func makeActionButton(title: String, color: UIColor, action: Selector, uploadId: String) -> UIButton {
        let button = makePlainButton(title: title, color: color, action: action)
        button.accessibilityIdentifier = uploadId
        return button
    }

    private func makePlainButton(title: String, color: UIColor, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = color
        button.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
        button.layer.cornerRadius = 12
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14)
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    @objc private func searchChanged(_ sender: UITextField) {
        searchText = sender.text ?? ""
        NSObject.cancelPreviousPerformRequests(withTarget: self, selector: #selector(renderFromSearch), object: nil)
        perform(#selector(renderFromSearch), with: nil, afterDelay: 0.35)
    }

    @objc private func renderFromSearch() {
        render()
    }

    @objc private func statusFilterChanged(_ sender: UISegmentedControl) {
        statusFilter = ["all", "received", "in_review", "processed"][safe: sender.selectedSegmentIndex] ?? "all"
        selectedUploadIds = selectedUploadIds.intersection(Set(filteredUploads.map(\.id)))
        render()
    }

    @objc private func categoryFilterChanged(_ sender: UISegmentedControl) {
        categoryFilter = ["all", "EOB", "FaceSheet", "InsuranceCard", "Other"][safe: sender.selectedSegmentIndex] ?? "all"
        selectedUploadIds = selectedUploadIds.intersection(Set(filteredUploads.map(\.id)))
        render()
    }

    @objc private func handleRefresh() {
        refreshDashboard()
    }

    @objc private func handleSignOut() {
        AdminSessionStore.clear()
        navigationController?.setViewControllers([AdminLoginViewController()], animated: true)
    }

    @objc private func handleToggleSelection(_ sender: UIButton) {
        guard let upload = upload(for: sender) else { return }
        if selectedUploadIds.contains(upload.id) {
            selectedUploadIds.remove(upload.id)
        } else {
            selectedUploadIds.insert(upload.id)
        }
        render()
    }

    @objc private func handleSelectFiltered() {
        let ids = Set(filteredUploads.map(\.id))
        if allFilteredSelected {
            selectedUploadIds.subtract(ids)
        } else {
            selectedUploadIds.formUnion(ids)
        }
        render()
    }

    @objc private func handleExportCsv() {
        let uploads = filteredUploads
        guard !uploads.isEmpty else {
            showAlert(title: "Nothing to Export", message: "No uploads match the current filters.")
            return
        }

        let csv = makeCsv(uploads: uploads)
        let fileName = "amerymed_admin_uploads_\(Int(Date().timeIntervalSince1970)).csv"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        do {
            try csv.write(to: url, atomically: true, encoding: .utf8)
            let activity = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            present(activity, animated: true)
        } catch {
            showAlert(title: "Export Failed", message: error.localizedDescription)
        }
    }

    @objc private func handleBulkDelete() {
        let ids = Array(selectedUploadIds)
        guard !ids.isEmpty else { return }
        confirmDelete(uploadIds: ids, message: "Delete \(ids.count) selected upload(s)? This removes database records and storage files.")
    }

    @objc private func handleDelete(_ sender: UIButton) {
        guard let upload = upload(for: sender) else { return }
        confirmDelete(uploadIds: [upload.id], message: "Delete \(upload.fileName)? This removes the database record and storage file.")
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
                await MainActor.run { self.presentPreview(url: fileURL) }
            } catch {
                await MainActor.run { self.showAlert(title: "Unable to Review", message: error.localizedDescription) }
            }
        }
    }

    @objc private func handleEditNotes(_ sender: UIButton) {
        guard let upload = upload(for: sender) else { return }
        let alert = UIAlertController(title: "Edit Notes", message: upload.fileName, preferredStyle: .alert)
        alert.addTextField { textField in
            textField.placeholder = "Enter admin notes"
            textField.text = upload.notes
            textField.clearButtonMode = .whileEditing
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Save Notes", style: .default) { [weak self, weak alert] _ in
            let notes = alert?.textFields?.first?.text ?? ""
            self?.saveNotes(uploadId: upload.id, notes: notes)
        })
        present(alert, animated: true)
    }

    @objc private func handleMarkInReview(_ sender: UIButton) {
        updateStatus(sender: sender, status: "in_review")
    }

    @objc private func handleMarkProcessed(_ sender: UIButton) {
        updateStatus(sender: sender, status: "processed")
    }

    private func updateStatus(sender: UIButton, status: String) {
        guard let upload = upload(for: sender), let session = AdminSessionStore.load() else { return }
        sender.isEnabled = false
        sender.alpha = 0.6

        Task { [weak self] in
            guard let self else { return }
            do {
                let dashboard = try await AdminAPI.shared.updateStatus(accessToken: session.accessToken, uploadId: upload.id, status: status)
                await MainActor.run { self.applyDashboard(dashboard, session: session) }
            } catch {
                await MainActor.run {
                    sender.isEnabled = true
                    sender.alpha = 1
                    self.showAlert(title: "Unable to Update Status", message: error.localizedDescription)
                }
            }
        }
    }

    private func saveNotes(uploadId: String, notes: String) {
        guard let session = AdminSessionStore.load() else { return }
        Task { [weak self] in
            guard let self else { return }
            do {
                let dashboard = try await AdminAPI.shared.updateNotes(accessToken: session.accessToken, uploadId: uploadId, notes: notes)
                await MainActor.run { self.applyDashboard(dashboard, session: session) }
            } catch {
                await MainActor.run { self.showAlert(title: "Unable to Save Notes", message: error.localizedDescription) }
            }
        }
    }

    private func confirmDelete(uploadIds: [String], message: String) {
        let alert = UIAlertController(title: "Confirm Delete", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            self?.deleteUploads(uploadIds)
        })
        present(alert, animated: true)
    }

    private func deleteUploads(_ uploadIds: [String]) {
        guard let session = AdminSessionStore.load() else { return }
        Task { [weak self] in
            guard let self else { return }
            do {
                let dashboard = try await AdminAPI.shared.deleteUploads(accessToken: session.accessToken, uploadIds: uploadIds)
                await MainActor.run {
                    self.selectedUploadIds.subtract(uploadIds)
                    self.applyDashboard(dashboard, session: session)
                }
            } catch {
                await MainActor.run { self.showAlert(title: "Delete Failed", message: error.localizedDescription) }
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
                await MainActor.run { self.applyDashboard(dashboard, session: session) }
            } catch {
                await MainActor.run { self.showAlert(title: "Unable to Refresh", message: error.localizedDescription) }
            }
        }
    }

    private func applyDashboard(_ dashboard: AdminDashboard, session: AdminSession) {
        let updatedSession = AdminSession(accessToken: session.accessToken, refreshToken: session.refreshToken, dashboard: dashboard)
        AdminSessionStore.save(updatedSession)
        self.dashboard = dashboard
        selectedUploadIds = selectedUploadIds.intersection(Set(dashboard.uploads.map(\.id)))
        render()
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
            upload.fileType?.isEmpty == false ? "Type: \(upload.fileType!)" : nil,
            "Size: \(formattedSize(upload.fileSize))",
            "Uploaded: \(formattedDate(upload.createdAt))",
        ].compactMap { $0 }.joined(separator: "\n")
    }

    private func makeCsv(uploads: [AdminUploadRecord]) -> String {
        let headers = ["File Name", "Clinic", "Category", "Patient Reference", "Status", "File Type", "File Size", "Uploaded At", "Notes", "Path"]
        let rows = uploads.map { upload in
            [
                upload.fileName,
                upload.clinicName ?? "",
                categoryText(upload.category),
                upload.patientReference ?? "",
                statusText(upload.status),
                upload.fileType ?? "",
                formattedSize(upload.fileSize),
                formattedDate(upload.createdAt),
                upload.notes ?? "",
                upload.filePath ?? "",
            ]
        }

        return ([headers] + rows).map { $0.map(escapeCsv).joined(separator: ",") }.joined(separator: "\n")
    }

    private func escapeCsv(_ value: String) -> String {
        if value.contains("\"") || value.contains(",") || value.contains("\n") {
            return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return value
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

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
