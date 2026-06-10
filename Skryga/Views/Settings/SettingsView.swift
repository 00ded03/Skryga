// SettingsView.swift
// Skryga — App settings, profile, notifications, budgets, data management

import SwiftUI
import SwiftData

// MARK: - SettingsView

struct SettingsView: View {

    // MARK: - Data

    @Environment(\.modelContext) private var modelContext
    @Query private var familyMembers: [FamilyMember]
    @Query private var budgets: [Budget]

    // MARK: - State

    @State private var husbandName: String  = "Муж"
    @State private var wifeName: String     = "Жена"
    @State private var husbandEmoji: String = "👨"
    @State private var wifeEmoji: String    = "👩"

    // Notifications
    @State private var notifyBudgetLimit:  Bool = true
    @State private var notifyWeeklySummary: Bool = true
    @State private var notifyMonthlyReport: Bool = false

    // Sheets
    @State private var showAddBudget       = false
    @State private var showImportCSV       = false
    @State private var showImportDiscount  = false
    @State private var showExportCSV       = false
    @State private var showClearDataAlert  = false
    @State private var showEditProfile     = false

    // iCloud sync
    @State private var iCloudEnabled: Bool = true

    // MARK: - Body

    var body: some View {
        NavigationStack {
            List {
                profileSection
                notificationsSection
                budgetSection
                importSection
                dataSection
                aboutSection
            }
            .listStyle(.insetGrouped)
            .background(AppTheme.backgroundLight.ignoresSafeArea())
            .scrollContentBackground(.hidden)
            .navigationTitle("Настройки")
            .navigationBarTitleDisplayMode(.large)
            .onAppear { loadProfileFromModel() }
        }
        .sheet(isPresented: $showEditProfile) {
            editProfileSheet
        }
        .sheet(isPresented: $showAddBudget) {
            AddBudgetSheet()
        }
        .alert("Очистить все данные?", isPresented: $showClearDataAlert) {
            Button("Удалить всё", role: .destructive) { clearAllData() }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("Все транзакции, цели и фонды будут удалены. Это действие нельзя отменить.")
        }
    }

    // MARK: - Profile Section

