import PhotosUI
import UIKit
import UniformTypeIdentifiers

final class ClientUploadComposerViewController: UIViewController {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let accentTeal = UIColor(red: 15 / 255, green: 118 / 255, blue: 110 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)

    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private let categoryField = UITextField()
    private let patientReferenceField = UITextField()
    private let notesView = UITextView()
    private let selectedFilesLabel = UILabel()
    private let addPhotosButton = UIButton(type: .system)
    private let addFilesButton = UIButton(type: .system)
    private let submitButton = UIButton(type: .system)
    private let statusLabel = UILabel()

    private var selectedFiles: [ClientUploadDraft] = [] {
        didSet { renderSelectedFiles() }
    }

    private let categories = ["EOB", "Claims", "Face Sheet", "Insurance Card", "Other"]

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Upload Documents"
        view.backgroundColor = pageBackground
        navigationItem.largeTitleDisplayMode = .always
        configureLayout()
        configureKeyboardHandling()
        renderSelectedFiles()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    private func configureLayout() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true

        contentStack.axis = .vertical
        contentStack.spacing = 18
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.layoutMargins = UIEdgeInsets(top: 24, left: 20, bottom: 32, right: 20)
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

        contentStack.addArrangedSubview(makeHeroCard())
        contentStack.addArrangedSubview(makeFormCard())
        contentStack.addArrangedSubview(statusLabel)

