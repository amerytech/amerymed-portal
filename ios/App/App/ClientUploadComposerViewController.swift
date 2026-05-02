import PhotosUI
import UIKit
import UniformTypeIdentifiers

private enum ClientUploadCategory: String, CaseIterable {
    case eob = "EOB"
    case era = "ERA"
    case faceSheet = "FaceSheet"
    case insuranceCard = "InsuranceCard"
    case claims = "Claims"
    case other = "Other"

    var displayName: String {
        switch self {
        case .eob:
            return "EOB"
        case .era:
            return "ERA"
        case .faceSheet:
            return "Face Sheet"
        case .insuranceCard:
            return "Insurance ID"
        case .claims:
            return "Claims"
        case .other:
            return "Other Documents"
        }
    }

    var mobileHint: String {
        switch self {
        case .eob:
            return "Use for explanation of benefits and payer response packets."
        case .era:
            return "Use for remittance details or ERA printouts."
        case .faceSheet:
            return "Use for patient demographics or intake cover sheets."
        case .insuranceCard:
            return "Use for front and back insurance card images."
        case .claims:
            return "Use for claim packets, corrected claim pages, or claim support."
        case .other:
            return "Use for any supporting billing documents that do not match the options above."
        }
    }
}

private enum ClientCapturePreset: String, CaseIterable {
    case general
    case insuranceFront
    case insuranceBack
    case packet

    var title: String {
        switch self {
        case .general:
            return "General document"
        case .insuranceFront:
            return "Insurance front"
        case .insuranceBack:
            return "Insurance back"
        case .packet:
            return "Multi-page packet"
        }
    }

    var buttonTitle: String {
        switch self {
        case .general:
            return "General"
        case .insuranceFront:
            return "Insurance Front"
        case .insuranceBack:
            return "Insurance Back"
        case .packet:
            return "Packet"
        }
    }
}

final class ClientUploadComposerViewController: UIViewController {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let accentTeal = UIColor(red: 15 / 255, green: 118 / 255, blue: 110 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)
    private let subtleBackground = UIColor(red: 248 / 255, green: 250 / 255, blue: 253 / 255, alpha: 1)

    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private let categoryField = UITextField()
    private let patientReferenceField = UITextField()
    private let notesView = UITextView()
    private let categoryHintLabel = UILabel()
    private let selectedFilesSummaryLabel = UILabel()
    private let selectedFilesListStack = UIStackView()
    private let checklistStack = UIStackView()
    private let statusLabel = UILabel()
    private let duplicateWarningLabel = UILabel()
    private let submitButton = UIButton(type: .system)
    private let clearFilesButton = UIButton(type: .system)
    private let addPhotosButton = UIButton(type: .system)
    private let addFilesButton = UIButton(type: .system)

    private let mobileCameraInputAccessory = UIToolbar()
    private let categoryPicker = UIPickerView()
    private var activeInputView: UIView?
    private var capturePresetButtons: [UIButton] = []

    private var selectedCategory: ClientUploadCategory = .eob {
        didSet {
            categoryField.text = selectedCategory.displayName
            categoryHintLabel.text = selectedCategory.mobileHint
            if let row = ClientUploadCategory.allCases.firstIndex(of: selectedCategory) {
                categoryPicker.selectRow(row, inComponent: 0, animated: false)
            }
        }
    }

    private var selectedPreset: ClientCapturePreset = .general {
        didSet {
            switch selectedPreset {
            case .insuranceFront, .insuranceBack:
                selectedCategory = .insuranceCard
            case .general:
                if selectedCategory == .insuranceCard {
                    selectedCategory = .eob
                }
            case .packet:
                break
            }
            renderPresetState()
            renderChecklist()
        }
    }

    private var selectedFiles: [ClientUploadDraft] = [] {
        didSet { renderSelectedFiles() }
    }
    private var existingUploads: [ClientUploadRecord] = [] {
        didSet { renderSelectedFiles() }
    }

