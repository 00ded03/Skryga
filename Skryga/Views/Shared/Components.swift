// Components.swift
// Skryga — Reusable UI components

import SwiftUI
import Charts

// MARK: - SkrygaCard ViewModifier

struct SkrygaCardModifier: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(AppTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: .black.opacity(0.07), radius: 8, x: 0, y: 2)
    }
}

extension View {
    func skrygaCard(padding: CGFloat = 16) -> some View {
        modifier(SkrygaCardModifier(padding: padding))
    }
}

// MARK: - AmountText

struct AmountText: View {
    let amount: Double
    let isIncome: Bool
    var font: Font = .body
    var showSign: Bool = false

    var body: some View {
        Text((showSign ? (isIncome ? "+" : "−") : "") + AppTheme.formatCurrency(abs(amount)))
            .font(font)
            .fontWeight(.semibold)
            .foregroundStyle(isIncome ? AppTheme.incomeGreen : AppTheme.expenseRed)
    }
}

// MARK: - CategoryIcon

struct CategoryIcon: View {
    let systemName: String
    let color: Color
    var size: CGFloat = 36

    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.15))
                .frame(width: size, height: size)
            Image(systemName: systemName)
                .font(.system(size: size * 0.45, weight: .medium))
                .foregroundStyle(color)
        }
    }
}

// MARK: - MemberBadge

struct MemberBadge: View {
    let initial: String
    let color: Color
    var size: CGFloat = 20

    var body: some View {
        ZStack {
            Circle()
                .fill(color)
                .frame(width: size, height: size)
            Text(initial)
                .font(.system(size: size * 0.5, weight: .bold))
                .foregroundStyle(.white)
        }
    }
}

// MARK: - SectionHeader

struct SectionHeader: View {
    let title: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        HStack {
            Text(title)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(AppTheme.textPrimary)
            Spacer()
            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.primaryBlue)
                }
            }
        }
    }
}

// MARK: - EmptyStateView

struct EmptyStateView: View {
    let systemName: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: systemName)
                .font(.system(size: 56))
                .foregroundStyle(AppTheme.primaryBlue.opacity(0.4))
            Text(title)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(AppTheme.textPrimary)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(AppTheme.primaryBlue)
                        .clipShape(Capsule())
                }
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
    }
}

// MARK: - LoadingView

struct LoadingView: View {
    var message: String = "Загрузка..."

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
                .scaleEffect(1.3)
                .tint(AppTheme.primaryBlue)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - StatCard

struct StatCard: View {
    let title: String
    let value: String
    var subtitle: String? = nil
    var trend: Double? = nil      // positive = up, negative = down
    var accentColor: Color = AppTheme.primaryBlue

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
                .lineLimit(1)
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(AppTheme.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if let trend {
                HStack(spacing: 3) {
                    Image(systemName: trend >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.caption2)
                        .foregroundStyle(trend >= 0 ? AppTheme.incomeGreen : AppTheme.expenseRed)
                    Text(String(format: "%.1f%%", abs(trend)))
                        .font(.caption2)
                        .foregroundStyle(trend >= 0 ? AppTheme.incomeGreen : AppTheme.expenseRed)
                }
            } else if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                    .lineLimit(1)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(accentColor.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(accentColor.opacity(0.18), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

// MARK: - ProgressRing

struct ProgressRing: View {
    let progress: Double          // 0.0 … 1.0
    let color: Color
    var lineWidth: CGFloat = 8
    var size: CGFloat = 60
    var showLabel: Bool = true

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.15), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(progress, 1))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.6), value: progress)
            if showLabel {
                Text("\(Int(min(progress, 1) * 100))%")
                    .font(.system(size: size * 0.22, weight: .bold))
                    .foregroundStyle(color)
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - MonthNavigator

struct MonthNavigator: View {
    @Binding var selectedMonth: Int   // 1–12
    @Binding var selectedYear: Int

    private static let monthNames = [
        "Январь", "Февраль", "Март", "Апрель",
        "Май", "Июнь", "Июль", "Август",
        "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ]

    private var label: String {
        "\(Self.monthNames[selectedMonth - 1]) \(selectedYear)"
    }

    var body: some View {
        HStack(spacing: 16) {
            Button {
                stepMonth(by: -1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.primaryBlue)
                    .frame(width: 32, height: 32)
                    .background(AppTheme.primaryBlue.opacity(0.1))
                    .clipShape(Circle())
            }
            Text(label)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(AppTheme.textPrimary)
                .frame(minWidth: 160)
                .multilineTextAlignment(.center)
            Button {
                stepMonth(by: 1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AppTheme.primaryBlue)
                    .frame(width: 32, height: 32)
                    .background(AppTheme.primaryBlue.opacity(0.1))
                    .clipShape(Circle())
            }
        }
    }

    private func stepMonth(by delta: Int) {
        var m = selectedMonth + delta
        var y = selectedYear
        if m < 1 { m = 12; y -= 1 }
        if m > 12 { m = 1; y += 1 }
        selectedMonth = m
        selectedYear = y
    }
}
