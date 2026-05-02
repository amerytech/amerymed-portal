import UIKit

final class ClientLoginViewController: UIViewController, UITextFieldDelegate {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let accentTeal = UIColor(red: 15 / 255, green: 118 / 255, blue: 110 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)
    private let fieldBackground = UIColor(red: 248 / 255, green: 250 / 255, blue: 253 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)

    private let emailField = UITextField()
    private let passwordField = UITextField()
    private let signInButton = UIButton(type: .system)
    private let feedbackLabel = UILabel()
    private let spinner = UIActivityIndicatorView(style: .medium)
    private let scrollView = UIScrollView()
    private let brandImageView = UIImageView(image: UIImage(named: "AMedLogo"))
    private var keyboardObservers: [NSObjectProtocol] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "AmeryMed"
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

        brandImageView.translatesAutoresizingMaskIntoConstraints = false
        brandImageView.contentMode = .scaleAspectFit
        brandImageView.clipsToBounds = true
        brandImageView.layer.cornerRadius = 16
        brandImageView.layer.borderWidth = 1
        brandImageView.layer.borderColor = UIColor.white.withAlphaComponent(0.16).cgColor
        brandImageView.heightAnchor.constraint(equalToConstant: 72).isActive = true
        brandImageView.widthAnchor.constraint(equalToConstant: 76).isActive = true

        let eyebrow = makeLabel(
            text: "CLIENT ACCESS",
            font: .systemFont(ofSize: 13, weight: .semibold),
            color: UIColor.white.withAlphaComponent(0.86)
        )
        let title = makeLabel(
            text: "Sign in natively, then review document status from an app-first dashboard.",
            font: .systemFont(ofSize: 30, weight: .bold),
            color: .white
        )

        let body = makeLabel(
            text: "This version keeps sign-in, status snapshots, and account context inside the iPhone app before you open any extended portal tools.",
            font: .systemFont(ofSize: 16, weight: .regular),
            color: UIColor.white.withAlphaComponent(0.92)
        )

        let logoRow = UIStackView(arrangedSubviews: [brandImageView, UIView()])
        logoRow.axis = .horizontal
        logoRow.alignment = .center
        logoRow.spacing = 12
        stack.addArrangedSubview(logoRow)
        stack.addArrangedSubview(eyebrow)
        stack.addArrangedSubview(title)
        stack.addArrangedSubview(body)
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

        let titleLabel = makeLabel(
            text: "Secure Sign-In",
            font: .systemFont(ofSize: 22, weight: .bold),
            color: primaryBlue
        )
        let bodyLabel = makeLabel(
            text: "Use your client credentials to open the AmeryMed app workspace and review your latest billing-document activity.",
            font: .systemFont(ofSize: 15, weight: .regular),
            color: secondaryText
        )

        configureField(emailField, placeholder: "qa.client@amerytechnet.com", keyboard: .emailAddress, secure: false)
        configureField(passwordField, placeholder: "Enter your password", keyboard: .default, secure: true)

        emailField.text = "qa.client@amerytechnet.com"
        emailField.returnKeyType = .next
        passwordField.returnKeyType = .go
        emailField.delegate = self
        passwordField.delegate = self

        signInButton.setTitle("Continue Securely", for: .normal)
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

        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(bodyLabel)
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

        let title = makeLabel(
            text: "What happens next",
            font: .systemFont(ofSize: 21, weight: .bold),
            color: primaryBlue
        )

        let body = makeLabel(
            text: "After sign-in, the app loads your native dashboard summary first: total uploads, current status counts, clinic details, and provider information. We can layer native upload and messaging next without dropping you into browser-style chrome.",
            font: .systemFont(ofSize: 15, weight: .regular),
            color: secondaryText
        )

