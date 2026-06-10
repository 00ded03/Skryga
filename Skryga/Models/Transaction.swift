// Transaction.swift
// Skryga — SwiftData model representing a single income or expense transaction

import Foundation
import SwiftData

// MARK: - Transaction Type

enum TransactionType: String, Codable, CaseIterable {
    case income  = "income"
    case expense = "expense"

    var localizedName: String {
        switch self {
        case .income:  return "Доход"
        case .expense: return "Расход"
        }
    }
}

// MARK: - Transaction Model

@Model
final class Transaction {

    // MARK: Stored Properties

    var id: UUID
    var date: Date
    var amount: Double

    // NOTE: `type` is stored as a raw String so that:
    //  • SwiftData can persist it without a custom transformer.
    //  • View code can compare with string literals (`txn.type == "income"`).
    //  • It can be set from a String directly (`txn.type = "expense"`).
    var type: String

    /// Category key — maps into `CategoryData.category(forKey:)`.
    var categoryKey: String
    /// Optional subcategory key (empty string = no subcategory).
    var subcategoryKey: String
    /// Human-readable title / description.
    var title: String
    /// Optional free-text notes.
    var notes: String?
    /// `true` = family budget pool; `false` = personal.
    var isFamily: Bool
    /// Identifies the family member ("husband" / "wife"), or nil for personal.
    var memberName: String?
    /// Raw PNG/JPEG data of an attached receipt photo.
    var receiptImageData: Data?
    /// `true` when the transaction was extracted from a screenshot via OCR.
    var isFromScreenshot: Bool
    /// Merchant / payee name, populated automatically from receipt scanning.
    var merchantName: String?
    /// Timestamp of record creation (immutable after insert).
    var createdAt: Date

    // MARK: Initializer

    init(
        id: UUID = UUID(),
        date: Date = Date(),
        amount: Double,
        type: String,
        categoryKey: String,
        subcategoryKey: String = "",
        title: String,
        notes: String? = nil,
        isFamily: Bool = true,
        memberName: String? = nil,
        receiptImageData: Data? = nil,
        isFromScreenshot: Bool = false,
        merchantName: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.date = date
        self.amount = amount
        self.type = type
        self.categoryKey = categoryKey
        self.subcategoryKey = subcategoryKey
        self.title = title
        self.notes = notes
        self.isFamily = isFamily
        self.memberName = memberName
        self.receiptImageData = receiptImageData
        self.isFromScreenshot = isFromScreenshot
        self.merchantName = merchantName
        self.createdAt = createdAt
    }

    // MARK: Computed Properties

    /// Typed enum accessor — converts the raw string to `TransactionType`.
    var transactionType: TransactionType {
        get { TransactionType(rawValue: type) ?? .expense }
        set { type = newValue.rawValue }
    }

    /// `true` when this is an income transaction.
    var isIncome: Bool { type == TransactionType.income.rawValue }

    /// Absolute value — always positive.
    var absoluteAmount: Double { abs(amount) }

    /// Signed amount: positive for income, negative for expense.
    var signedAmount: Double { isIncome ? absoluteAmount : -absoluteAmount }

    /// ILS-formatted string, e.g. "₪ 250.00".
    var formattedAmount: String { absoluteAmount.ilsFormatted }

    /// Signed ILS string, e.g. "+₪ 500.00" or "−₪ 200.00".
    var signedFormattedAmount: String { absoluteAmount.ilsSigned(isIncome: isIncome) }
}
