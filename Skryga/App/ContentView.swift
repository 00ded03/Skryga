// ContentView.swift
// Skryga — Root tab view with custom tab bar

import SwiftUI

// MARK: - Tab Definition

enum AppTab: Int, CaseIterable {
    case home
    case transactions
    case analytics
    case savings
    case settings

    var title: String {
        switch self {
        case .home:         return "Главная"
        case .transactions: return "Транзакции"
        case .analytics:    return "Аналитика"
        case .savings:      return "Накопления"
        case .settings:     return "Настройки"
        }
    }

    var icon: String {
        switch self {
        case .home:         return "house.fill"
        case .transactions: return "list.bullet"
        case .analytics:    return "chart.bar.fill"
        case .savings:      return "star.fill"
        case .settings:     return "gearshape.fill"
        }
    }
}

// MARK: - Content View

struct ContentView: View {

    @State private var selectedTab: AppTab = .home
    @State private var showAddTransaction = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Tab pages — rendered without the system tab bar chrome
            TabView(selection: $selectedTab) {
                HomeView()
                    .tag(AppTab.home)

                TransactionsView()
                    .tag(AppTab.transactions)

                AnalyticsView()
                    .tag(AppTab.analytics)

                SavingsView()
                    .tag(AppTab.savings)

                SettingsView()
                    .tag(AppTab.settings)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // Custom tab bar overlaid at the bottom
            CustomTabBar(
                selectedTab: $selectedTab,
                showAddTransaction: $showAddTransaction
            )
        }
        .ignoresSafeArea(.keyboard)
        .sheet(isPresented: $showAddTransaction) {
            AddTransactionView()
        }
    }
}

// MARK: - Custom Tab Bar

private struct CustomTabBar: View {

    @Binding var selectedTab: AppTab
    @Binding var showAddTransaction: Bool

    var body: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases, id: \.self) { tab in
                if tab == .analytics {
                    // Centre floating-action button replaces the analytics tab item
                    Spacer()
                    AddButton(action: { showAddTransaction = true })
                    Spacer()
                } else {
                    TabBarItem(
                        tab: tab,
                        isSelected: selectedTab == tab,
                        action: { selectedTab = tab }
                    )
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 12)
        .padding(.bottom, max(safeAreaBottomInset, 16))
        .background(
            Rectangle()
                .fill(.white)
                .shadow(
                    color: .black.opacity(0.08),
                    radius: 20,
                    x: 0,
                    y: -4
                )
                .ignoresSafeArea()
        )
    }

    private var safeAreaBottomInset: CGFloat {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?
            .windows
            .first(where: \.isKeyWindow)?
            .safeAreaInsets
            .bottom ?? 0
    }
}

// MARK: - Tab Bar Item

private struct TabBarItem: View {

    let tab: AppTab
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: tab.icon)
                    .font(.system(size: 22, weight: isSelected ? .semibold : .regular))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(
                        isSelected
                            ? AppTheme.Colors.primaryBlue
                            : AppTheme.Colors.textSecondary
                    )
                    .scaleEffect(isSelected ? 1.1 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)

                Text(tab.title)
                    .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(
                        isSelected
                            ? AppTheme.Colors.primaryBlue
                            : AppTheme.Colors.textSecondary
                    )
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Add Button (Floating Action Button)

private struct AddButton: View {

    let action: () -> Void
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(AppTheme.Colors.primaryGradient)
                    .frame(width: 56, height: 56)
                    .shadow(
                        color: AppTheme.Colors.primaryBlue.opacity(0.4),
                        radius: 12,
                        x: 0,
                        y: 4
                    )

                Image(systemName: "plus")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .scaleEffect(isPressed ? 0.93 : 1.0)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    withAnimation(.spring(response: 0.2)) { isPressed = true }
                }
                .onEnded { _ in
                    withAnimation(.spring(response: 0.3)) { isPressed = false }
                }
        )
        .offset(y: -12)
    }
}

// MARK: - HomeView alias
// DashboardView (Views/Dashboard/DashboardView.swift) is the full implementation.
// TransactionsView  → Views/Transactions/TransactionsView.swift
// AnalyticsView     → Views/Analytics/AnalyticsView.swift
// SavingsView       → Views/Savings/SavingsView.swift
// SettingsView      → Views/Settings/SettingsView.swift
// AddTransactionView → Views/Transactions/AddTransactionView.swift

typealias HomeView = DashboardView

// MARK: - Preview

#Preview {
    ContentView()
}
