// SavingsView.swift
// Skryga — Savings goals and pension funds screen

import SwiftUI
import SwiftData
import Charts

// MARK: - SavingsView

struct SavingsView: View {

    // MARK: - Data

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \SavingsGoal.createdAt, order: .reverse) private var goals: [SavingsGoal]
    @Query(sort: \PensionFund.lastUpdated, order: .reverse) private var funds: [PensionFund]

    // MARK: - State

    @State private var showAddGoal       = false
    @State private var showAddFund       = false
    @State private var editingGoal: SavingsGoal?   = nil
    @State private var editingFund: PensionFund?   = nil
    @State private var addMoneyGoal: SavingsGoal?  = nil
    @State private var depositAmount               = ""

    // MARK: - Computed

    private var totalSaved: Double {
        goals.filter { !$0.isCompleted }.reduce(0) { $0 + $1.currentAmount }
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    savingsHeaderCard
                    goalsSection
                    pensionSection
                    Spacer(minLength: 80)
                }
                .padding(.bottom, 16)
            }
            .background(AppTheme.backgroundLight.ignoresSafeArea())
            .navigationTitle("Накопления")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            showAddGoal = true
                        } label: {
                            Label("Новая цель", systemImage: "flag.fill")
                        }
                        Button {
                            showAddFund = true
                        } label: {
                            Label("Новый пенсионный фонд", systemImage: "building.columns.fill")
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.primaryBlue)
                    }
                }
            }
        }
        .sheet(isPresented: $showAddGoal) {
            AddSavingsGoalSheet()
        }
        .sheet(isPresented: $showAddFund) {
            AddPensionFundSheet()
        }
        .sheet(item: $editingGoal) { goal in
            AddSavingsGoalSheet(editingGoal: goal)
        }
        .sheet(item: $editingFund) { fund in
            AddPensionFundSheet(editingFund: fund)
        }
        .sheet(item: $addMoneyGoal) { goal in
            addMoneySheet(for: goal)
        }
    }

    // MARK: - Savings Header Card

    private var savingsHeaderCard: some View {
        VStack(spacing: 8) {
            Text("Всего накоплено")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))
            Text(AppTheme.formatCurrency(totalSaved))
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text("\(goals.filter { !$0.isCompleted }.count) активных целей")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.75))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(AppTheme.primaryGradient)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: AppTheme.primaryBlue.opacity(0.35), radius: 14, x: 0, y: 6)
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }

    // MARK: - Goals Section

    private var goalsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionHeader(title: "Накопительные цели")
                Spacer()
                Button {
                    showAddGoal = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(AppTheme.primaryBlue)
                }
            }
            .padding(.horizontal, 20)

            if goals.isEmpty {
                EmptyStateView(
                    systemName: "flag",
                    title: "Нет целей",
                    message: "Добавьте первую накопительную цель.",
                    actionTitle: "Создать цель",
                    action: { showAddGoal = true }
                )
                .padding(.horizontal, 20)
            } else {
                VStack(spacing: 14) {
                    ForEach(goals) { goal in
                        goalCard(goal)
                            .padding(.horizontal, 20)
                    }
                }
            }
        }
    }

    private func goalCard(_ goal: SavingsGoal) -> some View {
        let progress  = goal.targetAmount > 0 ? min(goal.currentAmount / goal.targetAmount, 1.0) : 0
        let color     = Color(hex: goal.colorHex.isEmpty ? "#2D6CDF" : goal.colorHex)
        let remaining = max(goal.targetAmount - goal.currentAmount, 0)

        return VStack(spacing: 14) {
            HStack(spacing: 14) {
                ProgressRing(progress: progress, color: color, lineWidth: 7, size: 64)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: goal.iconName.isEmpty ? "star.fill" : goal.iconName)
                            .font(.subheadline)
                            .foregroundStyle(color)
                        Text(goal.title)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundStyle(AppTheme.textPrimary)
                        Spacer()
                        if goal.isCompleted {
                            Text("Достигнуто")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(AppTheme.incomeGreen)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(AppTheme.incomeGreen.opacity(0.12))
                                .clipShape(Capsule())
                        }
                    }
                    Text("\(AppTheme.formatCurrency(goal.currentAmount)) из \(AppTheme.formatCurrency(goal.targetAmount))")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)

                    if let deadline = goal.deadline {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.caption2)
                                .foregroundStyle(AppTheme.textSecondary)
                            Text("до \(AppTheme.Formatters.dateMedium.string(from: deadline))")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                }
            }

            if remaining > 0 && !goal.isCompleted {
                HStack {
                    Text("Осталось: \(AppTheme.formatCurrency(remaining))")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                    Spacer()
                    Button {
                        addMoneyGoal = goal
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.caption)
                            Text("Пополнить")
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(color)
                        .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(16)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(color.opacity(0.2), lineWidth: 1))
        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
        .onTapGesture { editingGoal = goal }
    }

    // MARK: - Pension Section

    private var pensionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionHeader(title: "Пенсионные фонды")
                Spacer()
                Button {
                    showAddFund = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(AppTheme.primaryBlue)
                }
            }
            .padding(.horizontal, 20)

            if funds.isEmpty {
                EmptyStateView(
                    systemName: "building.columns",
                    title: "Нет фондов",
                    message: "Добавьте пенсионный или сберегательный фонд.",
                    actionTitle: "Добавить фонд",
                    action: { showAddFund = true }
                )
                .padding(.horizontal, 20)
            } else {
                VStack(spacing: 14) {
                    ForEach(funds) { fund in
                        pensionCard(fund)
                            .padding(.horizontal, 20)
                    }
                }
            }
        }
    }

    private func pensionCard(_ fund: PensionFund) -> some View {
        let (icon, label) = fundTypeInfo(fund.fundType.rawValue)

        return VStack(spacing: 14) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(AppTheme.primaryBlue.opacity(0.12))
                        .frame(width: 48, height: 48)
                    Image(systemName: icon)
                        .font(.title3)
                        .foregroundStyle(AppTheme.primaryBlue)
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(fund.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundStyle(AppTheme.textPrimary)
                        Text(label)
                            .font(.caption2)
                            .foregroundStyle(AppTheme.primaryBlue)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(AppTheme.primaryBlue.opacity(0.1))
                            .clipShape(Capsule())
                    }
                    Text("Участник: \(fund.memberName)")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                Spacer()
                Text(AppTheme.formatCurrency(fund.currentBalance))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(AppTheme.textPrimary)
            }

            Divider()

            HStack(spacing: 0) {
                contributionColumn(
                    title: "Мой взнос",
                    value: AppTheme.formatCurrency(fund.monthlyContribution),
                    subtitle: "в месяц"
                )
                Divider().frame(height: 36)
                contributionColumn(
                    title: "Взнос работодателя",
                    value: AppTheme.formatCurrency(fund.employerContribution),
                    subtitle: "в месяц"
                )
                Divider().frame(height: 36)
                contributionColumn(
                    title: "Итого в мес.",
                    value: AppTheme.formatCurrency(fund.monthlyContribution + fund.employerContribution),
                    subtitle: ""
                )
            }

            // Projected growth mini line chart (last 12 months projected)
            projectedGrowthChart(for: fund)

            HStack {
                Text("Обновлено: \(AppTheme.Formatters.dateMedium.string(from: fund.lastUpdated))")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                Spacer()
                Button {
                    editingFund = fund
                } label: {
                    Text("Обновить")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(AppTheme.primaryBlue)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(AppTheme.primaryBlue.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(16)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
    }

    private func contributionColumn(title: String, value: String, subtitle: String) -> some View {
        VStack(spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(AppTheme.textPrimary)
            if !subtitle.isEmpty {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func projectedGrowthChart(for fund: PensionFund) -> some View {
        let monthly = fund.monthlyContribution + fund.employerContribution
        let points: [(month: Int, value: Double)] = (0...11).map { i in
            (i, fund.currentBalance + monthly * Double(i + 1))
        }

        return Chart {
            ForEach(points, id: \.month) { pt in
                LineMark(
                    x: .value("Месяц", pt.month),
                    y: .value("Баланс", pt.value)
                )
                .foregroundStyle(AppTheme.primaryBlue)
                .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                .interpolationMethod(.catmullRom)

                AreaMark(
                    x: .value("Месяц", pt.month),
                    y: .value("Баланс", pt.value)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [AppTheme.primaryBlue.opacity(0.2), .clear],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .interpolationMethod(.catmullRom)
            }
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .frame(height: 50)
    }

    private func fundTypeInfo(_ type: String) -> (icon: String, label: String) {
        switch type {
        case "pension":             return ("person.crop.circle.badge.checkmark", "Пенсия")
        case "keren_hishtalmut":    return ("building.columns.fill",              "Керен Иштальмут")
        case "investment":          return ("chart.line.uptrend.xyaxis",          "Инвестиции")
        default:                    return ("dollarsign.circle.fill",             type)
        }
    }

    // MARK: - Add Money Sheet

    private func addMoneySheet(for goal: SavingsGoal) -> some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Пополнить цель")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.top, 32)

                Text(goal.title)
                    .font(.headline)
                    .foregroundStyle(AppTheme.textSecondary)

                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("₪")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(AppTheme.primaryBlue)
                    TextField("0.00", text: $depositAmount)
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.center)
                }
                .padding(16)
                .background(AppTheme.backgroundLight)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .padding(.horizontal, 32)

                HStack(spacing: 12) {
                    ForEach([100.0, 200.0, 500.0, 1000.0], id: \.self) { amt in
                        Button {
                            depositAmount = String(format: "%.0f", amt)
                        } label: {
                            Text("₪\(Int(amt))")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(AppTheme.primaryBlue)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(AppTheme.primaryBlue.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }
                }

                Button {
                    if let amt = Double(depositAmount), amt > 0 {
                        goal.currentAmount += amt
                        if goal.currentAmount >= goal.targetAmount {
                            goal.isCompleted = true
                        }
                        try? modelContext.save()
                        addMoneyGoal = nil
                        depositAmount = ""
                    }
                } label: {
                    Text("Добавить")
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(depositAmount.isEmpty || Double(depositAmount) == nil)
                .padding(.horizontal, 32)

                Spacer()
            }
            .background(AppTheme.backgroundLight.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        addMoneyGoal = nil
                        depositAmount = ""
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - AddSavingsGoalSheet

struct AddSavingsGoalSheet: View {

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss)      private var dismiss

    var editingGoal: SavingsGoal? = nil

    @State private var title:        String = ""
    @State private var targetAmount: String = ""
    @State private var hasDeadline:  Bool   = false
    @State private var deadline:     Date   = Calendar.current.date(byAdding: .month, value: 6, to: Date()) ?? Date()
    @State private var selectedIcon: String = "star.fill"
    @State private var selectedColor: String = "#2D6CDF"

    private let icons = [
        "house.fill", "car.fill", "airplane", "star.fill", "heart.fill",
        "graduationcap.fill", "briefcase.fill", "gift.fill", "phone.fill",
        "laptopcomputer", "tv.fill", "camera.fill", "bicycle", "leaf.fill"
    ]

    private let colors = [
        "#2D6CDF", "#7B5CF0", "#FF453A", "#FF9500", "#30D158", "#00C7BE"
    ]

    init(editingGoal: SavingsGoal? = nil) {
        self.editingGoal = editingGoal
        if let g = editingGoal {
            _title         = State(initialValue: g.title)
            _targetAmount  = State(initialValue: String(format: "%.2f", g.targetAmount))
            _hasDeadline   = State(initialValue: g.deadline != nil)
            _deadline      = State(initialValue: g.deadline ?? Date())
            _selectedIcon  = State(initialValue: g.iconName.isEmpty  ? "star.fill" : g.iconName)
            _selectedColor = State(initialValue: g.colorHex.isEmpty ? "#2D6CDF"  : g.colorHex)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Название") {
                    TextField("Например, на машину", text: $title)
                }

                Section("Целевая сумма") {
                    HStack {
                        Text("₪")
                            .foregroundStyle(AppTheme.primaryBlue)
                        TextField("0.00", text: $targetAmount)
                            .keyboardType(.decimalPad)
                    }
                }

                Section("Срок") {
                    Toggle("Установить дедлайн", isOn: $hasDeadline)
                        .tint(AppTheme.primaryBlue)
                    if hasDeadline {
                        DatePicker("Дата", selection: $deadline, displayedComponents: .date)
                            .environment(\.locale, Locale(identifier: "ru_RU"))
                            .tint(AppTheme.primaryBlue)
                    }
                }

                Section("Иконка") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 12) {
                        ForEach(icons, id: \.self) { icon in
                            Button {
                                selectedIcon = icon
                            } label: {
                                Image(systemName: icon)
                                    .font(.title3)
                                    .foregroundStyle(selectedIcon == icon ? .white : AppTheme.primaryBlue)
                                    .frame(width: 38, height: 38)
                                    .background(selectedIcon == icon ? AppTheme.primaryBlue : AppTheme.primaryBlue.opacity(0.1))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("Цвет") {
                    HStack(spacing: 14) {
                        ForEach(colors, id: \.self) { hex in
                            Button {
                                selectedColor = hex
                            } label: {
                                Circle()
                                    .fill(Color(hex: hex))
                                    .frame(width: 34, height: 34)
                                    .overlay(
                                        Circle()
                                            .stroke(.white, lineWidth: selectedColor == hex ? 3 : 0)
                                            .padding(2)
                                    )
                                    .shadow(color: Color(hex: hex).opacity(0.4), radius: 4)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle(editingGoal == nil ? "Новая цель" : "Редактировать цель")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                        .foregroundStyle(AppTheme.primaryBlue)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") { save() }
                        .fontWeight(.semibold)
                        .foregroundStyle(AppTheme.primaryBlue)
                        .disabled(title.isEmpty || targetAmount.isEmpty)
                }
            }
        }
    }

    private func save() {
        guard let target = Double(targetAmount), target > 0 else { return }
        if let g = editingGoal {
            g.title        = title
            g.targetAmount = target
            g.deadline     = hasDeadline ? deadline : nil
            g.iconName     = selectedIcon
            g.colorHex     = selectedColor
            if g.currentAmount >= g.targetAmount { g.isCompleted = true }
        } else {
            let goal = SavingsGoal(
                title:         title,
                targetAmount:  target,
                currentAmount: 0,
                deadline:      hasDeadline ? deadline : nil,
                iconName:      selectedIcon,
                colorHex:      selectedColor
            )
            modelContext.insert(goal)
        }
        try? modelContext.save()
        dismiss()
    }
}

// MARK: - AddPensionFundSheet

struct AddPensionFundSheet: View {

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss)      private var dismiss

    var editingFund: PensionFund? = nil

    @State private var fundType:            String = "pension"
    @State private var name:                String = ""
    @State private var currentBalance:      String = ""
    @State private var monthlyContribution: String = ""
    @State private var employerContribution: String = ""
    @State private var memberName:          String = "Муж"

    private let fundTypes = [
        ("pension",          "Пенсия",                 "person.crop.circle.badge.checkmark"),
        ("keren_hishtalmut", "Керен Иштальмут",        "building.columns.fill"),
        ("investment",       "Инвестиционный фонд",    "chart.line.uptrend.xyaxis"),
    ]

    init(editingFund: PensionFund? = nil) {
        self.editingFund = editingFund
        if let f = editingFund {
            _fundType             = State(initialValue: f.fundType.rawValue)
            _name                 = State(initialValue: f.name)
            _currentBalance       = State(initialValue: String(format: "%.2f", f.currentBalance))
            _monthlyContribution  = State(initialValue: String(format: "%.2f", f.monthlyContribution))
            _employerContribution = State(initialValue: String(format: "%.2f", f.employerContribution))
            _memberName           = State(initialValue: f.memberName)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Тип фонда") {
                    ForEach(fundTypes, id: \.0) { type, label, icon in
                        Button {
                            fundType = type
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: icon)
                                    .foregroundStyle(AppTheme.primaryBlue)
                                    .frame(width: 24)
                                Text(label)
                                    .foregroundStyle(AppTheme.textPrimary)
                                Spacer()
                                if fundType == type {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(AppTheme.primaryBlue)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }

                Section("Информация") {
                    TextField("Название фонда", text: $name)

                    HStack {
                        Text("Текущий баланс ₪")
                            .foregroundStyle(AppTheme.textSecondary)
                        Spacer()
                        TextField("0.00", text: $currentBalance)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 120)
                    }

                    HStack {
                        Text("Взнос сотрудника ₪/мес")
                            .foregroundStyle(AppTheme.textSecondary)
                        Spacer()
                        TextField("0.00", text: $monthlyContribution)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 120)
                    }

                    HStack {
                        Text("Взнос работодателя ₪/мес")
                            .foregroundStyle(AppTheme.textSecondary)
                        Spacer()
                        TextField("0.00", text: $employerContribution)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 120)
                    }
                }

                Section("Участник") {
                    Picker("Участник", selection: $memberName) {
                        Text("Муж").tag("Муж")
                        Text("Жена").tag("Жена")
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle(editingFund == nil ? "Новый фонд" : "Редактировать фонд")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                        .foregroundStyle(AppTheme.primaryBlue)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") { save() }
                        .fontWeight(.semibold)
                        .foregroundStyle(AppTheme.primaryBlue)
                        .disabled(name.isEmpty)
                }
            }
        }
    }

    private func save() {
        let balance  = Double(currentBalance) ?? 0
        let monthly  = Double(monthlyContribution) ?? 0
        let employer = Double(employerContribution) ?? 0
        let enumType = FundType(rawValue: fundType) ?? .pension

        if let f = editingFund {
            f.fundTypeRawValue     = fundType
            f.name                 = name
            f.currentBalance       = balance
            f.monthlyContribution  = monthly
            f.employerContribution = employer
            f.memberName           = memberName
            f.lastUpdated          = Date()
        } else {
            let fund = PensionFund(
                name:                 name,
                fundType:             enumType,
                currentBalance:       balance,
                monthlyContribution:  monthly,
                employerContribution: employer,
                memberName:           memberName
            )
            modelContext.insert(fund)
        }
        try? modelContext.save()
        dismiss()
    }
}

#Preview {
    SavingsView()
        .modelContainer(for: [SavingsGoal.self, PensionFund.self], inMemory: true)
}
