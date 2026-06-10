// Budget.swift
// Skryga — SwiftData model for monthly category spending limits

import Foundation
import SwiftData

// MARK: - Budget Model

@Model
final class Budget {

    // MARK: Stored Properties

    var id: UUID
    /// Category key mapping into `CategoryData.category(forKey:)`.
    var categoryKey: String
    /// Maximum allowed spending in ILS for this category/month.
    var monthlyLimit: Double
    /// Calendar month: 1 (January) … 12 (December).
    var month: Int
    /// Calendar year, e.g. 2025.
    var year: Int
    /// Fraction (0–1) at which a warning alert is triggered, e.g. 0.8 = 80 %.
    var alertAt: Double

    // MARK: Initializer

    init(
        id: UUID = UUID(),
        categoryKey: String,
        monthlyLimit: Double,
        month: Int,
        year: Int,
        alertAt: Double = 0.8
    ) {
        self.id = id
        self.categoryKey = categoryKey
        self.monthlyLimit = monthlyLimit
        self.month = month
        self.year = year
        self.alertAt = alertAt
    }

    // MARK: Computed Properties

    /// `true` when the `spent` amount has exceeded the monthly limit.
    func isOverBudget(spent: Double) -> Bool {
        spent > monthlyLimit
    }

    /// Fraction of the budget consumed: `spent / monthlyLimit`, clamped to 0–1+.
    /// Values above 1.0 indicate an over-budget state.
    func percentageUsed(spent: Double) -> Double {
        guard monthlyLimit > 0 else { return 0 }
        return spent / monthlyLimit
    }

    /// `true` when spending has reached or exceeded the `alertAt` threshold.
    func shouldAlert(spent: Double) -> Bool {
        percentageUsed(spent: spent) >= alertAt
    }

    /// Amount remaining in the budget (may be negative if over budget).
    func remaining(spent: Double) -> Double {
        monthlyLimit - spent
    }

    /// Convenience: a `Date` representing the first day of this budget's month/year.
    var periodStartDate: Date? {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1
        return Calendar.current.date(from: components)
    }
}