        stack.addArrangedSubview(title)
        stack.addArrangedSubview(body)
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
        field.backgroundColor = fieldBackground
        field.layer.cornerRadius = 14
        field.layer.borderWidth = 1
        field.layer.borderColor = UIColor(red: 224 / 255, green: 231 / 255, blue: 241 / 255, alpha: 1).cgColor
        field.font = .systemFont(ofSize: 16, weight: .medium)
        field.textColor = primaryBlue
        field.tintColor = primaryBlue
        field.attributedPlaceholder = NSAttributedString(
            string: placeholder,
            attributes: [.foregroundColor: secondaryText.withAlphaComponent(0.72)]
        )
        field.delegate = self

        let paddingView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 10))
        field.leftView = paddingView
        field.leftViewMode = .always
        field.rightView = paddingView
        field.rightViewMode = .always
    }

    private func configureNavigationAppearance() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = pageBackground
        appearance.shadowColor = .clear
        appearance.titleTextAttributes = [.foregroundColor: primaryBlue]
        appearance.largeTitleTextAttributes = [.foregroundColor: primaryBlue]

        navigationController?.navigationBar.standardAppearance = appearance
        navigationController?.navigationBar.scrollEdgeAppearance = appearance
        navigationController?.navigationBar.compactAppearance = appearance
        navigationController?.navigationBar.tintColor = primaryBlue
    }

    private func makeLabel(text: String, font: UIFont, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = font
        label.textColor = color
        label.numberOfLines = 0
        return label
    }

    @objc private func handleSignIn() {
        guard let email = emailField.text?.trimmingCharacters(in: .whitespacesAndNewlines), !email.isEmpty,
              let password = passwordField.text, !password.isEmpty else {
            showFeedback("Enter your email and password to continue.")
            return
        }

        setLoading(true)
        hideFeedback()

        Task { [weak self] in
            guard let self else { return }

            do {
                let session = try await ClientAPI.shared.login(email: email, password: password)
                ClientSessionStore.save(session)

                await MainActor.run {
                    let dashboard = ClientDashboardViewController(summary: session.summary)
                    self.navigationController?.setViewControllers([dashboard], animated: true)
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
        if loading {
            spinner.startAnimating()
        } else {
            spinner.stopAnimating()
        }

        signInButton.isEnabled = !loading
        signInButton.alpha = loading ? 0.7 : 1
        emailField.isEnabled = !loading
        passwordField.isEnabled = !loading
    }

    private func showFeedback(_ message: String) {
        feedbackLabel.text = message
        feedbackLabel.isHidden = false
    }

    private func hideFeedback() {
        feedbackLabel.text = nil
        feedbackLabel.isHidden = true
    }

    private func registerForKeyboardNotifications() {
        let center = NotificationCenter.default

        let willChange = center.addObserver(
            forName: UIResponder.keyboardWillChangeFrameNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in
            self?.handleKeyboard(notification: note)
        }

        let willHide = center.addObserver(
            forName: UIResponder.keyboardWillHideNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.resetKeyboardInsets()
        }

        keyboardObservers = [willChange, willHide]
    }

    private func handleKeyboard(notification: Notification) {
        guard
            let info = notification.userInfo,
            let frameValue = info[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue
        else {
            return
        }

        let keyboardFrame = view.convert(frameValue.cgRectValue, from: nil)
        let overlap = max(0, view.bounds.maxY - keyboardFrame.minY - view.safeAreaInsets.bottom)
        let bottomInset = overlap + 24

        scrollView.contentInset.bottom = bottomInset
        scrollView.verticalScrollIndicatorInsets.bottom = bottomInset

        if let activeField = [emailField, passwordField].first(where: \.isFirstResponder) {
            let fieldFrame = activeField.convert(activeField.bounds, to: scrollView)
            scrollView.scrollRectToVisible(fieldFrame.insetBy(dx: 0, dy: -24), animated: true)
        }
    }

    private func resetKeyboardInsets() {
        scrollView.contentInset.bottom = 0
        scrollView.verticalScrollIndicatorInsets.bottom = 0
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField === emailField {
            passwordField.becomeFirstResponder()
            return false
        }

        if textField === passwordField {
            textField.resignFirstResponder()
            handleSignIn()
            return false
        }

        return true
    }
}
