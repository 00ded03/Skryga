// SavingsGoal.swift
// Skryga — SwiftData model for a savings / financial goal

import Foundation
import SwiftData

// MARK: - Savings Goal Model

@Model
final class SavingsGoal {

    // MARK: Stored Properties

    var id: UUID
    /// Display name of the goal, e.g. "Отпуск в Европе".
    var title: String
    /// Target amount in ILS to reach.
    var targetAmount: Double
    /// Amount already saved towards this goal.
    var currentAmount: Double
    /// Optional deadline date.
    var deadline: Date?
    /// SF Symbol name used as the goal's icon, e.g. "airplane".
    var iconName: String
    /// Hex color string for the goal's accent color, e.g. "#2D6CDF".
    var colorHex: String
    /// Whether the goal has been fully funded / marked complete.
    var isCompleted: Bool
    /// Timestamp of record creation.
    var createdAt: Date

    // MARK: Initializer

    init(
        id: UUID = UUID(),
        title: String,
        targetAmount: Double,
        currentAmount: Double = 0,
        deadline: Date? = nil,
        iconName: String = "star.fill",
        colorHex: String = "#2D6CDF",
        isCompleted: Bool = false,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.targetAmount = targetAmount
        self.currentAmount = currentAmount
        self.deadline = deadline
        self.iconName = iconName
        self.colorHex = colorHex
        self.isCompleted = isCompleted
        self.createdAt = createdAt
    }

    // MARK: Computed Properties

    /// 0.0 … 1.0, clamped.
    var progressPercentage: Double {
        guard targetAmount > 0 else { return 0 }
        return min(currentAmount / targetAmount, 1.0)
    }

    /// How much is still needed to reach the target (never negative).
    var remainingAmount: Double {
        max(targetAmount - currentAmount, 0)
    }

    /// Approximate number of whole calendar months remaining until the deadline.
    /// Returns `nil` if no deadline is set.
    var monthsToDeadline: Int? {
        guard let deadline else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents([.month], from: Date(), to: deadline)
        let months = components.month ?? 0
        return max(months, 0)
    }

    /// Monthly contribution needed to reach the goal by the deadline.
    /// Returns `nil` when no deadline is set or the goal is already met.
    var requiredMonthlyContribution: Double? {
        guard let months = monthsToDeadline, months > 0, remainingAmount > 0 else { return nil }
        return remainingAmount / Double(months)
    }

    /// `true` when the current amount meets or exceeds the target.
    var isFunded: Bool { currentAmount >= targetAmount }
}