    private var duplicateMatches: [ClientUploadRecord] {
        guard !existingUploads.isEmpty else { return [] }

        let normalizedCategory = selectedCategory.rawValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedPatientReference = patientReferenceField.text?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased() ?? ""
        let normalizedFileNames = selectedFiles
            .map { normalizedFileName($0.fileName) }
            .filter { !$0.isEmpty }

        return existingUploads.filter { item in
            let sameFileName =
                !normalizedFileNames.isEmpty &&
                normalizedFileNames.contains(normalizedFileName(item.fileName))
            let sameCategory = (item.category ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == normalizedCategory
            let samePatientReference = (item.patientReference ?? "")
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .lowercased() == normalizedPatientReference

            return sameFileName || (!normalizedPatientReference.isEmpty && sameCategory && samePatientReference)
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Upload Documents"
        view.backgroundColor = pageBackground
        navigationItem.largeTitleDisplayMode = .always
        configureLayout()
        configureKeyboardHandling()
        configureCategoryPicker()
        renderPresetState()
        renderChecklist()
        renderSelectedFiles()
        Task { [weak self] in
            await self?.loadExistingUploads()
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    private func configureLayout() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true
        scrollView.keyboardDismissMode = .interactive

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
        statusLabel.numberOfLines = 0
        statusLabel.isHidden = true

        duplicateWarningLabel.font = .systemFont(ofSize: 14, weight: .semibold)
        duplicateWarningLabel.numberOfLines = 0
        duplicateWarningLabel.textColor = UIColor(red: 176 / 255, green: 48 / 255, blue: 48 / 255, alpha: 1)
        duplicateWarningLabel.isHidden = true
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
        stack.addArrangedSubview(makeLabel(text: "Send the same billing documents you use on the web portal.", font: .systemFont(ofSize: 30, weight: .bold), color: .white))
        stack.addArrangedSubview(makeLabel(text: "Choose the right document type, add the patient reference, and capture insurance front/back cards or multi-page packets directly inside the app.", font: .systemFont(ofSize: 16, weight: .regular), color: UIColor.white.withAlphaComponent(0.92)))

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
        stack.addArrangedSubview(makeLabel(text: "Document Type", font: .systemFont(ofSize: 15, weight: .semibold), color: secondaryText))

        categoryField.placeholder = "Choose a document type"
        configureTextField(categoryField)
        categoryField.tintColor = .clear
        categoryField.inputView = categoryPicker
        categoryField.delegate = self
        stack.addArrangedSubview(categoryField)

        categoryHintLabel.font = .systemFont(ofSize: 14, weight: .regular)
        categoryHintLabel.textColor = secondaryText
        categoryHintLabel.numberOfLines = 0
        stack.addArrangedSubview(categoryHintLabel)

        let presetTitle = makeLabel(text: "Quick Capture Presets", font: .systemFont(ofSize: 15, weight: .semibold), color: secondaryText)
        stack.addArrangedSubview(presetTitle)
        stack.addArrangedSubview(makePresetRow())
        stack.addArrangedSubview(makeChecklistCard())

        stack.addArrangedSubview(makeLabel(text: "Patient Reference", font: .systemFont(ofSize: 15, weight: .semibold), color: secondaryText))
        patientReferenceField.placeholder = "Example: Jane Doe / DOS 04-11-2026"
        configureTextField(patientReferenceField)
        patientReferenceField.autocapitalizationType = .words
        patientReferenceField.returnKeyType = .next
        patientReferenceField.delegate = self
        patientReferenceField.addTarget(self, action: #selector(handleFormFieldChanged), for: .editingChanged)
        stack.addArrangedSubview(patientReferenceField)

        stack.addArrangedSubview(makeLabel(text: "Notes", font: .systemFont(ofSize: 15, weight: .semibold), color: secondaryText))
        notesView.font = .systemFont(ofSize: 17, weight: .regular)
        notesView.textColor = primaryBlue
        notesView.backgroundColor = subtleBackground
        notesView.layer.cornerRadius = 18
        notesView.textContainerInset = UIEdgeInsets(top: 14, left: 12, bottom: 14, right: 12)
        notesView.heightAnchor.constraint(equalToConstant: 120).isActive = true
        notesView.delegate = self
        stack.addArrangedSubview(notesView)

        stack.addArrangedSubview(makeFilesCard())
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        selectedCategory = .eob
        categoryPicker.selectRow(0, inComponent: 0, animated: false)
        return container
    }

    private func makePresetRow() -> UIView {
        let container = UIView()

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false

        var currentRow: UIStackView?

        for (index, preset) in ClientCapturePreset.allCases.enumerated() {
            if index % 2 == 0 {
                currentRow = UIStackView()
                currentRow?.axis = .horizontal
                currentRow?.distribution = .fillEqually
                currentRow?.spacing = 10
                if let currentRow {
                    stack.addArrangedSubview(currentRow)
                }
            }

            let button = UIButton(type: .system)
            button.setTitle(preset.buttonTitle, for: .normal)
            button.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
            button.layer.cornerRadius = 14
            button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
            button.tag = index
            button.addTarget(self, action: #selector(handlePresetButton(_:)), for: .touchUpInside)
            capturePresetButtons.append(button)
            currentRow?.addArrangedSubview(button)
        }

        if let lastRow = currentRow, lastRow.arrangedSubviews.count == 1 {
            lastRow.addArrangedSubview(UIView())
        }

        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeChecklistCard() -> UIView {
        let container = UIView()
        container.backgroundColor = subtleBackground
        container.layer.cornerRadius = 18

        checklistStack.axis = .vertical
        checklistStack.spacing = 8
        checklistStack.translatesAutoresizingMaskIntoConstraints = false
        checklistStack.layoutMargins = UIEdgeInsets(top: 16, left: 14, bottom: 16, right: 14)
        checklistStack.isLayoutMarginsRelativeArrangement = true

        container.addSubview(checklistStack)
        NSLayoutConstraint.activate([
            checklistStack.topAnchor.constraint(equalTo: container.topAnchor),
            checklistStack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            checklistStack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            checklistStack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeFilesCard() -> UIView {
        let filesCard = UIView()
        filesCard.backgroundColor = subtleBackground
        filesCard.layer.cornerRadius = 18

        let filesStack = UIStackView()
        filesStack.axis = .vertical
        filesStack.spacing = 12
        filesStack.translatesAutoresizingMaskIntoConstraints = false
        filesStack.layoutMargins = UIEdgeInsets(top: 16, left: 14, bottom: 16, right: 14)
        filesStack.isLayoutMarginsRelativeArrangement = true

        filesStack.addArrangedSubview(makeLabel(text: "Upload Documents", font: .systemFont(ofSize: 15, weight: .semibold), color: secondaryText))

        let hintLabel = makeLabel(
            text: "Add photos for cards or page captures, or browse files for PDFs and other document formats. Multiple files stay grouped in one submission.",
            font: .systemFont(ofSize: 14, weight: .regular),
            color: secondaryText
        )
        filesStack.addArrangedSubview(hintLabel)

        let actionsRow = UIStackView()
        actionsRow.axis = .horizontal
        actionsRow.spacing = 10
        actionsRow.distribution = .fillEqually

        configureActionButton(addPhotosButton, title: "Add Photo", background: primaryBlue, action: #selector(handleAddPhotos))
        configureActionButton(addFilesButton, title: "Browse Files", background: UIColor(red: 70 / 255, green: 96 / 255, blue: 143 / 255, alpha: 1), action: #selector(handleBrowseFiles))

        actionsRow.addArrangedSubview(addPhotosButton)
        actionsRow.addArrangedSubview(addFilesButton)
        filesStack.addArrangedSubview(actionsRow)

        let selectedHeader = UIStackView()
        selectedHeader.axis = .horizontal
        selectedHeader.alignment = .center
        selectedHeader.spacing = 12

        selectedFilesSummaryLabel.font = .systemFont(ofSize: 15, weight: .medium)
        selectedFilesSummaryLabel.textColor = secondaryText
        selectedFilesSummaryLabel.numberOfLines = 0

        clearFilesButton.setTitle("Clear all", for: .normal)
        clearFilesButton.setTitleColor(primaryBlue, for: .normal)
        clearFilesButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .semibold)
        clearFilesButton.addTarget(self, action: #selector(handleClearFiles), for: .touchUpInside)

        selectedHeader.addArrangedSubview(selectedFilesSummaryLabel)
        selectedHeader.addArrangedSubview(clearFilesButton)
        filesStack.addArrangedSubview(selectedHeader)

        selectedFilesListStack.axis = .vertical
        selectedFilesListStack.spacing = 10
        filesStack.addArrangedSubview(selectedFilesListStack)
        filesStack.addArrangedSubview(duplicateWarningLabel)

        configureActionButton(submitButton, title: "Upload Document", background: accentTeal, action: #selector(handleSubmit))
        filesStack.addArrangedSubview(submitButton)

        filesCard.addSubview(filesStack)
        NSLayoutConstraint.activate([
            filesStack.topAnchor.constraint(equalTo: filesCard.topAnchor),
            filesStack.leadingAnchor.constraint(equalTo: filesCard.leadingAnchor),
            filesStack.trailingAnchor.constraint(equalTo: filesCard.trailingAnchor),
            filesStack.bottomAnchor.constraint(equalTo: filesCard.bottomAnchor),
        ])

        return filesCard
    }

    private func configureTextField(_ field: UITextField) {
        field.borderStyle = .none
        field.backgroundColor = subtleBackground
        field.layer.cornerRadius = 18
        field.textColor = primaryBlue
        field.font = .systemFont(ofSize: 17, weight: .semibold)
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

    private func configureCategoryPicker() {
        categoryPicker.dataSource = self
        categoryPicker.delegate = self

        let toolbar = UIToolbar()
        toolbar.sizeToFit()
        toolbar.items = [
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
            UIBarButtonItem(title: "Done", style: .done, target: self, action: #selector(handleCategoryDone)),
        ]
        categoryField.inputAccessoryView = toolbar

        notesView.inputAccessoryView = makeDoneToolbar(action: #selector(handleDismissKeyboard))
        patientReferenceField.inputAccessoryView = makeDoneToolbar(action: #selector(handleDismissKeyboard))
    }

    private func makeDoneToolbar(action: Selector) -> UIToolbar {
        let toolbar = UIToolbar()
        toolbar.sizeToFit()
        toolbar.items = [
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
            UIBarButtonItem(title: "Done", style: .done, target: self, action: action),
        ]
        return toolbar
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

        if notification.name != UIResponder.keyboardWillHideNotification {
            scrollActiveInputIntoView()
        }
    }

    private func scrollActiveInputIntoView() {
        guard let activeInputView else { return }
        let targetFrame = activeInputView.convert(activeInputView.bounds, to: scrollView)
        scrollView.scrollRectToVisible(targetFrame.insetBy(dx: 0, dy: -24), animated: true)
    }

    private func renderPresetState() {
        for (index, button) in capturePresetButtons.enumerated() {
            let preset = ClientCapturePreset.allCases[index]
            let active = preset == selectedPreset
            button.backgroundColor = active ? primaryBlue : UIColor(red: 233 / 255, green: 240 / 255, blue: 251 / 255, alpha: 1)
            button.setTitleColor(active ? .white : primaryBlue, for: .normal)
            button.layer.borderWidth = active ? 0 : 1
            button.layer.borderColor = UIColor(red: 189 / 255, green: 204 / 255, blue: 230 / 255, alpha: 1).cgColor
        }
    }

    private func renderChecklist() {
        checklistStack.arrangedSubviews.forEach { view in
            checklistStack.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        let checklistTitle = makeLabel(
            text: selectedPreset.title,
            font: .systemFont(ofSize: 15, weight: .semibold),
            color: primaryBlue
        )
        checklistStack.addArrangedSubview(checklistTitle)

        for item in checklistItems(for: selectedPreset) {
            let label = makeLabel(
                text: "• \(item)",
                font: .systemFont(ofSize: 14, weight: .regular),
                color: secondaryText
            )
            checklistStack.addArrangedSubview(label)
        }
    }

    private func checklistItems(for preset: ClientCapturePreset) -> [String] {
        switch preset {
        case .insuranceFront:
            return [
                "Place the front of the insurance card on a dark surface.",
                "Keep the payer logo and member ID fully inside the frame.",
                "Avoid flash glare across the plastic card."
            ]
        case .insuranceBack:
            return [
                "Capture the full back of the card including phone and claims details.",
                "Hold the phone directly above the card so text stays sharp.",
                "Add a patient reference if the card belongs to a dependent."
            ]
        case .packet:
            return [
                "Add every page before submitting so the billing team sees one grouped packet.",
                "Flatten each page before taking the next photo to reduce blur.",
                "Use notes for DOS or claim reference if the file names are generic."
            ]
        case .general:
            return [
                "Use the rear camera for the clearest document images.",
                "Good lighting and a dark background improve readability.",
                "Choose the matching document type before uploading."
            ]
        }
    }

    private func renderSelectedFiles() {
        selectedFilesListStack.arrangedSubviews.forEach { view in
            selectedFilesListStack.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        clearFilesButton.isHidden = selectedFiles.isEmpty
        duplicateWarningLabel.isHidden = true
        duplicateWarningLabel.text = nil

        if selectedFiles.isEmpty {
            selectedFilesSummaryLabel.text = "No files chosen yet."
            let placeholder = makeLabel(
                text: "Select one or more files before tapping Upload Document.",
                font: .systemFont(ofSize: 14, weight: .regular),
                color: secondaryText
            )
            selectedFilesListStack.addArrangedSubview(placeholder)
            return
        }

        selectedFilesSummaryLabel.text = "\(selectedFiles.count) file\(selectedFiles.count == 1 ? "" : "s") ready"

        for (index, file) in selectedFiles.enumerated() {
            let row = UIView()
            row.backgroundColor = .white
            row.layer.cornerRadius = 14

            let stack = UIStackView()
            stack.axis = .horizontal
            stack.alignment = .top
            stack.spacing = 10
            stack.translatesAutoresizingMaskIntoConstraints = false
            stack.layoutMargins = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
            stack.isLayoutMarginsRelativeArrangement = true

            let copyStack = UIStackView()
            copyStack.axis = .vertical
            copyStack.spacing = 4

            let nameLabel = makeLabel(text: file.fileName, font: .systemFont(ofSize: 15, weight: .semibold), color: primaryBlue)
            let metaLabel = makeLabel(text: "\(file.mimeType) • \(formattedFileSize(file.data.count))", font: .systemFont(ofSize: 13, weight: .regular), color: secondaryText)
            copyStack.addArrangedSubview(nameLabel)
            copyStack.addArrangedSubview(metaLabel)

            let removeButton = UIButton(type: .system)
            removeButton.setTitle("Remove", for: .normal)
            removeButton.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold)
            removeButton.setTitleColor(primaryBlue, for: .normal)
            removeButton.tag = index
            removeButton.addTarget(self, action: #selector(handleRemoveFile(_:)), for: .touchUpInside)

            stack.addArrangedSubview(copyStack)
            stack.addArrangedSubview(removeButton)
            row.addSubview(stack)

            NSLayoutConstraint.activate([
                stack.topAnchor.constraint(equalTo: row.topAnchor),
                stack.leadingAnchor.constraint(equalTo: row.leadingAnchor),
                stack.trailingAnchor.constraint(equalTo: row.trailingAnchor),
                stack.bottomAnchor.constraint(equalTo: row.bottomAnchor),
            ])

            selectedFilesListStack.addArrangedSubview(row)
        }

        if !duplicateMatches.isEmpty {
            let fileList = duplicateMatches
                .prefix(3)
                .map(\.fileName)
                .joined(separator: ", ")
            duplicateWarningLabel.text =
                "Possible duplicate detected. Matching upload(s): \(fileList). Remove the duplicate or change the patient reference before submitting."
            duplicateWarningLabel.isHidden = false
        }
    }

    @objc private func handlePresetButton(_ sender: UIButton) {
        guard sender.tag < ClientCapturePreset.allCases.count else { return }
        selectedPreset = ClientCapturePreset.allCases[sender.tag]
    }

    @objc private func handleCategoryDone() {
        categoryField.resignFirstResponder()
    }

    @objc private func handleDismissKeyboard() {
        view.endEditing(true)
    }

    @objc private func handleClearFiles() {
        selectedFiles = []
    }

    @objc private func handleRemoveFile(_ sender: UIButton) {
        guard sender.tag < selectedFiles.count else { return }
        selectedFiles.remove(at: sender.tag)
    }

    @objc private func handleFormFieldChanged() {
        renderSelectedFiles()
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
        let picker = UIDocumentPickerViewController(
            forOpeningContentTypes: [.pdf, .image, .plainText, .rtf, .commaSeparatedText, .data, .item],
            asCopy: true
        )
        picker.allowsMultipleSelection = true
        picker.delegate = self
        present(picker, animated: true)
    }

    @objc private func handleSubmit() {
        guard let session = ClientSessionStore.load() else {
            navigationController?.setViewControllers([ClientLoginViewController()], animated: true)
            return
        }

        let patientReference = patientReferenceField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let notes = notesView.text.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !selectedFiles.isEmpty else {
            showStatus("Please add at least one file before submitting.", isError: true)
            return
        }

        setSubmitting(true)
        showStatus("", isError: false)

        Task { [weak self] in
            guard let self else { return }

            do {
                await self.loadExistingUploads()

                guard !patientReference.isEmpty else {
                    await MainActor.run {
                        self.setSubmitting(false)
                        self.showStatus("Patient reference is required before uploading any document.", isError: true)
                    }
                    return
                }

                guard !self.duplicateMatches.isEmpty else {
                    try await ClientAPI.shared.uploadDocuments(
                        accessToken: session.accessToken,
                        category: self.selectedCategory.rawValue,
                        patientReference: patientReference,
                        notes: notes,
                        files: self.selectedFiles
                    )

                    await MainActor.run {
                        self.setSubmitting(false)
                        ClientSessionStore.markRefreshRequired()
                        self.showStatus(
                            self.selectedFiles.count == 1
                                ? "Upload saved successfully."
                                : "\(self.selectedFiles.count) files saved successfully.",
                            isError: false
                        )
                        self.selectedFiles = []
                        self.patientReferenceField.text = ""
                        self.notesView.text = ""
                        self.selectedCategory = .eob
                        self.selectedPreset = .general
                        self.view.endEditing(true)
                        Task { [weak self] in
                            await self?.loadExistingUploads()
                        }
                    }
                    return
                }

                await MainActor.run {
                    self.setSubmitting(false)
                    self.showStatus(
                        "A similar upload already exists. Remove the duplicate file or change the patient reference before submitting.",
                        isError: true
                    )
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
        submitButton.setTitle(submitting ? "Uploading..." : "Upload Document", for: .normal)
    }

    @MainActor
    private func loadExistingUploads() async {
        guard let session = ClientSessionStore.load() else { return }

        do {
            existingUploads = try await ClientAPI.shared.fetchUploadHistory(accessToken: session.accessToken)
        } catch {
            existingUploads = []
        }
    }

    private func showStatus(_ message: String, isError: Bool) {
        statusLabel.text = message
        statusLabel.textColor = isError ? UIColor(red: 176 / 255, green: 48 / 255, blue: 48 / 255, alpha: 1) : accentTeal
        statusLabel.isHidden = message.isEmpty
    }

    private func formattedFileSize(_ bytes: Int) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(bytes))
    }

    private func normalizedFileName(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
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

extension ClientUploadComposerViewController: UITextFieldDelegate {
    func textFieldShouldBeginEditing(_ textField: UITextField) -> Bool {
        activeInputView = textField
        return true
    }

    func textFieldDidBeginEditing(_ textField: UITextField) {
        activeInputView = textField
        scrollActiveInputIntoView()
    }

    func textFieldDidEndEditing(_ textField: UITextField) {
        renderSelectedFiles()
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField === patientReferenceField {
            notesView.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
        }
        return true
    }
}

extension ClientUploadComposerViewController: UITextViewDelegate {
    func textViewDidBeginEditing(_ textView: UITextView) {
        activeInputView = textView
        scrollActiveInputIntoView()
    }

    func textViewDidEndEditing(_ textView: UITextView) {
        renderSelectedFiles()
    }
}

extension ClientUploadComposerViewController: UIPickerViewDataSource, UIPickerViewDelegate {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        1
    }

    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        ClientUploadCategory.allCases.count
    }

    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        ClientUploadCategory.allCases[row].displayName
    }

    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        selectedCategory = ClientUploadCategory.allCases[row]
        renderSelectedFiles()
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
                            fileName: "photo-\(Int(Date().timeIntervalSince1970))-\(index + self.selectedFiles.count).jpg",
                            mimeType: "image/jpeg",
                            data: data
                        )
                    )
                }
            }

            await MainActor.run {
                self.selectedFiles.append(contentsOf: loadedFiles)
                self.showStatus("", isError: false)
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
        showStatus("", isError: false)
    }
}
