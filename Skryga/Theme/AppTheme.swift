// AppTheme.swift
// Skryga — Complete design system: colors, typography, layout, formatters, modifiers

import SwiftUI

// MARK: - App Theme Namespace

enum AppTheme {

    // MARK: - Colors

    enum Colors {

        // Primary Palette
        static let primaryBlue      = Color(hex: "#2D6CDF")
        static let secondaryPurple  = Color(hex: "#7B5CF0")

        // Backgrounds
        static let backgroundLight  = Color(hex: "#F0F4FF")
        static let cardBackground   = Color.white

        // Semantic
        static let successGreen     = Color(hex: "#34C759")
        static let errorRed         = Color(hex: "#FF3B30")
        static let warningOrange    = Color(hex: "#FF9500")

        // Text
        static let textPrimary      = Color(hex: "#1C1C1E")
        static let textSecondary    = Color(hex: "#8E8E93")

        // Finance
        static let incomeGreen      = Color(hex: "#30D158")
        static let expenseRed       = Color(hex: "#FF453A")

        // Gradients
        static let primaryGradient = LinearGradient(
            colors: [primaryBlue, secondaryPurple],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        static let backgroundGradient = LinearGradient(
            colors: [backgroundLight, .white],
            startPoint: .top,
            endPoint: .bottom
        )

        static let incomeGradient = LinearGradient(
            colors: [Color(hex: "#30D158"), Color(hex: "#25A244")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        static let expenseGradient = LinearGradient(
            colors: [Color(hex: "#FF453A"), Color(hex: "#D70015")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        static let savingsGradient = LinearGradient(
            colors: [Color(hex: "#FF9500"), Color(hex: "#FF6B00")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Currency Helper

    /// Formats a Double as an ILS currency string.
    /// Convenience wrapper used by shared components.
    static func formatCurrency(_ value: Double) -> String {
        Formatters.currency.string(from: NSNumber(value: value)) ?? "₪ \(value)"
    }

    // MARK: - Convenience Color Aliases
    // Flat aliases so call-sites can write `AppTheme.primaryBlue`
    // in addition to the full `AppTheme.Colors.primaryBlue` form.

    static var primaryBlue:     Color { Colors.primaryBlue }
    static var secondaryPurple: Color { Colors.secondaryPurple }
    static var backgroundLight: Color { Colors.backgroundLight }
    static var cardBackground:  Color { Colors.cardBackground }
    static var successGreen:    Color { Colors.successGreen }
    static var errorRed:        Color { Colors.errorRed }
    static var warningOrange:   Color { Colors.warningOrange }
    static var textPrimary:     Color { Colors.textPrimary }
    static var textSecondary:   Color { Colors.textSecondary }
    static var incomeGreen:     Color          { Colors.incomeGreen }
    static var expenseRed:      Color          { Colors.expenseRed }
    static var primaryGradient: LinearGradient { Colors.primaryGradient }

    // MARK: - Typography

    enum Typography {
        static let largeTitle  = Font.system(size: 34, weight: .bold, design: .rounded)
        static let title1      = Font.system(size: 28, weight: .bold, design: .rounded)
        static let title2      = Font.system(size: 22, weight: .semibold, design: .rounded)
        static let title3      = Font.system(size: 20, weight: .semibold, design: .rounded)
        static let headline    = Font.system(size: 17, weight: .semibold, design: .default)
        static let body        = Font.system(size: 17, weight: .regular, design: .default)
        static let callout     = Font.system(size: 16, weight: .regular, design: .default)
        static let subheadline = Font.system(size: 15, weight: .regular, design: .default)
        static let footnote    = Font.system(size: 13, weight: .regular, design: .default)
        static let caption1    = Font.system(size: 12, weight: .regular, design: .default)
        static let caption2    = Font.system(size: 11, weight: .regular, design: .default)

        // Monetary display
        static let amountLarge  = Font.system(size: 36, weight: .bold, design: .rounded)
        static let amountMedium = Font.system(size: 24, weight: .semibold, design: .rounded)
        static let amountSmall  = Font.system(size: 17, weight: .semibold, design: .rounded)
    }

    // MARK: - Layout

    enum Layout {
        static let cornerRadiusSmall:  CGFloat = 8
        static let cornerRadiusMedium: CGFloat = 16
        static let cornerRadiusLarge:  CGFloat = 24

        static let paddingSmall:  CGFloat = 8
        static let paddingMedium: CGFloat = 16
        static let paddingLarge:  CGFloat = 24

        static let cardShadowRadius: CGFloat = 12
        static let cardShadowY:      CGFloat = 4
        static let cardShadowOpacity: CGFloat = 0.08
    }

    // MARK: - Formatters

    enum Formatters {

        // ILS Currency Formatter
        static let currency: NumberFormatter = {
            let f = NumberFormatter()
            f.numberStyle = .currency
            f.currencyCode = "ILS"
            f.currencySymbol = "₪"
            f.minimumFractionDigits = 2
            f.maximumFractionDigits = 2
            f.locale = Locale(identifier: "he_IL")
            return f
        }()

        // ILS Currency — compact, no decimals for round numbers
        static let currencyCompact: NumberFormatter = {
            let f = NumberFormatter()
            f.numberStyle = .currency
            f.currencyCode = "ILS"
            f.currencySymbol = "₪"
            f.minimumFractionDigits = 0
            f.maximumFractionDigits = 0
            f.locale = Locale(identifier: "he_IL")
            return f
        }()

        // Short date: "10 июн"
        static let dateShort: DateFormatter = {
            let f = DateFormatter()
            f.dateFormat = "d MMM"
            f.locale = Locale(identifier: "ru_RU")
            return f
        }()

        // Medium date: "10 июня 2025"
        static let dateMedium: DateFormatter = {
            let f = DateFormatter()
            f.dateStyle = .medium
            f.timeStyle = .none
            f.locale = Locale(identifier: "ru_RU")
            return f
        }()

        // Full date+time: "10 июня 2025, 14:32"
        static let dateFull: DateFormatter = {
            let f = DateFormatter()
            f.dateStyle = .medium
            f.timeStyle = .short
            f.locale = Locale(identifier: "ru_RU")
            return f
        }()

        // Month + year: "Июнь 2025"
        static let monthYear: DateFormatter = {
            let f = DateFormatter()
            f.dateFormat = "LLLL yyyy"
            f.locale = Locale(identifier: "ru_RU")
            return f
        }()

        // Relative: "Сегодня", "Вчера", or date
        static func relativeDate(_ date: Date) -> String {
            let calendar = Calendar.current
            if calendar.isDateInToday(date) { return "Сегодня" }
            if calendar.isDateInYesterday(date) { return "Вчера" }
            return dateMedium.string(from: date)
        }
    }
}

// MARK: - Currency Formatting Helpers

extension Double {
    /// Formats as ILS currency string: "₪ 1,234.50"
    var ilsFormatted: String {
        AppTheme.Formatters.currency.string(from: NSNumber(value: self)) ?? "₪ \(self)"
    }

    /// Compact ILS — no decimals for whole numbers: "₪ 1,234"
    var ilsCompact: String {
        AppTheme.Formatters.currencyCompact.string(from: NSNumber(value: self)) ?? "₪ \(Int(self))"
    }

    /// Signed amount string with + / − prefix: "+₪ 500" / "−₪ 200"
    func ilsSigned(isIncome: Bool) -> String {
        let prefix = isIncome ? "+" : "−"
        let absValue = abs(self)
        let formatted = AppTheme.Formatters.currency.string(from: NSNumber(value: absValue)) ?? "₪ \(absValue)"
        return "\(prefix)\(formatted)"
    }
}

// MARK: - View Modifiers

/// White card with rounded corners and a subtle shadow.
struct CardModifier: ViewModifier {
    var cornerRadius: CGFloat
    var shadowRadius: CGFloat

    func body(content: Content) -> some View {
        content
            .background(AppTheme.Colors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .shadow(
                color: .black.opacity(AppTheme.Layout.cardShadowOpacity),
                radius: shadowRadius,
                x: 0,
                y: AppTheme.Layout.cardShadowY
            )
    }
}

/// Gradient card with primary gradient background.
struct GradientCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(AppTheme.Colors.primaryGradient)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Layout.cornerRadiusLarge, style: .continuous))
            .shadow(
                color: AppTheme.Colors.primaryBlue.opacity(0.35),
                radius: 16,
                x: 0,
                y: 6
            )
    }
}

extension View {
    func cardStyle(
        cornerRadius: CGFloat = AppTheme.Layout.cornerRadiusMedium,
        shadowRadius: CGFloat = AppTheme.Layout.cardShadowRadius
    ) -> some View {
        modifier(CardModifier(cornerRadius: cornerRadius, shadowRadius: shadowRadius))
    }

    func gradientCardStyle() -> some View {
        modifier(GradientCardModifier())
    }
}

// MARK: - Primary Button Style

struct PrimaryButtonStyle: ButtonStyle {
    var isDestructive: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTheme.Typography.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                Group {
                    if isDestructive {
                        LinearGradient(
                            colors: [AppTheme.Colors.errorRed, Color(hex: "#D70015")],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    } else {
                        AppTheme.Colors.primaryGradient
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Layout.cornerRadiusMedium, style: .continuous))
            .shadow(
                color: (isDestructive ? AppTheme.Colors.errorRed : AppTheme.Colors.primaryBlue).opacity(0.35),
                radius: 8,
                x: 0,
                y: 4
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// Outlined secondary button style.
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTheme.Typography.headline)
            .foregroundStyle(AppTheme.Colors.primaryBlue)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: AppTheme.Layout.cornerRadiusMedium, style: .continuous)
                    .stroke(AppTheme.Colors.primaryBlue, lineWidth: 1.5)
                    .background(
                        RoundedRectangle(cornerRadius: AppTheme.Layout.cornerRadiusMedium, style: .continuous)
                            .fill(AppTheme.Colors.primaryBlue.opacity(0.06))
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

// MARK: - AppTheme Convenience Shorthands
// These allow writing `AppTheme.primaryBlue` instead of `AppTheme.Colors.primaryBlue`

extension AppTheme {
    static var primaryBlue:     Color { Colors.primaryBlue }
    static var secondaryPurple: Color { Colors.secondaryPurple }
    static var backgroundLight: Color { Colors.backgroundLight }
    static var cardBackground:  Color { Colors.cardBackground }
    static var textPrimary:     Color { Colors.textPrimary }
    static var textSecondary:   Color { Colors.textSecondary }
    static var incomeGreen:     Color { Colors.incomeGreen }
    static var expenseRed:      Color { Colors.expenseRed }
    static var successGreen:    Color { Colors.successGreen }
    static var errorRed:        Color { Colors.errorRed }
    static var warningOrange:   Color { Colors.warningOrange }
    static var primaryGradient: LinearGradient { Colors.primaryGradient }

    /// Formats a Double as an ILS currency string using the standard formatter.
    static func formatCurrency(_ value: Double) -> String {
        Formatters.currency.string(from: NSNumber(value: value)) ?? "₪\(value)"
    }
}

// MARK: - Color Hex Extension

extension Color {
    /// Initialize a Color from a hex string such as "#2D6CDF" or "2D6CDF".
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)

        let length = hex.count
        let r, g, b, a: Double

        switch length {
        case 6:
            r = Double((rgbValue >> 16) & 0xFF) / 255.0
            g = Double((rgbValue >>  8) & 0xFF) / 255.0
            b = Double( rgbValue        & 0xFF) / 255.0
            a = 1.0
        case 8:
            r = Double((rgbValue >> 24) & 0xFF) / 255.0
            g = Double((rgbValue >> 16) & 0xFF) / 255.0
            b = Double((rgbValue >>  8) & 0xFF) / 255.0
            a = Double( rgbValue        & 0xFF) / 255.0
        default:
            r = 0; g = 0; b = 0; a = 1.0
        }

        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }

    /// Returns the hex string representation ("#RRGGBB").
    var hexString: String {
        let components = UIColor(self).cgColor.components ?? [0, 0, 0, 1]
        let r = Int((components[0] * 255).rounded())
        let g = Int((components[1] * 255).rounded())
        let b = Int((components[2] * 255).rounded())
        return String(format: "#%02X%02X%02X", r, g, b)
    }
}
