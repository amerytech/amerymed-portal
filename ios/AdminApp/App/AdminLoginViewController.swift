import UIKit

final class AdminLoginViewController: UIViewController, UITextFieldDelegate {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let accentTeal = UIColor(red: 15 / 255, green: 118 / 255, blue: 110 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)

    private let emailField = UITextField()
    private let passwordField = UITextField()
    private let signInButton = UIButton(type: .system)
    private let feedbackLabel = UILabel()
    private let spinner = UIActivityIndicatorView(style: .medium)
    private let scrollView = UIScrollView()
    private var keyboardObservers: [NSObjectProtocol] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "AmeryMed Admin"
        view.backgroundColor = pageBackground
        navigationItem.largeTitleDisplayMode = .always
        configureNavigationAppearance()
        configureLayout()
        registerForKeyboardNotifications()
    }

    deinit {
        keyboardObservers.forEach(NotificationCenter.default.removeObserver)
    }

    private func configureLayout() {
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true
        scrollView.keyboardDismissMode = .interactive

        let contentStack = UIStackView()
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
        contentStack.addArrangedSubview(makeLoginCard())
        contentStack.addArrangedSubview(makeInfoCard())
    }

    private func makeHeroCard() -> UIView {
        let container = UIView()
        container.backgroundColor = primaryBlue
        container.layer.cornerRadius = 28

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = UIEdgeInsets(top: 24, left: 20, bottom: 24, right: 20)
        stack.isLayoutMarginsRelativeArrangement = true

        stack.addArrangedSubview(makeLabel(text: "INTERNAL OPERATIONS", font: .systemFont(ofSize: 13, weight: .semibold), color: UIColor.white.withAlphaComponent(0.86)))
        stack.addArrangedSubview(makeLabel(text: "Review intake, triage uploads, and keep billing work moving.", font: .systemFont(ofSize: 30, weight: .bold), color: .white))
        stack.addArrangedSubview(makeLabel(text: "Use your authorized staff account to review client submissions, update processing status, preview documents, and track operational activity from a native admin workspace.", font: .systemFont(ofSize: 16, weight: .regular), color: UIColor.white.withAlphaComponent(0.92)))
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeLoginCard() -> UIView {
        let container = UIView()
        container.backgroundColor = .white
        container.layer.cornerRadius = 24
        container.layer.shadowColor = UIColor.black.withAlphaComponent(0.06).cgColor
        container.layer.shadowOpacity = 1
        container.layer.shadowRadius = 14
        container.layer.shadowOffset = CGSize(width: 0, height: 8)

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = UIEdgeInsets(top: 20, left: 18, bottom: 20, right: 18)
        stack.isLayoutMarginsRelativeArrangement = true

        stack.addArrangedSubview(makeLabel(text: "Secure Staff Sign-In", font: .systemFont(ofSize: 22, weight: .bold), color: primaryBlue))
        stack.addArrangedSubview(makeLabel(text: "Open the AmeryMed admin workspace with staff credentials.", font: .systemFont(ofSize: 15, weight: .regular), color: secondaryText))

        configureField(emailField, placeholder: "Enter admin email", keyboard: .emailAddress, secure: false)
        configureField(passwordField, placeholder: "Enter password", keyboard: .default, secure: true)
        emailField.returnKeyType = .next
        passwordField.returnKeyType = .go
        emailField.delegate = self
        passwordField.delegate = self

        signInButton.setTitle("Enter Admin Workspace", for: .normal)
        signInButton.setTitleColor(.white, for: .normal)
        signInButton.backgroundColor = accentTeal
        signInButton.layer.cornerRadius = 14
        signInButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        signInButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
        signInButton.addTarget(self, action: #selector(handleSignIn), for: .touchUpInside)

        feedbackLabel.font = .systemFont(ofSize: 14, weight: .regular)
        feedbackLabel.textColor = UIColor(red: 176 / 255, green: 48 / 255, blue: 48 / 255, alpha: 1)
        feedbackLabel.numberOfLines = 0
        feedbackLabel.isHidden = true
        spinner.hidesWhenStopped = true

        let buttonRow = UIStackView(arrangedSubviews: [signInButton, spinner])
        buttonRow.axis = .horizontal
        buttonRow.spacing = 12
        buttonRow.alignment = .center

        stack.addArrangedSubview(emailField)
        stack.addArrangedSubview(passwordField)
        stack.addArrangedSubview(buttonRow)
        stack.addArrangedSubview(feedbackLabel)
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            emailField.heightAnchor.constraint(equalToConstant: 52),
            passwordField.heightAnchor.constraint(equalToConstant: 52),
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeInfoCard() -> UIView {
        let container = UIView()
        container.backgroundColor = .white
        container.layer.cornerRadius = 24

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = UIEdgeInsets(top: 20, left: 18, bottom: 20, right: 18)
        stack.isLayoutMarginsRelativeArrangement = true
        stack.addArrangedSubview(makeLabel(text: "Admin workflow", font: .systemFont(ofSize: 21, weight: .bold), color: primaryBlue))
        stack.addArrangedSubview(makeLabel(text: "After signing in, staff can review submitted documents, move work from received to in review or processed, and keep upload status visible to client offices.", font: .systemFont(ofSize: 15, weight: .regular), color: secondaryText))
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func configureField(_ field: UITextField, placeholder: String, keyboard: UIKeyboardType, secure: Bool) {
        field.placeholder = placeholder
        field.keyboardType = keyboard
        field.autocapitalizationType = .none
        field.autocorrectionType = .no
        field.textContentType = secure ? .password : .username
        field.isSecureTextEntry = secure
        field.borderStyle = .none
        field.backgroundColor = UIColor(red: 248 / 255, green: 250 / 255, blue: 253 / 255, alpha: 1)
        field.layer.cornerRadius = 14
        field.layer.borderWidth = 1
        field.layer.borderColor = UIColor(red: 224 / 255, green: 231 / 255, blue: 241 / 255, alpha: 1).cgColor
        field.font = .systemFont(ofSize: 16, weight: .medium)
        field.textColor = primaryBlue
        field.tintColor = primaryBlue
        field.attributedPlaceholder = NSAttributedString(string: placeholder, attributes: [.foregroundColor: secondaryText.withAlphaComponent(0.72)])
        let paddingView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 10))
        field.leftView = paddingView
        field.leftViewMode = .always
    }

    @objc private func handleSignIn() {
        let email = (emailField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let password = passwordField.text ?? ""

        guard !email.isEmpty, !password.isEmpty else {
            showFeedback("Enter your admin email and password.")
            return
        }

        setLoading(true)
        showFeedback("")

        Task { [weak self] in
            guard let self else { return }
            do {
                let session = try await AdminAPI.shared.login(email: email, password: password)
                AdminSessionStore.save(session)
                await MainActor.run {
                    self.setLoading(false)
                    self.navigationController?.setViewControllers([AdminDashboardViewController(dashboard: session.dashboard)], animated: true)
                }
            } catch {
                await MainActor.run {
                    self.setLoading(false)
                    self.showFeedback(error.localizedDescription)
                }
            }
        }
    }

    private func setLoading(_ loading: Bool) {
        signInButton.isEnabled = !loading
        emailField.isEnabled = !loading
        passwordField.isEnabled = !loading
        loading ? spinner.startAnimating() : spinner.stopAnimating()
        signInButton.alpha = loading ? 0.7 : 1
    }

    private func showFeedback(_ message: String) {
        feedbackLabel.text = message
        feedbackLabel.isHidden = message.isEmpty
    }

    private func makeLabel(text: String, font: UIFont, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = font
        label.textColor = color
        label.numberOfLines = 0
        return label
    }

    private func configureNavigationAppearance() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = pageBackground
        appearance.titleTextAttributes = [.foregroundColor: primaryBlue]
        appearance.largeTitleTextAttributes = [.foregroundColor: primaryBlue]
        navigationController?.navigationBar.standardAppearance = appearance
        navigationController?.navigationBar.scrollEdgeAppearance = appearance
    }

    private func registerForKeyboardNotifications() {
        let center = NotificationCenter.default
        keyboardObservers.append(center.addObserver(forName: UIResponder.keyboardWillChangeFrameNotification, object: nil, queue: .main) { [weak self] notification in
            self?.adjustForKeyboard(notification: notification)
        })
        keyboardObservers.append(center.addObserver(forName: UIResponder.keyboardWillHideNotification, object: nil, queue: .main) { [weak self] _ in
            self?.scrollView.contentInset.bottom = 0
            self?.scrollView.verticalScrollIndicatorInsets.bottom = 0
        })
    }

    private func adjustForKeyboard(notification: Notification) {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        let convertedFrame = view.convert(frame, from: nil)
        let overlap = max(0, view.bounds.maxY - convertedFrame.minY)
        scrollView.contentInset.bottom = overlap + 18
        scrollView.verticalScrollIndicatorInsets.bottom = overlap + 18
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField === emailField {
            passwordField.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
            handleSignIn()
        }
        return true
    }
}
