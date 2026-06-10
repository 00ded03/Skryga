// DashboardView.swift
// Skryga — Main dashboard screen

import SwiftUI
import SwiftData
import Charts

struct DashboardView: View {

    // MARK: - Data

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Transaction.date, order: .reverse) private var allTransactions: [Transaction]
    @Query private var familyMembers: [FamilyMember]

    // MARK: - State

    @State private var showAddTransaction = false
    @State private var showAllTransactions = false

    // MARK: - Computed helpers

    private var now: Date { Date() }

    private var monthTransactions: [Transaction] {
        let cal = Calendar.current
        return allTransactions.filter {
            cal.isDate($0.date, equalTo: now, toGranularity: .month)
        }
    }

    private var totalIncome: Double {
        monthTransactions.filter { $0.type == "income" }.reduce(0) { $0 + $1.amount }
    }

    private var totalExpenses: Double {
        monthTransactions.filter { $0.type == "expense" }.reduce(0) { $0 + $1.amount }
    }

    private var balance: Double { totalIncome - totalExpenses }

    private var recentTransactions: [Transaction] {
        Array(allTransactions.prefix(5))
    }

    private var husbandName: String {
        familyMembers.first(where: { $0.role == "husband" })?.name ?? "Муж"
    }
    private var wifeName: String {
        familyMembers.first(where: { $0.role == "wife" })?.name ?? "Жена"
    }
    private var husbandEmoji: String {
        familyMembers.first(where: { $0.role == "husband" })?.emoji ?? "👨"
    }
    private var wifeEmoji: String {
        familyMembers.first(where: { $0.role == "wife" })?.emoji ?? "👩"
    }

    // Daily balances for chart
    private var dailyData: [(day: Int, balance: Double)] {
        let cal = Calendar.current
        guard let range = cal.range(of: .day, in: .month, for: now) else { return [] }
        let today = cal.component(.day, from: now)
        return (1...today).map { day in
            var comps = cal.dateComponents([.year, .month], from: now)
            comps.day = day
            guard let dayDate = cal.date(from: comps) else { return (day, 0) }
            let dayTxns = allTransactions.filter { cal.isDate($0.date, inSameDayAs: dayDate) }
            let inc = dayTxns.filter { $0.type == "income" }.reduce(0) { $0 + $1.amount }
            let exp = dayTxns.filter { $0.type == "expense" }.reduce(0) { $0 + $1.amount }
            return (day, inc - exp)
        }
    }

    // Running cumulative balance
    private var cumulativeData: [(day: Int, balance: Double)] {
        var running = 0.0
        return dailyData.map { entry in
            running += entry.balance
            return (entry.day, running)
        }
    }

    // Top expense category this month
    private var topExpenseCategory: String {
        let expenses = monthTransactions.filter { $0.type == "expense" }
        guard !expenses.isEmpty else { return "—" }
        let grouped = Dictionary(grouping: expenses, by: { $0.categoryKey })
        let top = grouped.max(by: { a, b in
            a.value.reduce(0) { $0 + $1.amount } < b.value.reduce(0) { $0 + $1.amount }
        })
        if let key = top?.key {
            return CategoryData.category(forKey: key)?.name ?? key
        }
        return "—"
    }

    // Month-over-month savings comparison
    private var lastMonthExpenses: Double {
        let cal = Calendar.current
        guard let lastMonth = cal.date(byAdding: .month, value: -1, to: now) else { return 0 }
        return allTransactions.filter {
            $0.type == "expense" &&
            cal.isDate($0.date, equalTo: lastMonth, toGranularity: .month)
        }.reduce(0) { $0 + $1.amount }
    }

    private var savedVsLastMonth: Double { lastMonthExpenses - totalExpenses }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                ScrollView {
                    VStack(spacing: 20) {
                        headerSection
                        summaryCardsSection
                        monthlyChartSection
                        recentTransactionsSection
                        quickStatsSection
                        Spacer(minLength: 80)
                    }
                    .padding(.bottom, 16)
                }
                .background(AppTheme.backgroundLight.ignoresSafeArea())
                .navigationBarHidden(true)

                // FAB
                Button {
                    showAddTransaction = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 56, height: 56)
                        .background(AppTheme.primaryBlue)
                        .clipShape(Circle())
                        .shadow(color: AppTheme.primaryBlue.opacity(0.4), radius: 10, x: 0, y: 4)
                }
                .padding(.trailing, 20)
                .padding(.bottom, 24)
            }
        }
        .sheet(isPresented: $showAddTransaction) {
            AddTransactionView()
        }
        .sheet(isPresented: $showAllTransactions) {
            TransactionsView()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        ZStack(alignment: .bottom) {
            LinearGradient(
                colors: [AppTheme.primaryBlue, Color(hex: "#7B5CF0")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea(edges: .top)
            .frame(height: 180)

            VStack(spacing: 0) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(greetingText())
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                        Text(formattedDate())
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.8))
                    }
                    Spacer()
                    // Avatar circles
                    HStack(spacing: 8) {
                        avatarCircle(emoji: husbandEmoji, color: AppTheme.primaryBlue, name: husbandName)
                        avatarCircle(emoji: wifeEmoji, color: Color(hex: "#7B5CF0"), name: wifeName)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 24)
            }
        }
        .frame(height: 160)
    }

    private func avatarCircle(emoji: String, color: Color, name: String) -> some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(.white.opacity(0.2))
                    .frame(width: 44, height: 44)
                Text(emoji)
                    .font(.title2)
            }
            .overlay(
                Circle()
                    .stroke(.white.opacity(0.5), lineWidth: 2)
            )
            Text(name)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.85))
        }
    }

    // MARK: - Summary Cards

    private var summaryCardsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                summaryCard(
                    title: "Доходы",
                    amount: totalIncome,
                    isIncome: true,
                    accentColor: AppTheme.incomeGreen,
                    icon: "arrow.down.circle.fill"
                )
                summaryCard(
                    title: "Расходы",
                    amount: totalExpenses,
                    isIncome: false,
                    accentColor: AppTheme.expenseRed,
                    icon: "arrow.up.circle.fill"
                )
                summaryCard(
                    title: "Баланс",
                    amount: balance,
                    isIncome: balance >= 0,
                    accentColor: AppTheme.primaryBlue,
                    icon: "scalemass.fill"
                )
            }
            .padding(.horizontal, 20)
        }
    }

    private func summaryCard(title: String, amount: Double, isIncome: Bool, accentColor: Color, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(accentColor)
                Spacer()
                Text(monthAbbrev())
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Text(title)
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
            Text(AppTheme.formatCurrency(abs(amount)))
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(AppTheme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(16)
        .frame(width: 160)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(accentColor.opacity(0.25), lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
    }

    // MARK: - Monthly Chart

    private var monthlyChartSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Баланс за месяц")
            if cumulativeData.isEmpty {
                Text("Нет данных за текущий месяц")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, minHeight: 120, alignment: .center)
            } else {
                Chart {
                    ForEach(cumulativeData, id: \.day) { entry in
                        AreaMark(
                            x: .value("День", entry.day),
                            y: .value("Баланс", entry.balance)
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [AppTheme.primaryBlue.opacity(0.3), AppTheme.primaryBlue.opacity(0.0)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        LineMark(
                            x: .value("День", entry.day),
                            y: .value("Баланс", entry.balance)
                        )
                        .foregroundStyle(AppTheme.primaryBlue)
                        .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: 5)) { value in
                        AxisValueLabel {
                            if let day = value.as(Int.self) {
                                Text("\(day)")
                                    .font(.caption2)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        AxisGridLine(stroke: StrokeStyle(dash: [4, 4]))
                            .foregroundStyle(Color.gray.opacity(0.2))
                    }
                }
                .chartYAxis {
                    AxisMarks { value in
                        AxisValueLabel {
                            if let v = value.as(Double.self) {
                                Text("₪\(Int(v / 1000))к")
                                    .font(.caption2)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        AxisGridLine(stroke: StrokeStyle(dash: [4, 4]))
                            .foregroundStyle(Color.gray.opacity(0.2))
                    }
                }
                .frame(height: 160)
            }
        }
        .skrygaCard()
        .padding(.horizontal, 20)
    }

    // MARK: - Recent Transactions

    private var recentTransactionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Последние операции", actionTitle: "Все →") {
                showAllTransactions = true
            }
            if recentTransactions.isEmpty {
                EmptyStateView(
                    systemName: "doc.text",
                    title: "Нет транзакций",
                    message: "Добавьте первую транзакцию, нажав +",
                    actionTitle: "Добавить",
                    action: { showAddTransaction = true }
                )
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(recentTransactions.enumerated()), id: \.element.id) { idx, txn in
                        transactionRow(txn)
                        if idx < recentTransactions.count - 1 {
                            Divider().padding(.leading, 52)
                        }
                    }
                }
            }
        }
        .skrygaCard()
        .padding(.horizontal, 20)
    }

    private func transactionRow(_ txn: Transaction) -> some View {
        let isIncome = txn.type == "income"
        let cat = CategoryData.category(forKey: txn.categoryKey)
        let icon = cat?.iconName ?? (isIncome ? "arrow.down.circle" : "creditcard")
        let color = isIncome ? AppTheme.incomeGreen : AppTheme.expenseRed

        return HStack(spacing: 12) {
            CategoryIcon(systemName: icon, color: color, size: 38)
            VStack(alignment: .leading, spacing: 2) {
                Text(txn.title.isEmpty ? (cat?.name ?? "Операция") : txn.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.textPrimary)
                    .lineLimit(1)
                HStack(spacing: 4) {
                    if let subName = CategoryData.subcategoryName(categoryKey: txn.categoryKey, subcategoryKey: txn.subcategoryKey) {
                        Text(subName)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    if txn.isFamily {
                        Text("·")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        Text("Семья")
                            .font(.caption)
                            .foregroundStyle(AppTheme.primaryBlue)
                    }
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                AmountText(amount: txn.amount, isIncome: isIncome, font: .subheadline, showSign: true)
                Text(txn.date, style: .time)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding(.vertical, 8)
    }

    // MARK: - Quick Stats

    private var quickStatsSection: some View {
        HStack(spacing: 12) {
            StatCard(
                title: "Топ расход",
                value: topExpenseCategory,
                subtitle: "за этот месяц",
                accentColor: AppTheme.expenseRed
            )
            StatCard(
                title: "Сэкономлено",
                value: AppTheme.formatCurrency(abs(savedVsLastMonth)),
                subtitle: savedVsLastMonth >= 0 ? "меньше прошлого" : "больше прошлого",
                trend: lastMonthExpenses > 0 ? (savedVsLastMonth / lastMonthExpenses * 100) : nil,
                accentColor: AppTheme.incomeGreen
            )
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Helpers

    private func greetingText() -> String {
        let hour = Calendar.current.component(.hour, from: now)
        let base: String
        switch hour {
        case 5..<12: base = "Доброе утро"
        case 12..<17: base = "Добрый день"
        case 17..<22: base = "Добрый вечер"
        default: base = "Доброй ночи"
        }
        return "\(base), \(husbandName)!"
    }

    private func formattedDate() -> String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "ru_RU")
        fmt.dateFormat = "d MMMM yyyy"
        return fmt.string(from: now)
    }

    private func monthAbbrev() -> String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "ru_RU")
        fmt.dateFormat = "MMM"
        return fmt.string(from: now).capitalized
    }
}

// MARK: - Color hex extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    DashboardView()
        .modelContainer(for: [Transaction.self, FamilyMember.self], inMemory: true)
}
