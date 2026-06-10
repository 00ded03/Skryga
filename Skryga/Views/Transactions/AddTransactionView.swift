// AddTransactionView.swift
// Skryga — Add / Edit transaction sheet

import SwiftUI
import SwiftData

// MARK: - AddTransactionView

struct AddTransactionView: View {

    // MARK: - Environment

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss)      private var dismiss

    // MARK: - Optional edit target

    var editingTransaction: Transaction? = nil

    // MARK: - Form state

    @State private var transactionType: String = "expense"  // "expense" | "income"
    @State private var amountString:    String = ""
    @State private var selectedCategory: String = ""
    @State private var selectedSubcategory: String = ""
    @State private var title: String = ""
    @State private var date: Date = Date()
    @State private var isFamily: Bool = true
    @State private var memberName: String = "Муж"
    @State private var notes: String = ""

    // UI helpers
    @State private var showReceiptScanner = false
    @State private var showDeleteConfirm  = false
    @FocusState private var amountFocused: Bool

    // MARK: - Category data

    private var categories: [AppCategory] {
        CategoryData.categories(forType: transactionType)
    }

    private var subcategories: [AppSubcategory] {
        guard !selectedCategory.isEmpty,
              let cat = CategoryData.category(forKey: selectedCategory)
        else { return [] }
        return cat.subcategories
    }

    // MARK: - Quick amounts

    private let quickAmounts: [Double] = [50, 100, 200, 500]

    // MARK: - Init (populates form when editing)

    init(editingTransaction: Transaction? = nil) {
        self.editingTransaction = editingTransaction
        if let txn = editingTransaction {
            _transactionType    = State(initialValue: txn.type)
            _amountString       = State(initialValue: String(format: "%.2f", txn.amount))
            _selectedCategory   = State(initialValue: txn.categoryKey)
            _selectedSubcategory = State(initialValue: txn.subcategoryKey)
            _title              = State(initialValue: txn.title)
            _date               = State(initialValue: txn.date)
            _isFamily           = State(initialValue: txn.isFamily)
            _memberName         = State(initialValue: txn.memberName ?? "Муж")
            _notes              = State(initialValue: txn.notes ?? "")
        }
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    typePicker
                    amountSection
                    categorySection
                    detailsSection
                    saveButton
                    if editingTransaction != nil {
                        deleteButton
                    }
                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
            .background(AppTheme.backgroundLight.ignoresSafeArea())
            .navigationTitle(editingTransaction == nil ? "Новая транзакция" : "Редактировать")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                        .foregroundStyle(AppTheme.primaryBlue)
                }
                ToolbarItem(placement: .keyboard) {
                    HStack {
                        Spacer()
                        Button("Готово") { amountFocused = false }
                    }
                }
            }
        }
        .sheet(isPresented: $showReceiptScanner) {
            ReceiptScannerView { result in
                applyOCRResult(result)
            }
        }
        .confirmationDialog(
            "Удалить транзакцию?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Удалить", role: .destructive) { deleteAndDismiss() }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("Это действие нельзя отменить.")
        }
    }

    // MARK: - Type Picker

    private var typePicker: some View {
        Picker("Тип", selection: $transactionType) {
            Text("Расход").tag("expense")
            Text("Доход").tag("income")
        }
        .pickerStyle(.segmented)
        .onChange(of: transactionType) { _, _ in
            selectedCategory = ""
            selectedSubcategory = ""
        }
    }

    // MARK: - Amount Section

    private var amountSection: some View {
        VStack(spacing: 12) {
            // Large amount field
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("₪")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(AppTheme.primaryBlue)
                TextField("0.00", text: $amountString)
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(AppTheme.textPrimary)
                    .keyboardType(.decimalPad)
                    .focused($amountFocused)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)

                // Receipt scan button
                Button {
                    showReceiptScanner = true
                } label: {
                    Image(systemName: "camera.fill")
                        .font(.title3)
                        .foregroundStyle(.white)
                        .frame(width: 40, height: 40)
                        .background(AppTheme.primaryBlue)
                        .clipShape(Circle())
                }
            }
            .padding(16)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
            .onTapGesture { amountFocused = true }

            // Quick amount buttons
            HStack(spacing: 10) {
                ForEach(quickAmounts, id: \.self) { val in
                    Button {
                        addQuickAmount(val)
                    } label: {
                        Text("+₪\(Int(val))")
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
        }
    }

    // MARK: - Category Section

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Категория")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(AppTheme.textPrimary)

            // Category grid (4 per row)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
                ForEach(categories) { cat in
                    categoryCell(cat)
                }
            }

            // Subcategory chips
            if !subcategories.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(subcategories) { sub in
                            ChipView(
                                title: sub.name,
                                isSelected: selectedSubcategory == sub.key,
                                color: AppTheme.primaryBlue
                            ) {
                                selectedSubcategory = sub.key
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .skrygaCard()
    }

    private func categoryCell(_ cat: AppCategory) -> some View {
        let isSelected = selectedCategory == cat.key
        return Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                selectedCategory    = cat.key
                selectedSubcategory = ""
            }
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(isSelected ? AppTheme.primaryBlue : AppTheme.primaryBlue.opacity(0.1))
                        .frame(width: 48, height: 48)
                    Image(systemName: cat.iconName)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(isSelected ? .white : AppTheme.primaryBlue)
                }
                Text(cat.name)
                    .font(.caption2)
                    .foregroundStyle(isSelected ? AppTheme.primaryBlue : AppTheme.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .buttonStyle(.plain)
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.2, dampingFraction: 0.7), value: isSelected)
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Title
            VStack(alignment: .leading, spacing: 6) {
                Text("Название")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                TextField("Описание транзакции", text: $title)
                    .font(.subheadline)
                    .padding(10)
                    .background(AppTheme.backgroundLight)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }

            // Date
            VStack(alignment: .leading, spacing: 6) {
                Text("Дата")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                DatePicker("", selection: $date, displayedComponents: [.date, .hourAndMinute])
                    .labelsHidden()
                    .environment(\.locale, Locale(identifier: "ru_RU"))
                    .tint(AppTheme.primaryBlue)
            }

            Divider()

            // Family / Personal toggle + member selector
            VStack(alignment: .leading, spacing: 10) {
                Toggle(isOn: $isFamily) {
                    HStack(spacing: 8) {
                        Image(systemName: "person.2.fill")
                            .foregroundStyle(AppTheme.primaryBlue)
                        Text("Семейная транзакция")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textPrimary)
                    }
                }
                .tint(AppTheme.primaryBlue)

                if isFamily {
                    HStack(spacing: 12) {
                        Text("Участник:")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                        Picker("Участник", selection: $memberName) {
                            Text("Муж").tag("Муж")
                            Text("Жена").tag("Жена")
                        }
                        .pickerStyle(.segmented)
                    }
                }
            }

            Divider()

            // Notes
            VStack(alignment: .leading, spacing: 6) {
                Text("Заметки (необязательно)")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                TextEditor(text: $notes)
                    .font(.subheadline)
                    .frame(minHeight: 60, maxHeight: 120)
                    .padding(8)
                    .background(AppTheme.backgroundLight)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        Group {
                            if notes.isEmpty {
                                Text("Добавьте заметку...")
                                    .font(.subheadline)
                                    .foregroundStyle(AppTheme.textSecondary.opacity(0.6))
                                    .padding(.leading, 12)
                                    .padding(.top, 14)
                                    .allowsHitTesting(false)
                                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                            }
                        }
                    )
            }
        }
        .skrygaCard()
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button(action: saveTransaction) {
            Text(editingTransaction == nil ? "Сохранить" : "Обновить")
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(amountString.isEmpty || selectedCategory.isEmpty)
    }

    // MARK: - Delete Button

    private var deleteButton: some View {
        Button {
            showDeleteConfirm = true
        } label: {
            Text("Удалить транзакцию")
        }
        .buttonStyle(PrimaryButtonStyle(isDestructive: true))
    }

    // MARK: - Actions

    private func addQuickAmount(_ amount: Double) {
        let current = Double(amountString) ?? 0
        amountString = String(format: "%.2f", current + amount)
    }

    private func saveTransaction() {
        guard let amount = Double(amountString), amount > 0 else { return }

        if let txn = editingTransaction {
            // Update existing
            txn.amount        = amount
            txn.type          = transactionType
            txn.categoryKey   = selectedCategory
            txn.subcategoryKey = selectedSubcategory
            txn.title         = title
            txn.date          = date
            txn.isFamily      = isFamily
            txn.memberName    = isFamily ? memberName : nil
            txn.notes         = notes.isEmpty ? nil : notes
        } else {
            // Insert new
            let txn = Transaction(
                date:             date,
                amount:           amount,
                type:             transactionType,
                categoryKey:      selectedCategory,
                subcategoryKey:   selectedSubcategory,
                title:            title,
                notes:            notes.isEmpty ? nil : notes,
                isFamily:         isFamily,
                memberName:       isFamily ? memberName : nil,
                receiptImageData: nil,
                isFromScreenshot: false,
                merchantName:     nil
            )
            modelContext.insert(txn)
        }

        try? modelContext.save()
        dismiss()
    }

    private func deleteAndDismiss() {
        guard let txn = editingTransaction else { return }
        modelContext.delete(txn)
        try? modelContext.save()
        dismiss()
    }

    private func applyOCRResult(_ result: OCRService.ScanResult) {
        if let amount = result.amount {
            amountString = String(format: "%.2f", amount)
        }
        if let merchant = result.merchantName, !merchant.isEmpty {
            title = merchant
        }
        if let catKey = result.suggestedCategoryKey {
            selectedCategory   = catKey
            selectedSubcategory = result.suggestedSubcategoryKey ?? ""
        }
        if let d = result.date {
            date = d
        }
    }
}

#Preview {
    AddTransactionView()
        .modelContainer(for: [Transaction.self], inMemory: true)
}
