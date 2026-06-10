// AnalyticsView.swift
// Skryga — Analytics screen with charts, forecasts and category breakdowns

import SwiftUI
import SwiftData
import Charts

// MARK: - Period enum

enum AnalyticsPeriod: String, CaseIterable {
    case week  = "Неделя"
    case month = "Месяц"
    case three = "3 Месяца"
    case year  = "Год"

    var days: Int {
        switch self {
        case .week:  return 7
        case .month: return 30
        case .three: return 90
        case .year:  return 365
        }
    }
}

// MARK: - AnalyticsView

struct AnalyticsView: View {

    // MARK: - Data

    @Query(sort: \Transaction.date, order: .reverse) private var allTransactions: [Transaction]

    // MARK: - State

    @State private var period: AnalyticsPeriod = .month
    @State private var selectedCategoryKey: String? = nil

    // MARK: - Computed

    private var now: Date { Date() }

    private var periodTransactions: [Transaction] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -period.days, to: now) ?? now
        return allTransactions.filter { $0.date >= cutoff }
    }

    private var totalIncome: Double {
        periodTransactions.filter { $0.type == "income" }.reduce(0) { $0 + $1.amount }
    }
    private var totalExpenses: Double {
        periodTransactions.filter { $0.type == "expense" }.reduce(0) { $0 + $1.amount }
    }
    private var netBalance: Double { totalIncome - totalExpenses }

    // Category breakdown for donut chart
    private struct CategorySlice: Identifiable {
        let id: String
        let name: String
        let iconName: String
        let amount: Double
        let percentage: Double
        let color: Color
    }

    private var categorySlices: [CategorySlice] {
        let expenses = periodTransactions.filter { $0.type == "expense" }
        let total    = expenses.reduce(0) { $0 + $1.amount }
        guard total > 0 else { return [] }

        let grouped = Dictionary(grouping: expenses, by: { $0.categoryKey })
        let sliceColors: [Color] = [
            AppTheme.primaryBlue,
            Color(hex: "#7B5CF0"),
            Color(hex: "#FF453A"),
            Color(hex: "#FF9500"),
            Color(hex: "#30D158"),
            Color(hex: "#00C7BE"),
        ]

        return grouped
            .map { key, txns -> CategorySlice in
                let amt   = txns.reduce(0) { $0 + $1.amount }
                let cat   = CategoryData.category(forKey: key)
                let idx   = abs(key.hashValue) % sliceColors.count
                return CategorySlice(
                    id: key,
                    name: cat?.name ?? key,
                    iconName: cat?.iconName ?? "questionmark",
                    amount: amt,
                    percentage: amt / total * 100,
                    color: sliceColors[idx]
                )
            }
            .sorted { $0.amount > $1.amount }
    }

    // Monthly income/expense for the last 6 months (bar chart)
    private struct MonthlyBar: Identifiable {
        let id: String
        let label: String
        let income: Double
        let expense: Double
    }

    private static let shortMonthNames = [
        "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
        "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
    ]

    private var monthlyBars: [MonthlyBar] {
        let cal = Calendar.current
        return (-5...0).compactMap { offset -> MonthlyBar? in
            guard let monthDate = cal.date(byAdding: .month, value: offset, to: now) else { return nil }
            let m = cal.component(.month, from: monthDate)
            let y = cal.component(.year,  from: monthDate)
            let txns = allTransactions.filter {
                cal.component(.month, from: $0.date) == m &&
                cal.component(.year,  from: $0.date) == y
            }
            let inc = txns.filter { $0.type == "income" }.reduce(0) { $0 + $1.amount }
            let exp = txns.filter { $0.type == "expense" }.reduce(0) { $0 + $1.amount }
            return MonthlyBar(
                id: "\(y)-\(m)",
                label: Self.shortMonthNames[m - 1],
                income:  inc,
                expense: exp
            )
        }
    }

    // Forecasts
    private var last3MonthsExpAvg: Double {
        let cal = Calendar.current
        let totals: [Double] = (-3 ... -1).compactMap { offset in
            guard let d = cal.date(byAdding: .month, value: offset, to: now) else { return nil }
            let m = cal.component(.month, from: d)
            let y = cal.component(.year,  from: d)
            return allTransactions.filter {
                $0.type == "expense" &&
                cal.component(.month, from: $0.date) == m &&
                cal.component(.year,  from: $0.date) == y
            }.reduce(0) { $0 + $1.amount }
        }
        guard !totals.isEmpty else { return 0 }
        return totals.reduce(0, +) / Double(totals.count)
    }

    private var last3MonthsIncAvg: Double {
        let cal = Calendar.current
        let totals: [Double] = (-3 ... -1).compactMap { offset in
            guard let d = cal.date(byAdding: .month, value: offset, to: now) else { return nil }
            let m = cal.component(.month, from: d)
            let y = cal.component(.year,  from: d)
            return allTransactions.filter {
                $0.type == "income" &&
                cal.component(.month, from: $0.date) == m &&
                cal.component(.year,  from: $0.date) == y
            }.reduce(0) { $0 + $1.amount }
        }
        guard !totals.isEmpty else { return 0 }
        return totals.reduce(0, +) / Double(totals.count)
    }

    private var estimatedRemainingThisMonth: Double {
        let cal = Calendar.current
        guard let daysInMonth = cal.range(of: .day, in: .month, for: now)?.count else { return 0 }
        let dayOfMonth = cal.component(.day, from: now)
        guard dayOfMonth > 0, last3MonthsExpAvg > 0 else { return 0 }
        let dailyRate = last3MonthsExpAvg / Double(daysInMonth)
        return dailyRate * Double(daysInMonth - dayOfMonth)
    }

    // Top 5 expense categories
    private var topCategories: [(name: String, amount: Double, icon: String, percentage: Double)] {
        let total = categorySlices.reduce(0) { $0 + $1.amount }
        return Array(categorySlices.prefix(5)).map {
            ($0.name, $0.amount, $0.iconName, total > 0 ? $0.amount / total * 100 : 0)
        }
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    periodPicker
                        .padding(.horizontal, 20)
                        .padding(.top, 4)

                    summaryRow
                    expenseDonutSection
                    monthlyBarSection
                    forecastSection
                    topCategoriesSection

                    Spacer(minLength: 80)
                }
                .padding(.bottom, 16)
            }
            .background(AppTheme.backgroundLight.ignoresSafeArea())
            .navigationTitle("Аналитика")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Period Picker

    private var periodPicker: some View {
        Picker("Период", selection: $period) {
            ForEach(AnalyticsPeriod.allCases, id: \.self) { p in
                Text(p.rawValue).tag(p)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Summary Row

    private var summaryRow: some View {
        HStack(spacing: 10) {
            miniSummaryCard(title: "Доходы",  value: totalIncome,  color: AppTheme.incomeGreen)
            miniSummaryCard(title: "Расходы", value: totalExpenses, color: AppTheme.expenseRed)
            miniSummaryCard(title: "Баланс",  value: netBalance,   color: netBalance >= 0 ? AppTheme.primaryBlue : AppTheme.expenseRed)
        }
        .padding(.horizontal, 20)
    }

    private func miniSummaryCard(title: String, value: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
            Text(AppTheme.formatCurrency(abs(value)))
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(color)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(color.opacity(0.2), lineWidth: 1))
    }

    // MARK: - Expense Donut Chart

    private var expenseDonutSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(title: "Расходы по категориям")

            if categorySlices.isEmpty {
                EmptyStateView(
                    systemName: "chart.pie",
                    title: "Нет данных",
                    message: "Добавьте расходы, чтобы увидеть разбивку."
                )
            } else {
                // Donut chart
                Chart(categorySlices) { slice in
                    SectorMark(
                        angle: .value("Сумма", slice.amount),
                        innerRadius: .ratio(0.55),
                        angularInset: 2
                    )
                    .foregroundStyle(slice.color)
                    .opacity(selectedCategoryKey == nil || selectedCategoryKey == slice.id ? 1.0 : 0.35)
                }
                .frame(height: 220)
                .onTapGesture {
                    // tap on chart background clears selection
                    selectedCategoryKey = nil
                }

                // Legend
                VStack(spacing: 10) {
                    ForEach(categorySlices) { slice in
                        HStack(spacing: 10) {
                            CategoryIcon(systemName: slice.iconName, color: slice.color, size: 32)
                            Text(slice.name)
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.textPrimary)
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(AppTheme.formatCurrency(slice.amount))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text(String(format: "%.1f%%", slice.percentage))
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedCategoryKey = (selectedCategoryKey == slice.id) ? nil : slice.id
                            }
                        }
                        if slice.id != categorySlices.last?.id {
                            Divider().padding(.leading, 42)
                        }
                    }
                }
            }
        }
        .skrygaCard()
        .padding(.horizontal, 20)
    }

    // MARK: - Monthly Bar Chart

    private var monthlyBarSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(title: "Доходы и расходы")

            if monthlyBars.allSatisfy({ $0.income == 0 && $0.expense == 0 }) {
                Text("Нет данных за последние 6 месяцев")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 32)
            } else {
                Chart {
                    ForEach(monthlyBars) { bar in
                        BarMark(
                            x: .value("Месяц", bar.label),
                            y: .value("Доходы", bar.income),
                            width: .ratio(0.35)
                        )
                        .foregroundStyle(AppTheme.incomeGreen)
                        .position(by: .value("Тип", "Доходы"))
                        .cornerRadius(4)

                        BarMark(
                            x: .value("Месяц", bar.label),
                            y: .value("Расходы", bar.expense),
                            width: .ratio(0.35)
                        )
                        .foregroundStyle(AppTheme.expenseRed)
                        .position(by: .value("Тип", "Расходы"))
                        .cornerRadius(4)
                    }
                }
                .chartXAxis {
                    AxisMarks { value in
                        AxisValueLabel {
                            if let label = value.as(String.self) {
                                Text(label)
                                    .font(.caption2)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                        AxisGridLine(stroke: StrokeStyle(dash: [4, 4]))
                            .foregroundStyle(Color.gray.opacity(0.15))
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
                            .foregroundStyle(Color.gray.opacity(0.15))
                    }
                }
                .frame(height: 200)

                // Legend
                HStack(spacing: 20) {
                    legendDot(color: AppTheme.incomeGreen, label: "Доходы")
                    legendDot(color: AppTheme.expenseRed,  label: "Расходы")
                    Spacer()
                }
            }
        }
        .skrygaCard()
        .padding(.horizontal, 20)
    }

    private func legendDot(color: Color, label: String) -> some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label).font(.caption).foregroundStyle(AppTheme.textSecondary)
        }
    }

    // MARK: - Forecasts

    private var forecastSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Прогнозы")

            VStack(spacing: 10) {
                forecastCard(
                    title: "Прогноз расходов",
                    subtitle: "следующий месяц",
                    value: last3MonthsExpAvg,
                    icon: "arrow.up.circle.fill",
                    color: AppTheme.expenseRed
                )
                forecastCard(
                    title: "Прогноз дохода",
                    subtitle: "следующий месяц",
                    value: last3MonthsIncAvg,
                    icon: "arrow.down.circle.fill",
                    color: AppTheme.incomeGreen
                )
                forecastCard(
                    title: "До конца месяца",
                    subtitle: "расчётные расходы",
                    value: estimatedRemainingThisMonth,
                    icon: "calendar.badge.clock",
                    color: AppTheme.primaryBlue
                )
            }
        }
        .skrygaCard()
        .padding(.horizontal, 20)
    }

    private func forecastCard(title: String, subtitle: String, value: Double, icon: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
                .frame(width: 40, height: 40)
                .background(color.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.textPrimary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
            Text(AppTheme.formatCurrency(value))
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(color)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Top Categories (horizontal bars)

    private var topCategoriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Топ категории")

            if topCategories.isEmpty {
                Text("Нет расходов за выбранный период")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 24)
            } else {
                VStack(spacing: 14) {
                    ForEach(Array(topCategories.enumerated()), id: \.element.name) { idx, cat in
                        topCategoryRow(rank: idx + 1, name: cat.name, icon: cat.icon, amount: cat.amount, pct: cat.percentage)
                    }
                }
            }
        }
        .skrygaCard()
        .padding(.horizontal, 20)
    }

    private func topCategoryRow(rank: Int, name: String, icon: String, amount: Double, pct: Double) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Text("\(rank)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(AppTheme.textSecondary)
                    .frame(width: 16)
                CategoryIcon(systemName: icon, color: AppTheme.expenseRed, size: 30)
                Text(name)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textPrimary)
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text(AppTheme.formatCurrency(amount))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(AppTheme.textPrimary)
                    Text(String(format: "%.1f%%", pct))
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            // Horizontal progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(AppTheme.expenseRed.opacity(0.12))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .fill(AppTheme.expenseRed)
                        .frame(width: geo.size.width * (pct / 100), height: 6)
                }
            }
            .frame(height: 6)
            .padding(.leading, 26 + 30 + 10) // rank + icon + spacing
        }
    }
}

#Preview {
    AnalyticsView()
        .modelContainer(for: [Transaction.self], inMemory: true)
}