    private var profileSection: some View {
        Section {
            HStack(spacing: 16) {
                // Avatars
                HStack(spacing: -10) {
                    avatarBubble(emoji: husbandEmoji, color: AppTheme.primaryBlue)
                    avatarBubble(emoji: wifeEmoji, color: Color(hex: "#7B5CF0"))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("\(husbandName) и \(wifeName)")
                        .font(.headline)
                        .foregroundStyle(AppTheme.textPrimary)
                    Text("Семейный аккаунт")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                Spacer()
                Button("Изменить") {
                    showEditProfile = true
                }
                .font(.subheadline)
                .foregroundStyle(AppTheme.primaryBlue)
            }
            .padding(.vertical, 6)
        } header: {
            Text("Профиль семьи")
        }
    }

    // MARK: - Notifications Section

    private var notificationsSection: some View {
        Section {
            Toggle("Предупреждения о лимите", isOn: $notifyBudgetLimit)
                .tint(AppTheme.primaryBlue)
                .font(.subheadline)

            Toggle("Еженедельный отчёт", isOn: $notifyWeeklySummary)
                .tint(AppTheme.primaryBlue)
                .font(.subheadline)

            Toggle("Ежемесячный отчёт", isOn: $notifyMonthlyReport)
                .tint(AppTheme.primaryBlue)
                .font(.subheadline)
        } header: {
            Text("Уведомления")
        }
    }

    // MARK: - Budget Section

    private var budgetSection: some View {
        Section {
            ForEach(budgets) { budget in
                HStack {
                    let catName = CategoryData.category(forKey: budget.categoryKey)?.name ?? budget.categoryKey
                    let catIcon = CategoryData.category(forKey: budget.categoryKey)?.iconName ?? "tag"
                    CategoryIcon(systemName: catIcon, color: AppTheme.primaryBlue, size: 30)
                    Text(catName)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textPrimary)
                    Spacer()
                    Text(AppTheme.formatCurrency(budget.monthlyLimit))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(AppTheme.primaryBlue)
                }
            }
            .onDelete { offsets in
                for idx in offsets { modelContext.delete(budgets[idx]) }
                try? modelContext.save()
            }

            Button {
                showAddBudget = true
            } label: {
                Label("Добавить лимит", systemImage: "plus.circle.fill")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.primaryBlue)
            }
        } header: {
            Text("Бюджет по категориям")
        }
    }

    // MARK: - Import Section

    private var importSection: some View {
        Section {
            Button {
                showImportDiscount = true
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "building.2.fill")
                        .foregroundStyle(AppTheme.primaryBlue)
                        .frame(width: 24)
                    Text("Импортировать выписку Discount Bank")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .buttonStyle(.plain)

            Button {
                showImportCSV = true
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "doc.text.fill")
                        .foregroundStyle(AppTheme.primaryBlue)
                        .frame(width: 24)
                    Text("Импортировать выписку (CSV)")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .buttonStyle(.plain)
        } header: {
            Text("Импорт данных")
        } footer: {
            Text("Поддерживаются CSV-файлы из банков Израиля.")
                .font(.caption)
        }
    }

    // MARK: - Data Section

    private var dataSection: some View {
        Section {
            Toggle(isOn: $iCloudEnabled) {
                HStack(spacing: 12) {
                    Image(systemName: "icloud.fill")
                        .foregroundStyle(.blue)
                        .frame(width: 24)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("iCloud синхронизация")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textPrimary)
                        Text(iCloudEnabled ? "Включена" : "Отключена")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .tint(AppTheme.primaryBlue)

            Button {
                showExportCSV = true
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "square.and.arrow.up.fill")
                        .foregroundStyle(AppTheme.primaryBlue)
                        .frame(width: 24)
                    Text("Экспортировать данные (CSV)")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .buttonStyle(.plain)

            Button {
                showClearDataAlert = true
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "trash.fill")
                        .foregroundStyle(AppTheme.errorRed)
                        .frame(width: 24)
                    Text("Очистить все данные")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.errorRed)
                }
            }
            .buttonStyle(.plain)
        } header: {
            Text("Данные и синхронизация")
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        Section {
            InfoRow(label: "Версия", value: appVersion)
            InfoRow(label: "Сборка",  value: buildNumber)

            Link(destination: URL(string: "mailto:pro100iy@gmail.com?subject=Skryga%20Feedback")!) {
                HStack(spacing: 12) {
                    Image(systemName: "envelope.fill")
                        .foregroundStyle(AppTheme.primaryBlue)
                        .frame(width: 24)
                    Text("Написать нам")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.primaryBlue)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }

            Link(destination: URL(string: "https://apps.apple.com/app/skryga")!) {
                HStack(spacing: 12) {
                    Image(systemName: "star.fill")
                        .foregroundStyle(.yellow)
                        .frame(width: 24)
                    Text("Оценить приложение")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.primaryBlue)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        } header: {
            Text("О приложении")
        }
    }

    // MARK: - Edit Profile Sheet

    private var editProfileSheet: some View {
        NavigationStack {
            Form {
                Section("Муж") {
                    HStack(spacing: 12) {
                        Text("Эмодзи:")
                            .foregroundStyle(AppTheme.textSecondary)
                        TextField("👨", text: $husbandEmoji)
                            .frame(width: 40)
                        Divider()
                        TextField("Имя мужа", text: $husbandName)
                    }
                }
                Section("Жена") {
                    HStack(spacing: 12) {
                        Text("Эмодзи:")
                            .foregroundStyle(AppTheme.textSecondary)
                        TextField("👩", text: $wifeEmoji)
                            .frame(width: 40)
                        Divider()
                        TextField("Имя жены", text: $wifeName)
                    }
                }
            }
            .navigationTitle("Редактировать профиль")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { showEditProfile = false }
                        .foregroundStyle(AppTheme.primaryBlue)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        saveProfile()
                        showEditProfile = false
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(AppTheme.primaryBlue)
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Helpers

    private func loadProfileFromModel() {
        if let h = familyMembers.first(where: { $0.role == "husband" }) {
            husbandName  = h.name
            husbandEmoji = h.emoji
        }
        if let w = familyMembers.first(where: { $0.role == "wife" }) {
            wifeName  = w.name
            wifeEmoji = w.emoji
        }
    }

    private func saveProfile() {
        if let h = familyMembers.first(where: { $0.role == "husband" }) {
            h.name  = husbandName
            h.emoji = husbandEmoji
        }
        if let w = familyMembers.first(where: { $0.role == "wife" }) {
            w.name  = wifeName
            w.emoji = wifeEmoji
        }
        try? modelContext.save()
    }

    private func clearAllData() {
        do {
            try modelContext.delete(model: Transaction.self)
            try modelContext.delete(model: SavingsGoal.self)
            try modelContext.delete(model: PensionFund.self)
            try modelContext.delete(model: Budget.self)
            try modelContext.save()
        } catch {
            print("Error clearing data: \(error)")
        }
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }
    private var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }

    private func avatarBubble(emoji: String, color: Color) -> some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.15))
                .frame(width: 44, height: 44)
                .overlay(Circle().stroke(color.opacity(0.3), lineWidth: 2))
            Text(emoji)
                .font(.title2)
        }
    }
}

// MARK: - AddBudgetSheet

struct AddBudgetSheet: View {

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss)      private var dismiss

    @State private var selectedCategoryKey = ""
    @State private var monthlyLimit: String = ""

    private var categories: [AppCategory] {
        CategoryData.categories(forType: "expense")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Категория") {
                    Picker("Категория", selection: $selectedCategoryKey) {
                        Text("Выберите...").tag("")
                        ForEach(categories) { cat in
                            Label(cat.name, systemImage: cat.iconName).tag(cat.key)
                        }
                    }
                }
                Section("Месячный лимит") {
                    HStack {
                        Text("₪")
                            .foregroundStyle(AppTheme.primaryBlue)
                        TextField("0.00", text: $monthlyLimit)
                            .keyboardType(.decimalPad)
                    }
                }
                Section("Оповещать при достижении") {
                    Text("80% от лимита")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .navigationTitle("Новый лимит")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                        .foregroundStyle(AppTheme.primaryBlue)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Добавить") { save() }
                        .fontWeight(.semibold)
                        .foregroundStyle(AppTheme.primaryBlue)
                        .disabled(selectedCategoryKey.isEmpty || monthlyLimit.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func save() {
        guard let limit = Double(monthlyLimit), limit > 0, !selectedCategoryKey.isEmpty else { return }
        let now = Date()
        let cal = Calendar.current
        let budget = Budget(
            categoryKey:  selectedCategoryKey,
            monthlyLimit: limit,
            month:        cal.component(.month, from: now),
            year:         cal.component(.year,  from: now),
            alertAt:      0.8
        )
        modelContext.insert(budget)
        try? modelContext.save()
        dismiss()
    }
}

#Preview {
    SettingsView()
        .modelContainer(for: [FamilyMember.self, Budget.self], inMemory: true)
}
