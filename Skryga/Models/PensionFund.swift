// PensionFund.swift
// Skryga — SwiftData model for pension funds and long-term savings vehicles

import Foundation
import SwiftData

// MARK: - Fund Type

enum FundType: String, Codable, CaseIterable {
    /// Israeli pension fund (קרן פנסיה).
    case pension           = "pension"
    /// Keren Hishtalmut — Israeli continuing education / executive savings fund (קרן השתלמות).
    case kerenHishtalmut   = "keren_hishtalmut"
    /// General investment / brokerage account.
    case investment        = "investment"

    var localizedName: String {
        switch self {
        case .pension:         return "Пенсионный фонд"
        case .kerenHishtalmut: return "Керен Хиштальмут"
        case .investment:      return "Инвестиции"
        }
    }

    var icon: String {
        switch self {
        case .pension:         return "person.fill.checkmark"
        case .kerenHishtalmut: return "graduationcap.fill"
        case .investment:      return "chart.line.uptrend.xyaxis"
        }
    }
}

// MARK: - Pension Fund Model

@Model
final class PensionFund {

    // MARK: Stored Properties

    var id: UUID
    /// Human-readable fund name, e.g. "Пенсионный фонд Migdal".
    var name: String

    // NOTE: `fundType` is stored as a raw String so that:
    //  • SwiftData can persist it without a custom transformer.
    //  • View code can read/write it as a plain string ("pension" / "keren_hishtalmut" / "investment").
    var fundType: String

    /// Current account balance in ILS.
    var currentBalance: Double
    /// Employee monthly contribution in ILS.
    var monthlyContribution: Double
    /// Employer monthly contribution in ILS.
    var employerContribution: Double
    /// Date when the balance was last manually updated.
    var lastUpdated: Date
    /// Family member who owns this fund ("husband" / "wife").
    var memberName: String

    // MARK: Initializer

    init(
        id: UUID = UUID(),
        name: String,
        fundType: String,
        currentBalance: Double = 0,
        monthlyContribution: Double = 0,
        employerContribution: Double = 0,
        lastUpdated: Date = Date(),
        memberName: String
    ) {
        self.id = id
        self.name = name
        self.fundType = fundType
        self.currentBalance = currentBalance
        self.monthlyContribution = monthlyContribution
        self.employerContribution = employerContribution
        self.lastUpdated = lastUpdated
        self.memberName = memberName
    }

    // MARK: Computed Properties

    /// Typed enum accessor — converts the raw string back to `FundType`.
    var fundTypeEnum: FundType {
        FundType(rawValue: fundType) ?? .pension
    }

    /// Total annual contributions (employee + employer) × 12 months.
    var yearlyTotal: Double {
        (monthlyContribution + employerContribution) * 12
    }

    /// Naïve projected balance after `years` years, using simple linear growth
    /// (no compound interest — a conservative floor estimate).
    ///
    /// - Parameter years: Number of years to project forward.
    /// - Returns: Estimated balance in ILS.
    func projectedBalance(years: Int) -> Double {
        guard years > 0 else { return currentBalance }
        return currentBalance + yearlyTotal * Double(years)
    }

    /// Combined monthly contribution (employee + employer).
    var totalMonthlyContribution: Double {
        monthlyContribution + employerContribution
    }

    /// Formatted last-updated string.
    var lastUpdatedFormatted: String {
        AppTheme.Formatters.dateMedium.string(from: lastUpdated)
    }
}