        statusLabel.font = .systemFont(ofSize: 14, weight: .regular)
        statusLabel.textColor = UIColor(red: 176 / 255, green: 48 / 255, blue: 48 / 255, alpha: 1)
        statusLabel.numberOfLines = 0
        statusLabel.isHidden = true
    }

    private func makeHeroCard() -> UIView {
        let container = UIView()
        container.backgroundColor = primaryBlue
        container.layer.cornerRadius = 28

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = UIEdgeInsets(top: 24, left: 20, bottom: 24, right: 20)
        stack.isLayoutMarginsRelativeArrangement = true

        stack.addArrangedSubview(makeLabel(text: "NATIVE UPLOAD", font: .systemFont(ofSize: 13, weight: .semibold), color: UIColor.white.withAlphaComponent(0.86)))
        stack.addArrangedSubview(makeLabel(text: "Add billing documents directly from photos or files.", font: .systemFont(ofSize: 30, weight: .bold), color: .white))
        stack.addArrangedSubview(makeLabel(text: "Choose the category, add a patient reference if needed, and submit the upload without dropping back into browser-style portal tools.", font: .systemFont(ofSize: 16, weight: .regular), color: UIColor.white.withAlphaComponent(0.92)))

        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeFormCard() -> UIView {
        let container = UIView()
        container.backgroundColor = .white
        container.layer.cornerRadius = 24

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = UIEdgeInsets(top: 20, left: 18, bottom: 20, right: 18)
        stack.isLayoutMarginsRelativeArrangement = true

        stack.addArrangedSubview(makeLabel(text: "Upload Details", font: .systemFont(ofSize: 22, weight: .bold), color: primaryBlue))

        categoryField.placeholder = "Category (for example: EOB)"
        categoryField.text = categories.first
        configureTextField(categoryField)

        patientReferenceField.placeholder = "Patient reference"
        configureTextField(patientReferenceField)

        notesView.font = .systemFont(ofSize: 17, weight: .regular)
        notesView.textColor = primaryBlue
        notesView.backgroundColor = UIColor(red: 248 / 255, green: 250 / 255, blue: 253 / 255, alpha: 1)
        notesView.layer.cornerRadius = 18
        notesView.textContainerInset = UIEdgeInsets(top: 14, left: 12, bottom: 14, right: 12)
        notesView.heightAnchor.constraint(equalToConstant: 120).isActive = true

        let filesCard = UIView()
        filesCard.backgroundColor = UIColor(red: 248 / 255, green: 250 / 255, blue: 253 / 255, alpha: 1)
        filesCard.layer.cornerRadius = 18

        let filesStack = UIStackView()
        filesStack.axis = .vertical
        filesStack.spacing = 12
        filesStack.translatesAutoresizingMaskIntoConstraints = false
        filesStack.layoutMargins = UIEdgeInsets(top: 16, left: 14, bottom: 16, right: 14)
        filesStack.isLayoutMarginsRelativeArrangement = true

        selectedFilesLabel.font = .systemFont(ofSize: 15, weight: .medium)
        selectedFilesLabel.textColor = secondaryText
        selectedFilesLabel.numberOfLines = 0

        configureActionButton(addPhotosButton, title: "Add Photos", background: primaryBlue, action: #selector(handleAddPhotos))
        configureActionButton(addFilesButton, title: "Browse Files", background: UIColor(red: 70 / 255, green: 96 / 255, blue: 143 / 255, alpha: 1), action: #selector(handleBrowseFiles))
        configureActionButton(submitButton, title: "Submit Upload", background: accentTeal, action: #selector(handleSubmit))

        filesStack.addArrangedSubview(selectedFilesLabel)
        filesStack.addArrangedSubview(addPhotosButton)
        filesStack.addArrangedSubview(addFilesButton)
        filesStack.addArrangedSubview(submitButton)
        filesCard.addSubview(filesStack)

        NSLayoutConstraint.activate([
            filesStack.topAnchor.constraint(equalTo: filesCard.topAnchor),
            filesStack.leadingAnchor.constraint(equalTo: filesCard.leadingAnchor),
            filesStack.trailingAnchor.constraint(equalTo: filesCard.trailingAnchor),
            filesStack.bottomAnchor.constraint(equalTo: filesCard.bottomAnchor),
        ])

        stack.addArrangedSubview(categoryField)
        stack.addArrangedSubview(patientReferenceField)
        stack.addArrangedSubview(notesView)
        stack.addArrangedSubview(filesCard)
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func configureTextField(_ field: UITextField) {
        field.borderStyle = .none
        field.backgroundColor = UIColor(red: 248 / 255, green: 250 / 255, blue: 253 / 255, alpha: 1)
        field.layer.cornerRadius = 18
        field.textColor = primaryBlue
        field.font = .systemFont(ofSize: 17, weight: .semibold)
        field.autocapitalizationType = .words
        field.autocorrectionType = .no
        field.clearButtonMode = .whileEditing
        field.heightAnchor.constraint(equalToConstant: 58).isActive = true

        let paddingView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 58))
        field.leftView = paddingView
        field.leftViewMode = .always
        field.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 58))
        field.rightViewMode = .always
    }

    private func configureActionButton(_ button: UIButton, title: String, background: UIColor, action: Selector) {
        button.setTitle(title, for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = background
        button.layer.cornerRadius = 14
        button.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        button.contentEdgeInsets = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
        button.addTarget(self, action: action, for: .touchUpInside)
    }

    private func configureKeyboardHandling() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKeyboard(notification:)),
            name: UIResponder.keyboardWillChangeFrameNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKeyboard(notification:)),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }

    @objc private func handleKeyboard(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let keyboardFrame = userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
              let duration = userInfo[UIResponder.keyboardAnimationDurationUserInfoKey] as? TimeInterval
        else {
            return
        }

        let convertedFrame = view.convert(keyboardFrame, from: nil)
        let overlap = max(0, view.bounds.maxY - convertedFrame.minY - view.safeAreaInsets.bottom)
        let bottomInset = notification.name == UIResponder.keyboardWillHideNotification ? 0 : overlap + 20

        UIView.animate(withDuration: duration) {
            self.scrollView.contentInset.bottom = bottomInset
            self.scrollView.verticalScrollIndicatorInsets.bottom = bottomInset
        }
    }

    private func renderSelectedFiles() {
        if selectedFiles.isEmpty {
            selectedFilesLabel.text = "No files selected yet. Add photos or choose files to continue."
        } else {
            selectedFilesLabel.text = selectedFiles
                .map { "• \($0.fileName)" }
                .joined(separator: "\n")
        }
    }

    @objc private func handleAddPhotos() {
        var configuration = PHPickerConfiguration(photoLibrary: .shared())
        configuration.selectionLimit = 0
        configuration.filter = .images
        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = self
        present(picker, animated: true)
    }

    @objc private func handleBrowseFiles() {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [
            .pdf, .image, .plainText, .rtf, .data, .item
        ], asCopy: true)
        picker.allowsMultipleSelection = true
        picker.delegate = self
        present(picker, animated: true)
    }

    @objc private func handleSubmit() {
        guard let session = ClientSessionStore.load() else {
            navigationController?.setViewControllers([ClientLoginViewController()], animated: true)
            return
        }

        if selectedFiles.isEmpty {
            showStatus("Please add at least one file before submitting.", isError: true)
            return
        }

        setSubmitting(true)

        Task { [weak self] in
            guard let self else { return }

            do {
                try await ClientAPI.shared.uploadDocuments(
                    accessToken: session.accessToken,
                    category: (categoryField.text?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? categoryField.text! : "EOB"),
                    patientReference: patientReferenceField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "",
                    notes: notesView.text.trimmingCharacters(in: .whitespacesAndNewlines),
                    files: selectedFiles
                )

                await MainActor.run {
                    self.setSubmitting(false)
                    ClientSessionStore.markRefreshRequired()
                    self.showStatus("Upload saved successfully.", isError: false)
                    self.selectedFiles = []
                    self.patientReferenceField.text = ""
                    self.notesView.text = ""
                    self.categoryField.text = "EOB"
                }
            } catch {
                await MainActor.run {
                    self.setSubmitting(false)
                    self.showStatus(error.localizedDescription, isError: true)
                }
            }
        }
    }

    private func setSubmitting(_ submitting: Bool) {
        submitButton.isEnabled = !submitting
        submitButton.alpha = submitting ? 0.7 : 1
        submitButton.setTitle(submitting ? "Submitting..." : "Submit Upload", for: .normal)
    }

    private func showStatus(_ message: String, isError: Bool) {
        statusLabel.text = message
        statusLabel.textColor = isError ? UIColor(red: 176 / 255, green: 48 / 255, blue: 48 / 255, alpha: 1) : accentTeal
        statusLabel.isHidden = false
    }

    private func makeLabel(text: String, font: UIFont, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = font
        label.textColor = color
        label.numberOfLines = 0
        return label
    }
}

