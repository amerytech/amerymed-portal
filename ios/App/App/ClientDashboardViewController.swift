import UIKit

final class ClientDashboardViewController: UIViewController {
    private let primaryBlue = UIColor(red: 18 / 255, green: 60 / 255, blue: 122 / 255, alpha: 1)
    private let accentTeal = UIColor(red: 15 / 255, green: 118 / 255, blue: 110 / 255, alpha: 1)
    private let pageBackground = UIColor(red: 244 / 255, green: 248 / 255, blue: 252 / 255, alpha: 1)
    private let secondaryText = UIColor(red: 86 / 255, green: 102 / 255, blue: 125 / 255, alpha: 1)

    private var summary: ClientDashboardSummary
    private let refreshButton = UIButton(type: .system)
    private let signOutButton = UIButton(type: .system)
    private let feedbackLabel = UILabel()
    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()

    init(summary: ClientDashboardSummary) {
        self.summary = summary
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Dashboard"
        view.backgroundColor = pageBackground
        navigationItem.largeTitleDisplayMode = .always
        configureLayout()
        renderSummary()
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
    }

    private func renderSummary() {
        contentStack.arrangedSubviews.forEach { view in
            contentStack.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        contentStack.addArrangedSubview(makeHeroCard())
        contentStack.addArrangedSubview(makeStatusCard())
        contentStack.addArrangedSubview(makeDetailCard(title: "Signed in as", value: summary.userEmail))
        contentStack.addArrangedSubview(makeDetailCard(title: "Clinic", value: summary.clinicName))
        contentStack.addArrangedSubview(makeDetailCard(title: "Account Name", value: summary.displayName))
        contentStack.addArrangedSubview(makeDetailCard(title: "Provider Details", value: "NPI: \(summary.providerNpi.isEmpty ? "Not provided" : summary.providerNpi)"))
        contentStack.addArrangedSubview(makeDetailCard(title: "Address / Contact", value: [summary.providerAddress, summary.providerContactEmail].filter { !$0.isEmpty }.joined(separator: "\n")))
        contentStack.addArrangedSubview(makeActionsCard())

        feedbackLabel.font = .systemFont(ofSize: 14, weight: .regular)
        feedbackLabel.textColor = UIColor(red: 176 / 255, green: 48 / 255, blue: 48 / 255, alpha: 1)
        feedbackLabel.numberOfLines = 0
        feedbackLabel.isHidden = true
        contentStack.addArrangedSubview(feedbackLabel)
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

        let eyebrow = makeLabel(
            text: "AMERYMED CLIENT PORTAL",
            font: .systemFont(ofSize: 13, weight: .semibold),
            color: UIColor.white.withAlphaComponent(0.86)
        )
        let title = makeLabel(
            text: "Welcome to \(summary.displayName), \(summary.clinicName).",
            font: .systemFont(ofSize: 30, weight: .bold),
            color: .white
        )
        let body = makeLabel(
            text: "Review uploads for \(summary.displayName), \(summary.clinicName), send new billing documents, and keep every file tied to the right patient reference and clinic workflow.",
            font: .systemFont(ofSize: 16, weight: .regular),
            color: UIColor.white.withAlphaComponent(0.92)
        )

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

    private func makeStatusCard() -> UIView {
        let container = UIView()
        container.backgroundColor = .white
        container.layer.cornerRadius = 24

        let wrapper = UIStackView()
        wrapper.axis = .vertical
        wrapper.spacing = 14
        wrapper.translatesAutoresizingMaskIntoConstraints = false
        wrapper.layoutMargins = UIEdgeInsets(top: 20, left: 18, bottom: 20, right: 18)
        wrapper.isLayoutMarginsRelativeArrangement = true

        wrapper.addArrangedSubview(makeLabel(text: "Status Snapshot", font: .systemFont(ofSize: 22, weight: .bold), color: primaryBlue))

        let grid = UIStackView()
        grid.axis = .vertical
        grid.spacing = 12

        let topRow = UIStackView()
        topRow.axis = .horizontal
        topRow.distribution = .fillEqually
        topRow.spacing = 12

        let bottomRow = UIStackView()
        bottomRow.axis = .horizontal
        bottomRow.distribution = .fillEqually
        bottomRow.spacing = 12

        topRow.addArrangedSubview(makeStatTile(title: "Total Uploads", value: "\(summary.totalUploads)", accent: primaryBlue))
        topRow.addArrangedSubview(makeStatTile(title: "Received", value: "\(summary.receivedCount)", accent: accentTeal))
        bottomRow.addArrangedSubview(makeStatTile(title: "In Review", value: "\(summary.inReviewCount)", accent: UIColor(red: 180 / 255, green: 91 / 255, blue: 17 / 255, alpha: 1)))
        bottomRow.addArrangedSubview(makeStatTile(title: "Processed", value: "\(summary.processedCount)", accent: UIColor(red: 25 / 255, green: 135 / 255, blue: 84 / 255, alpha: 1)))

        grid.addArrangedSubview(topRow)
        grid.addArrangedSubview(bottomRow)
        wrapper.addArrangedSubview(grid)
        container.addSubview(wrapper)

        NSLayoutConstraint.activate([
            wrapper.topAnchor.constraint(equalTo: container.topAnchor),
            wrapper.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            wrapper.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            wrapper.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeStatTile(title: String, value: String, accent: UIColor) -> UIView {
        let container = UIView()
        container.backgroundColor = UIColor(red: 248 / 255, green: 250 / 255, blue: 253 / 255, alpha: 1)
        container.layer.cornerRadius = 18

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = UIEdgeInsets(top: 16, left: 14, bottom: 16, right: 14)
        stack.isLayoutMarginsRelativeArrangement = true

        let titleLabel = makeLabel(text: title.uppercased(), font: .systemFont(ofSize: 12, weight: .semibold), color: secondaryText)
        let valueLabel = makeLabel(text: value, font: .systemFont(ofSize: 30, weight: .bold), color: accent)

        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(valueLabel)
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeDetailCard(title: String, value: String) -> UIView {
        let container = UIView()
        container.backgroundColor = .white
        container.layer.cornerRadius = 24

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = UIEdgeInsets(top: 20, left: 18, bottom: 20, right: 18)
        stack.isLayoutMarginsRelativeArrangement = true

        let titleLabel = makeLabel(text: title.uppercased(), font: .systemFont(ofSize: 13, weight: .semibold), color: secondaryText)
        let valueLabel = makeLabel(
            text: value.isEmpty ? "Not provided" : value,
            font: .systemFont(ofSize: 18, weight: .semibold),
            color: primaryBlue
        )

        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(valueLabel)
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeActionsCard() -> UIView {
        let container = UIView()
        container.backgroundColor = .white
        container.layer.cornerRadius = 24

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.layoutMargins = UIEdgeInsets(top: 20, left: 18, bottom: 20, right: 18)
        stack.isLayoutMarginsRelativeArrangement = true

        let title = makeLabel(
            text: "Native Next Steps",
            font: .systemFont(ofSize: 22, weight: .bold),
            color: primaryBlue
        )
        let body = makeLabel(
            text: "This shell keeps sign-in and the initial account overview inside the app. Next we can add native upload, native history, and native messaging so Apple sees a complete app-first workflow.",
            font: .systemFont(ofSize: 15, weight: .regular),
            color: secondaryText
        )

        refreshButton.setTitle("Refresh Summary", for: .normal)
        refreshButton.setTitleColor(.white, for: .normal)
        refreshButton.backgroundColor = accentTeal
        refreshButton.layer.cornerRadius = 14
        refreshButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        refreshButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
        refreshButton.addTarget(self, action: #selector(handleRefresh), for: .touchUpInside)

        signOutButton.setTitle("Sign Out", for: .normal)
        signOutButton.setTitleColor(primaryBlue, for: .normal)
        signOutButton.backgroundColor = UIColor(red: 238 / 255, green: 243 / 255, blue: 251 / 255, alpha: 1)
        signOutButton.layer.cornerRadius = 14
        signOutButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        signOutButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 16)
        signOutButton.addTarget(self, action: #selector(handleSignOut), for: .touchUpInside)

        stack.addArrangedSubview(title)
        stack.addArrangedSubview(body)
        stack.addArrangedSubview(refreshButton)
        stack.addArrangedSubview(signOutButton)
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    private func makeLabel(text: String, font: UIFont, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = font
        label.textColor = color
        label.numberOfLines = 0
        return label
    }

    @objc private func handleRefresh() {
        guard let session = ClientSessionStore.load() else {
            handleSignOut()
            return
        }

        setRefreshing(true)

        Task { [weak self] in
            guard let self else { return }

            do {
                let updatedSummary = try await ClientAPI.shared.refreshSummary(accessToken: session.accessToken)
                let updatedSession = ClientSession(
                    accessToken: session.accessToken,
                    refreshToken: session.refreshToken,
                    summary: updatedSummary
                )
                ClientSessionStore.save(updatedSession)

                await MainActor.run {
                    self.summary = updatedSummary
                    self.feedbackLabel.isHidden = true
                    self.setRefreshing(false)
                    self.renderSummary()
                }
            } catch {
                await MainActor.run {
                    self.setRefreshing(false)
                    self.feedbackLabel.text = error.localizedDescription
                    self.feedbackLabel.isHidden = false
                }
            }
        }
    }

    @objc private func handleSignOut() {
        ClientSessionStore.clear()
        navigationController?.setViewControllers([ClientLoginViewController()], animated: true)
    }

    private func setRefreshing(_ refreshing: Bool) {
        refreshButton.isEnabled = !refreshing
        refreshButton.alpha = refreshing ? 0.7 : 1
        refreshButton.setTitle(refreshing ? "Refreshing..." : "Refresh Summary", for: .normal)
    }
}
