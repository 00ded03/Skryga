// TransactionsView.swift
// Skryga — Full transactions list with search, filtering, and swipe-to-delete

import SwiftUI
import SwiftData

// MARK: - Filter enum

enum TransactionFilter: String, CaseIterable {
    case all       = "Все"
    case income    = "Доходы"
    case expense   = "Расходы"
    case family    = "Семейные"
    case personal  = "Личные"
}

// MARK: - TransactionsView

struct TransactionsView: View {

    // MARK: - Data

    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Transaction.date, order: .reverse) private var allTransactions: [Transaction]

    // MARK: - Navigation / sheet presentation

    @Environment(\.dismiss) private var dismiss
    @State private var showAddTransaction = false
    @State private var editingTransaction: Transaction? = nil

    // MARK: - Filter state

    @State private var searchText    = ""
    @State private var filter        = TransactionFilter.all
    @State private var selectedMonth = Calendar.current.component(.month, from: Date())
    @State private var selectedYear  = Calendar.current.component(.year,  from: Date())

    // MARK: - Delete confirmation

    @State private var transactionToDelete: Transaction? = nil
    @State private var showDeleteConfirm = false

    // MARK: - Derived

    private var filtered: [Transaction] {
        let cal = Calendar.current
        return allTransactions.filter { txn in
            // Month/year filter
            let m = cal.component(.month, from: txn.date)
            let y = cal.component(.year,  from: txn.date)
            guard m == selectedMonth, y == selectedYear else { return false }

            // Type filter
            switch filter {
            case .income:   guard txn.type == "income"           else { return false }
            case .expense:  guard txn.type == "expense"          else { return false }
            case .family:   guard txn.isFamily                   else { return false }
            case .personal: guard !txn.isFamily                  else { return false }
            case .all:      break
            }

            // Search
            if !searchText.isEmpty {
                let q = searchText.lowercased()
                let inTitle    = txn.title.lowercased().contains(q)
                let inMerchant = (txn.merchantName ?? "").lowercased().contains(q)
                let inNotes    = (txn.notes ?? "").lowercased().contains(q)
                let inCategory = (CategoryData.category(forKey: txn.categoryKey)?.name ?? "").lowercased().contains(q)
                guard inTitle || inMerchant || inNotes || inCategory else { return false }
            }
            return true
        }
    }

    /// Grouped by display date label, preserving reverse-chronological order.
    private var grouped: [(label: String, transactions: [Transaction])] {
        let dict = Dictionary(grouping: filtered) { txn -> String in
            AppTheme.Formatters.relativeDate(txn.date)
        }
        // Sort groups: today first, yesterday second, then by date descending
        let sorted = dict.sorted { a, b in
            let dateA = a.value.first!.date
            let dateB = b.value.first!.date
            return dateA > dateB
        }
        return sorted.map { ($0.key, $0.value.sorted { $0.date > $1.date }) }
    }

    private var periodTotal: Double {
        filtered.reduce(0) { sum, txn in
            sum + (txn.type == "income" ? txn.amount : -txn.amount)
        }
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                // Filter picker
                filterPicker
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                // Month navigator
                MonthNavigator(selectedMonth: $selectedMonth, selectedYear: $selectedYear)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)

                Divider()

                // Transaction list
                if filtered.isEmpty {
                    emptyState
                } else {
                    transactionList
                }

                // Period total bar
                periodTotalBar
            }
            .background(AppTheme.backgroundLight.ignoresSafeArea())
            .navigationTitle("Транзакции")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showAddTransaction = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.primaryBlue)
                    }
                }
            }
        }
        .sheet(isPresented: $showAddTransaction) {
            AddTransactionView()
        }
        .sheet(item: $editingTransaction) { txn in
            AddTransactionView(editingTransaction: txn)
        }
        .confirmationDialog(
            "Удалить транзакцию?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Удалить", role: .destructive) {
                if let txn = transactionToDelete {
                    withAnimation { modelContext.delete(txn) }
                }
            }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("Это действие нельзя отменить.")
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(AppTheme.textSecondary)
            TextField("Поиск транзакций...", text: $searchText)
                .font(.subheadline)
            if !searchText.isEmpty {
                Button { searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .padding(10)
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 1)
    }

    // MARK: - Filter Picker

    private var filterPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(TransactionFilter.allCases, id: \.self) { f in
                    ChipView(
                        title: f.rawValue,
                        isSelected: filter == f,
                        color: AppTheme.primaryBlue
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) { filter = f }
                    }
                }
            }
        }
    }

    // MARK: - Transaction List

    private var transactionList: some View {
        List {
            ForEach(grouped, id: \.label) { section in
                Section(header:
                    Text(section.label)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(AppTheme.textSecondary)
                        .textCase(nil)
                ) {
                    ForEach(section.transactions) { txn in
                        transactionRow(txn)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                            .listRowBackground(AppTheme.cardBackground)
                            .listRowSeparator(.hidden)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    transactionToDelete = txn
                                    showDeleteConfirm = true
                                } label: {
                                    Label("Удалить", systemImage: "trash")
                                }

                                Button {
                                    editingTransaction = txn
                                } label: {
                                    Label("Изменить", systemImage: "pencil")
                                }
                                .tint(AppTheme.primaryBlue)
                            }
                    }
                }
            }
        }
        .listStyle(.plain)
        .background(AppTheme.backgroundLight)
        .scrollContentBackground(.hidden)
    }

    private func transactionRow(_ txn: Transaction) -> some View {
        let isIncome = txn.type == "income"
        let cat      = CategoryData.category(forKey: txn.categoryKey)
        let icon     = cat?.iconName ?? (isIncome ? "arrow.down.circle" : "creditcard")
        let color    = isIncome ? AppTheme.incomeGreen : AppTheme.expenseRed
        let subName  = CategoryData.subcategoryName(
            categoryKey: txn.categoryKey,
            subcategoryKey: txn.subcategoryKey
        )
        let timeStr: String = {
            let fmt = DateFormatter()
            fmt.dateFormat = "HH:mm"
            return fmt.string(from: txn.date)
        }()

        return HStack(spacing: 12) {
            // Category icon
            CategoryIcon(systemName: icon, color: color, size: 40)

            // Title + subcategory
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) {
                    Text(txn.title.isEmpty ? (cat?.name ?? "Операция") : txn.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(AppTheme.textPrimary)
                        .lineLimit(1)
                    if txn.isFromScreenshot {
                        Image(systemName: "camera.fill")
                            .font(.caption2)
                            .foregroundStyle(AppTheme.primaryBlue.opacity(0.7))
                    }
                }
                HStack(spacing: 6) {
                    if let sub = subName {
                        Text(sub)
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    if txn.isFamily, let member = txn.memberName, !member.isEmpty {
                        MemberBadge(
                            initial: String(member.prefix(1)),
                            color: AppTheme.primaryBlue,
                            size: 16
                        )
                    }
                }
            }

            Spacer()

            // Amount + time
            VStack(alignment: .trailing, spacing: 3) {
                AmountText(
                    amount: txn.amount,
                    isIncome: isIncome,
                    font: .subheadline,
                    showSign: true
                )
                Text(timeStr)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding(.vertical, 6)
        .contentShape(Rectangle())
        .onTapGesture { editingTransaction = txn }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        Spacer()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .overlay(
                EmptyStateView(
                    systemName: searchText.isEmpty ? "list.bullet.rectangle" : "magnifyingglass",
                    title: searchText.isEmpty ? "Нет транзакций" : "Ничего не найдено",
                    message: searchText.isEmpty
                        ? "В этом месяце ещё нет записей.\nДобавьте первую транзакцию."
                        : "Попробуйте изменить запрос или фильтры.",
                    actionTitle: searchText.isEmpty ? "Добавить" : nil,
                    action: searchText.isEmpty ? { showAddTransaction = true } : nil
                )
            )
    }

    // MARK: - Period Total Bar

    private var periodTotalBar: some View {
        let isPositive = periodTotal >= 0
        return HStack {
            Text("Итого за период:")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            Text((isPositive ? "+" : "−") + AppTheme.formatCurrency(abs(periodTotal)))
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(isPositive ? AppTheme.incomeGreen : AppTheme.expenseRed)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.white.shadow(.drop(color: .black.opacity(0.06), radius: 8, y: -2)))
    }
}

#Preview {
    TransactionsView()
        .modelContainer(for: [Transaction.self], inMemory: true)
}