extension ClientUploadComposerViewController: PHPickerViewControllerDelegate {
    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)
        guard !results.isEmpty else { return }

        Task { [weak self] in
            guard let self else { return }
            var loadedFiles: [ClientUploadDraft] = []

            for (index, result) in results.enumerated() {
                if let data = try? await result.itemProvider.loadImageData() {
                    loadedFiles.append(
                        ClientUploadDraft(
                            fileName: "photo-\(Int(Date().timeIntervalSince1970))-\(index).jpg",
                            mimeType: "image/jpeg",
                            data: data
                        )
                    )
                }
            }

            await MainActor.run {
                self.selectedFiles.append(contentsOf: loadedFiles)
            }
        }
    }
}

private extension NSItemProvider {
    func loadImageData() async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            loadDataRepresentation(forTypeIdentifier: UTType.image.identifier) { data, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                if let data {
                    continuation.resume(returning: data)
                } else {
                    continuation.resume(throwing: NSError(domain: "AmeryMedClientUpload", code: -1))
                }
            }
        }
    }
}

extension ClientUploadComposerViewController: UIDocumentPickerDelegate {
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard !urls.isEmpty else { return }

        var newFiles: [ClientUploadDraft] = []

        for url in urls {
            let scoped = url.startAccessingSecurityScopedResource()
            defer {
                if scoped {
                    url.stopAccessingSecurityScopedResource()
                }
            }

            guard let data = try? Data(contentsOf: url) else { continue }
            let mimeType = (try? url.resourceValues(forKeys: [.contentTypeKey]).contentType?.preferredMIMEType)
                ?? "application/octet-stream"
            newFiles.append(
                ClientUploadDraft(
                    fileName: url.lastPathComponent,
                    mimeType: mimeType,
                    data: data
                )
            )
        }

        selectedFiles.append(contentsOf: newFiles)
    }
}
